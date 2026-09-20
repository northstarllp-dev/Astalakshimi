import { Injectable, Inject, InternalServerErrorException, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { payments, subscriptions, plans, profiles, users, unlockedContacts, chatSessions } from '@astalakshimi/database';
import { eq, and, gt, desc } from 'drizzle-orm';
import Razorpay = require('razorpay');
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private razorpay: Razorpay | null = null;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    private readonly configService: ConfigService,
  ) {
    const keyId = this.configService.get<string>('payments.razorpayKeyId') || '';
    const keySecret = this.configService.get<string>('payments.razorpayKeySecret') || '';
    if (keyId && keySecret) {
      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
    } else {
      this.logger.warn(
        '[PaymentsService] Razorpay keys not set — paid checkout/contact unlock will fail until RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are configured.',
      );
    }
  }

  private requireRazorpay(): Razorpay {
    if (!this.razorpay) {
      throw new BadRequestException(
        'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.',
      );
    }
    return this.razorpay;
  }

  async createOrder(userId: string, planIdentifier: string) {
    // 1. Get profile
    const [profile] = await this.db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    if (!profile) throw new NotFoundException('Profile not found');

    // 2. Load plan by UUID or slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planIdentifier);
    const planCondition = isUuid ? eq(plans.id, planIdentifier) : eq(plans.slug, planIdentifier);
    const [plan] = await this.db.select().from(plans).where(planCondition).limit(1);
    if (!plan) throw new NotFoundException(`Plan '${planIdentifier}' not found`);

    // 3. Backend determines amount strictly from loaded plan record
    const amountPaise = plan.pricePaise;

    // Handle free plan activation
    if (amountPaise === 0) {
      const startsAt = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

      await this.db
        .update(subscriptions)
        .set({ status: 'expired' })
        .where(
          and(
            eq(subscriptions.userId, userId),
            eq(subscriptions.status, 'active')
          )
        );

      await this.db.insert(subscriptions).values({
        userId,
        planId: plan.id,
        startsAt,
        expiresAt,
        status: 'active',
      });

      return {
        freeActivated: true,
        planId: plan.id,
        planSlug: plan.slug,
        planName: plan.name,
        amount: 0,
        currency: 'INR',
      };
    }

    try {
      const razorpay = this.requireRazorpay();
      // 4. Backend creates payment order with Razorpay
      const options = {
        amount: amountPaise,
        currency: 'INR',
        receipt: `rcpt_${profile.id.substring(0, 8)}_${Date.now()}`,
        notes: {
          userId,
          planId: plan.id,
          planSlug: plan.slug,
        },
      };
      
      let order: any;
      try {
        order = await razorpay.orders.create(options);
      } catch (rError) {
        this.logger.error('Razorpay order creation failed:', rError);
        throw new InternalServerErrorException('Failed to create payment order with provider');
      }

      // Create Payment Record
      await this.db.insert(payments).values({
        userId,
        planId: plan.id,
        amountPaise,
        currency: 'INR',
        provider: 'razorpay',
        providerOrderId: order.id,
        status: 'created',
      });

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: this.configService.get<string>('payments.razorpayKeyId'),
        planId: plan.id,
        planSlug: plan.slug,
        planName: plan.name,
      };
    } catch (err) {
      if (err instanceof BadRequestException || err instanceof NotFoundException || err instanceof InternalServerErrorException) {
        throw err;
      }
      this.logger.error('Error creating payment order:', err);
      throw new InternalServerErrorException('Failed to create payment order');
    }
  }

  private async activatePlanForUser(
    userId: string,
    plan: { id: string; durationDays: number; name: string; slug: string },
    paymentId?: string | null,
  ) {
    const startsAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

    await this.db
      .update(subscriptions)
      .set({ status: 'expired' })
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')));

    await this.db.insert(subscriptions).values({
      userId,
      planId: plan.id,
      paymentId: paymentId ?? null,
      startsAt,
      expiresAt,
      status: 'active',
    });
  }

  async verifyPayment(
    userId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ) {
    this.requireRazorpay();
    const secret = this.configService.getOrThrow<string>('payments.razorpayKeySecret');
    if (!secret) {
      throw new BadRequestException('Razorpay is not configured.');
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const isValidSignature = generatedSignature === razorpaySignature;

    if (!isValidSignature) {
      throw new BadRequestException('Invalid payment signature');
    }

    // Get payment record
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.providerOrderId, razorpayOrderId))
      .limit(1);

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    if (payment.status === 'captured') {
      return { success: true, message: 'Payment already processed' };
    }

    // Update Payment
    await this.db
      .update(payments)
      .set({
        status: 'captured',
        providerPaymentId: razorpayPaymentId,
        providerSignature: razorpaySignature,
      })
      .where(eq(payments.id, payment.id));

    // Create or update subscription
    const [plan] = await this.db.select().from(plans).where(eq(plans.id, payment.planId!)).limit(1);
    if (!plan) throw new NotFoundException('Plan not found');

    await this.activatePlanForUser(userId, plan, payment.id);

    return { success: true, planName: plan.name, planSlug: plan.slug };
  }

  async getUserSubscription(userId: string) {
    const activeSub = await this.db
      .select({
        id: subscriptions.id,
        planId: subscriptions.planId,
        status: subscriptions.status,
        startsAt: subscriptions.startsAt,
        expiresAt: subscriptions.expiresAt,
        plan: plans,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, 'active'),
          gt(subscriptions.expiresAt, new Date())
        )
      )
      .limit(1);

    if (activeSub.length === 0) {
      return {
        id: 'free',
        planId: 'free',
        planSlug: 'free',
        planName: 'Free',
        status: 'active',
        startsAt: null,
        expiresAt: null,
      };
    }

    const sub = activeSub[0];
    return {
      id: sub.id,
      planId: sub.plan.slug,
      planUuid: sub.plan.id,
      planSlug: sub.plan.slug,
      planName: sub.plan.name,
      status: sub.status,
      startsAt: sub.startsAt,
      expiresAt: sub.expiresAt,
      plan: sub.plan,
    };
  }

  async getUserInvoices(userId: string) {
    const records = await this.db
      .select({
        id: payments.id,
        amountPaise: payments.amountPaise,
        currency: payments.currency,
        status: payments.status,
        provider: payments.provider,
        providerOrderId: payments.providerOrderId,
        createdAt: payments.createdAt,
        planName: plans.name,
        planSlug: plans.slug,
      })
      .from(payments)
      .innerJoin(plans, eq(payments.planId, plans.id))
      .where(and(eq(payments.userId, userId), eq(payments.status, 'captured')))
      .orderBy(desc(payments.createdAt));

    return records.map((r) => ({
      id: r.id,
      planId: r.planSlug,
      planName: r.planName,
      amount: `₹${(r.amountPaise / 100).toLocaleString('en-IN')}`,
      method: r.provider === 'razorpay' ? 'Razorpay' : r.provider,
      status: 'paid',
      paidAt: r.createdAt.toISOString(),
    }));
  }

  async createContactUnlockOrder(userId: string, targetProfileId: string) {
    const [profile] = await this.db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    if (!profile) throw new NotFoundException('Profile not found');

    // Reject self-unlock and nonexistent targets up front
    if (profile.id === targetProfileId) {
      throw new BadRequestException('Cannot unlock your own contact');
    }
    const [target] = await this.db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, targetProfileId)).limit(1);
    if (!target) throw new NotFoundException('Target profile not found');

    const amountPaise = 2900; // ₹29 extra contact unlock
    const keyId = this.configService.get<string>('payments.razorpayKeyId');
    const razorpay = this.requireRazorpay();

    try {
      const options = {
        amount: amountPaise,
        currency: 'INR',
        receipt: `rcpt_cu_${profile.id.substring(0, 8)}_${Date.now()}`,
        notes: {
          userId,
          type: 'contact_unlock',
          targetProfileId,
        },
      };

      const order = await razorpay.orders.create(options);

      // Bind the order to the target at creation so verify can never redirect it.
      await this.db.insert(payments).values({
        userId,
        amountPaise,
        currency: 'INR',
        provider: 'razorpay',
        providerOrderId: order.id,
        status: 'created',
        targetProfileId,
      });

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId,
        targetProfileId,
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error('Error creating contact unlock order:', err);
      throw new InternalServerErrorException('Failed to create payment order');
    }
  }

  async verifyContactUnlockPayment(
    userId: string,
    targetProfileId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ) {
    this.requireRazorpay();
    const secret = this.configService.getOrThrow<string>('payments.razorpayKeySecret');
    if (!secret) {
      throw new BadRequestException('Razorpay is not configured.');
    }

    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      throw new BadRequestException('Invalid payment signature');
    }

    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.providerOrderId, razorpayOrderId))
      .limit(1);

    if (!payment) throw new NotFoundException('Payment record not found');

    // The order is bound to a specific target at creation; the client cannot
    // redirect a paid order to a different profile, and only the owner may verify it.
    if (payment.userId !== userId) {
      throw new ForbiddenException('Payment does not belong to this user');
    }
    const boundTargetId = payment.targetProfileId;
    if (!boundTargetId) {
      throw new BadRequestException('Payment order is not bound to a target profile');
    }
    if (targetProfileId && targetProfileId !== boundTargetId) {
      throw new BadRequestException('Target profile does not match the paid order');
    }

    // Already captured: idempotent — only the bound target's phone is ever returned.
    if (payment.status === 'captured') {
      return { success: true, contactPhone: await this.resolveTargetPhone(boundTargetId) };
    }

    const [profile] = await this.db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    if (!profile) throw new NotFoundException('Profile not found');

    await this.db
      .update(payments)
      .set({
        status: 'captured',
        providerPaymentId: razorpayPaymentId,
        providerSignature: razorpaySignature,
      })
      .where(eq(payments.id, payment.id));

    // Record the unlock idempotently (no unique constraint on the pair, so check-then-insert)
    const [existingUnlock] = await this.db
      .select({ id: unlockedContacts.id })
      .from(unlockedContacts)
      .where(
        and(
          eq(unlockedContacts.unlockerProfileId, profile.id),
          eq(unlockedContacts.unlockedProfileId, boundTargetId),
        ),
      )
      .limit(1);
    if (!existingUnlock) {
      await this.db.insert(unlockedContacts).values({
        unlockerProfileId: profile.id,
        unlockedProfileId: boundTargetId,
        paymentId: payment.id,
      });
    }

    // Block the chat session for this pair
    const [existingSession] = await this.db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.profile1Id, profile.id),
          eq(chatSessions.profile2Id, boundTargetId)
        )
      )
      .limit(1);

    if (existingSession) {
      await this.db
        .update(chatSessions)
        .set({ isBlocked: true, blockedReason: 'contact_unlocked' })
        .where(eq(chatSessions.id, existingSession.id));
    } else {
      await this.db.insert(chatSessions).values({
        profile1Id: profile.id,
        profile2Id: boundTargetId,
        isBlocked: true,
        blockedReason: 'contact_unlocked',
      });
    }

    return { success: true, contactPhone: await this.resolveTargetPhone(boundTargetId) };
  }

  private async resolveTargetPhone(targetProfileId: string): Promise<string | null> {
    const [target] = await this.db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.id, targetProfileId))
      .limit(1);
    if (!target) return null;
    const [owner] = await this.db
      .select({ phone: users.phone })
      .from(users)
      .where(eq(users.id, target.userId))
      .limit(1);
    return owner?.phone ?? null;
  }
}
