import { Injectable, Inject, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { payments, subscriptions, plans, profiles, users, unlockedContacts, chatSessions } from '@astalakshimi/database';
import { eq, and, gt, desc } from 'drizzle-orm';
import Razorpay = require('razorpay');
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private razorpay: Razorpay;

  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    private readonly configService: ConfigService,
  ) {
    this.razorpay = new Razorpay({
      key_id: this.configService.get<string>('RAZORPAY_KEY_ID') || 'test_key',
      key_secret: this.configService.get<string>('RAZORPAY_KEY_SECRET') || 'test_secret',
    });
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
        order = await this.razorpay.orders.create(options);
      } catch (rError) {
        console.error('Razorpay order creation failed:', rError);
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
        keyId: this.configService.get<string>('RAZORPAY_KEY_ID') || 'test_key',
        planId: plan.id,
        planSlug: plan.slug,
        planName: plan.name,
      };
    } catch (err) {
      console.error('Error creating payment order:', err);
      throw new InternalServerErrorException('Failed to create payment order');
    }
  }

  private isDemoPaymentsEnabled() {
    return process.env.NODE_ENV !== 'production';
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

  async activateDemoPlan(userId: string, planIdentifier: string) {
    if (!this.isDemoPaymentsEnabled()) {
      throw new BadRequestException('Demo plan activation is disabled in production.');
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planIdentifier);
    const planCondition = isUuid ? eq(plans.id, planIdentifier) : eq(plans.slug, planIdentifier);
    const [plan] = await this.db.select().from(plans).where(planCondition).limit(1);
    if (!plan) throw new NotFoundException(`Plan '${planIdentifier}' not found`);

    const stamp = Date.now();
    const [payment] = await this.db
      .insert(payments)
      .values({
        userId,
        planId: plan.id,
        amountPaise: plan.pricePaise,
        currency: 'INR',
        provider: 'razorpay',
        providerOrderId: `demo_skip_${plan.slug}_${stamp}`,
        providerPaymentId: `demo_pay_${stamp}`,
        status: 'captured',
      })
      .returning();

    await this.activatePlanForUser(userId, plan, payment?.id);

    return {
      success: true,
      demoActivated: true,
      planName: plan.name,
      planSlug: plan.slug,
    };
  }

  async verifyPayment(
    userId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ) {
    const secret = this.configService.get<string>('RAZORPAY_KEY_SECRET') || 'test_secret';
    
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

    const amountPaise = 2900; // ₹29 extra contact unlock
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID') || 'test_key';

    try {
      let orderId = `order_cu_${Date.now()}`;
      let orderAmount: number | string = amountPaise;
      let orderCurrency = 'INR';

      if (keyId && keyId !== 'test_key') {
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

        const order = await this.razorpay.orders.create(options);
        orderId = order.id;
        orderAmount = order.amount;
        orderCurrency = order.currency;
      }

      await this.db.insert(payments).values({
        userId,
        amountPaise,
        currency: 'INR',
        provider: 'razorpay',
        providerOrderId: orderId,
        status: 'created',
      });

      return {
        orderId,
        amount: orderAmount,
        currency: orderCurrency,
        keyId,
        targetProfileId,
      };
    } catch (err) {
      console.error('Error creating contact unlock order:', err);
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
    const secret = this.configService.get<string>('RAZORPAY_KEY_SECRET') || 'test_secret';
    
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const isDemo = secret === 'test_secret' && razorpaySignature === 'demo_signature';
    if (generatedSignature !== razorpaySignature && !isDemo) {
      throw new BadRequestException('Invalid payment signature');
    }

    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.providerOrderId, razorpayOrderId))
      .limit(1);

    if (!payment) throw new NotFoundException('Payment record not found');
    if (payment.status === 'captured') {
      const [target] = await this.db
        .select({ userId: profiles.userId })
        .from(profiles)
        .where(eq(profiles.id, targetProfileId))
        .limit(1);
      const [owner] = target
        ? await this.db.select({ phone: users.phone }).from(users).where(eq(users.id, target.userId)).limit(1)
        : [];
      return { success: true, contactPhone: owner?.phone ?? null };
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

    // Record unlocked contact
    await this.db.insert(unlockedContacts).values({
      unlockerProfileId: profile.id,
      unlockedProfileId: targetProfileId,
      paymentId: payment.id,
    });

    // Block the chat session
    const [existingSession] = await this.db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.profile1Id, profile.id),
          eq(chatSessions.profile2Id, targetProfileId)
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
        profile2Id: targetProfileId,
        isBlocked: true,
        blockedReason: 'contact_unlocked',
      });
    }

    const [target] = await this.db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.id, targetProfileId))
      .limit(1);
    const [owner] = target
      ? await this.db.select({ phone: users.phone }).from(users).where(eq(users.id, target.userId)).limit(1)
      : [];

    return { success: true, contactPhone: owner?.phone ?? null };
  }
}
