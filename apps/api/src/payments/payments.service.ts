import {
  Injectable,
  Inject,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DB_CLIENT } from '../database/database.constants';
import type { Database, Payment } from '@astalakshimi/database';
import {
  payments,
  subscriptions,
  plans,
  profiles,
  users,
  unlockedContacts,
  chatSessions,
  paymentDiscrepancies,
  paymentRefunds,
} from '@astalakshimi/database';
import { eq, and, gt, desc } from 'drizzle-orm';
import { Cashfree, CFEnvironment } from 'cashfree-pg';
import { randomUUID } from 'crypto';

type VerifiedBy = 'client_callback' | 'webhook' | 'reconciliation';

const TERMINAL_FAILED_ORDER_STATUSES = new Set([
  'EXPIRED',
  'TERMINATED',
  'TERMINATION_REQUESTED',
]);

@Injectable()
export class PaymentsService {
  private readonly cashfree: Cashfree;
  private readonly logger = new Logger(PaymentsService.name);
  private readonly xApiVersion: string;

  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    private readonly configService: ConfigService,
  ) {
    const clientId = this.configService.get<string>('payments.cashfreeClientId') || '';
    const clientSecret = this.configService.get<string>('payments.cashfreeClientSecret') || '';
    const environment = this.configService.get<string>('payments.cashfreeEnvironment') || 'sandbox';
    this.xApiVersion =
      this.configService.get<string>('payments.cashfreeApiVersion') || '2025-01-01';

    this.cashfree = new Cashfree(
      environment === 'production' ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX,
      clientId,
      clientSecret,
    );
    this.cashfree.XApiVersion = this.xApiVersion;
  }

  async createOrder(userId: string, planIdentifier: string) {
    const [profile] = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    if (!profile) throw new NotFoundException('Profile not found');

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planIdentifier);
    const planCondition = isUuid ? eq(plans.id, planIdentifier) : eq(plans.slug, planIdentifier);
    const [plan] = await this.db.select().from(plans).where(planCondition).limit(1);
    if (!plan) throw new NotFoundException(`Plan '${planIdentifier}' not found`);

    const amountPaise = plan.pricePaise;
    if (amountPaise === 0) {
      await this.activatePlanSubscription(userId, plan);
      return {
        freeActivated: true,
        planId: plan.id,
        planSlug: plan.slug,
        planName: plan.name,
        amount: 0,
        currency: 'INR',
      };
    }

    const [owner] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    const orderId = this.generateOrderId(profile.id);
    const frontendUrl = this.configService.get<string>('app.frontendUrl') || 'http://localhost:3000';
    const apiPublicUrl =
      this.configService.get<string>('app.apiPublicUrl') || 'http://localhost:4000/api';

    const request = {
      order_id: orderId,
      order_amount: amountPaise / 100,
      order_currency: 'INR',
      customer_details: {
        customer_id: userId,
        customer_name: profile.fullName || '',
        customer_email: owner?.email || undefined,
        customer_phone: this.toCustomerPhone(owner?.phone),
      },
      order_meta: {
        return_url: `${frontendUrl}/checkout/return`,
        notify_url: `${apiPublicUrl}/payments/webhook/cashfree`,
      },
      order_note: `Plan: ${plan.slug}`,
      order_tags: {
        userId,
        planId: plan.id,
        planSlug: plan.slug,
        orderType: 'plan',
      },
      order_expiry_time: this.toExpiryIso(30),
    };

    const requestId = randomUUID();
    const cfOrder = await this.createCashfreeOrder(request, requestId, orderId);

    await this.db.insert(payments).values({
      userId,
      planId: plan.id,
      amountPaise,
      currency: 'INR',
      provider: 'cashfree',
      providerOrderId: cfOrder.order_id,
      providerSessionId: cfOrder.payment_session_id,
      providerStatus: cfOrder.order_status,
      providerMetadata: { cfOrder },
      status: 'created',
    });

    return {
      orderId: cfOrder.order_id,
      paymentSessionId: cfOrder.payment_session_id,
      amount: amountPaise,
      currency: 'INR',
      planId: plan.id,
      planSlug: plan.slug,
      planName: plan.name,
    };
  }

  async verifyOrder(userId: string, orderId: string) {
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.providerOrderId, orderId))
      .limit(1);

    if (!payment) throw new NotFoundException('Payment record not found');
    if (payment.userId !== userId) {
      throw new ForbiddenException('Payment does not belong to this user');
    }

    if (payment.status === 'captured') {
      return { success: true, message: 'Payment already processed' };
    }

    const cfOrder = await this.fetchCashfreeOrder(orderId);
    this.assertAmountMatches(payment, cfOrder);

    if (cfOrder.order_status !== 'PAID') {
      if (TERMINAL_FAILED_ORDER_STATUSES.has(cfOrder.order_status || '') && payment.status !== 'failed') {
        await this.db
          .update(payments)
          .set({
            status: 'failed',
            providerStatus: cfOrder.order_status,
            failureReason: `Order ${cfOrder.order_status}`,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, payment.id));
      }
      return {
        success: false,
        status: cfOrder.order_status,
        message: `Payment is ${cfOrder.order_status}`,
      };
    }

    const providerPaymentId = await this.fetchSuccessfulPaymentId(orderId);
    await this.capturePayment(payment.id, providerPaymentId, 'client_callback');

    if (!payment.planId) throw new NotFoundException('Plan not found');
    const [plan] = await this.db.select().from(plans).where(eq(plans.id, payment.planId)).limit(1);
    if (!plan) throw new NotFoundException('Plan not found');

    await this.activatePlanSubscription(userId, plan, payment.id);
    return { success: true, planName: plan.name, planSlug: plan.slug };
  }

  /** @deprecated Use verifyOrder. Kept so older call sites compile during the swap. */
  verifyPayment(userId: string, orderId: string) {
    return this.verifyOrder(userId, orderId);
  }

  async handleWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>) {
    const signature = this.header(headers, 'x-webhook-signature');
    const timestamp = this.header(headers, 'x-webhook-timestamp');
    if (!signature || !timestamp) {
      throw new UnauthorizedException('Missing webhook signature or timestamp');
    }

    const secret = this.configService.get<string>('payments.cashfreeWebhookSecret');
    if (!secret) {
      this.logger.warn('Webhook received but CASHFREE_WEBHOOK_SECRET not configured');
      throw new UnauthorizedException('Webhook not configured');
    }

    const replayWindowMs =
      this.configService.get<number>('payments.webhookReplayWindowMs') ?? 5 * 60_000;
    const tsMs = this.parseWebhookTimestamp(timestamp);
    if (!Number.isFinite(tsMs) || Math.abs(Date.now() - tsMs) > replayWindowMs) {
      this.logger.warn(`Webhook timestamp out of replay window: ${timestamp}`);
      throw new UnauthorizedException('Webhook timestamp out of replay window');
    }

    let webhookEvent: { type?: string; object?: any };
    try {
      webhookEvent = this.cashfree.PGVerifyWebhookSignature(
        signature,
        rawBody.toString(),
        timestamp,
      );
    } catch (err: any) {
      this.logger.warn('Webhook signature verification failed', err?.message);
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const payload = webhookEvent.object ?? JSON.parse(rawBody.toString());
    const eventType: string = payload.type || payload.event_type || webhookEvent.type || '';
    const data = payload.data || payload;
    const orderId: string | undefined = data.order?.order_id;
    const cfPaymentId: string | undefined = data.payment?.cf_payment_id || data.payment?.payment_id;
    const eventId =
      payload.event_id ||
      (cfPaymentId ? `${orderId}_${eventType}_${cfPaymentId}` : `${orderId}_${eventType}`);

    const [existing] = await this.db
      .select({ id: payments.id })
      .from(payments)
      .where(eq(payments.webhookEventId, eventId))
      .limit(1);
    if (existing) {
      return { received: true, alreadyProcessed: true };
    }

    if (!orderId) {
      this.logger.warn('Webhook missing order_id');
      return { received: true, unknownOrder: true };
    }

    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.providerOrderId, orderId))
      .limit(1);
    if (!payment) {
      this.logger.warn(`Webhook for unknown order ${orderId}`);
      return { received: true, unknownOrder: true };
    }

    const cfAmountPaise = Math.round(Number(data.order?.order_amount) * 100);
    const cfCurrency = data.order?.order_currency;
    if (
      Number.isFinite(cfAmountPaise) &&
      cfAmountPaise > 0 &&
      (cfAmountPaise !== payment.amountPaise || (cfCurrency && cfCurrency !== payment.currency))
    ) {
      await this.flagDiscrepancy(payment.id, payload, 'webhook amount/currency mismatch', {
        providerStatus: data.order?.order_status,
        expectedAmountPaise: payment.amountPaise,
        actualAmountPaise: cfAmountPaise,
      });
      return { received: true, discrepancy: true };
    }

    switch (eventType) {
      case 'PAYMENT_SUCCESS_WEBHOOK':
      case 'ORDER_PAID': {
        if (payment.status !== 'captured') {
          await this.capturePayment(payment.id, cfPaymentId || null, 'webhook');
          if (payment.planId) {
            const [plan] = await this.db.select().from(plans).where(eq(plans.id, payment.planId)).limit(1);
            if (plan) await this.activatePlanSubscription(payment.userId, plan, payment.id);
          }
          if (payment.targetProfileId) {
            await this.recordContactUnlock(payment.userId, payment.targetProfileId, payment.id);
          }
        }
        break;
      }
      case 'PAYMENT_FAILED_WEBHOOK': {
        if (payment.status !== 'captured') {
          await this.db
            .update(payments)
            .set({
              status: 'failed',
              providerStatus: data.payment?.payment_status || 'FAILED',
              failureReason: data.payment?.error_message || 'Payment failed',
              updatedAt: new Date(),
            })
            .where(eq(payments.id, payment.id));
        }
        break;
      }
      case 'PAYMENT_FLAGGED_WEBHOOK': {
        await this.flagDiscrepancy(payment.id, payload, 'payment flagged for review', {
          providerStatus: data.payment?.payment_status,
        });
        break;
      }
      case 'USER_REFUNDED_WEBHOOK': {
        this.logger.warn(`Refund received for order ${orderId}`);
        await this.handleRefund(payment);
        break;
      }
      default: {
        this.logger.log(`Unhandled Cashfree webhook event: ${eventType}`);
      }
    }

    await this.db
      .update(payments)
      .set({ webhookEventId: eventId, updatedAt: new Date() })
      .where(eq(payments.id, payment.id));

    return { received: true };
  }

  async reconcileOrder(payment: Payment) {
    if (!payment.providerOrderId) {
      return { pending: true, status: 'missing_order_id' };
    }

    const cfOrder = await this.fetchCashfreeOrder(payment.providerOrderId);
    const cfAmountPaise = Math.round(Number(cfOrder.order_amount) * 100);
    if (cfAmountPaise !== payment.amountPaise || cfOrder.order_currency !== payment.currency) {
      await this.flagDiscrepancy(payment.id, cfOrder, 'reconciliation amount/currency mismatch', {
        providerStatus: cfOrder.order_status,
        expectedAmountPaise: payment.amountPaise,
        actualAmountPaise: cfAmountPaise,
      });
      return { discrepancy: true };
    }

    if (cfOrder.order_status === 'PAID') {
      if (payment.status !== 'captured') {
        const providerPaymentId = await this.fetchSuccessfulPaymentId(payment.providerOrderId);
        await this.capturePayment(payment.id, providerPaymentId, 'reconciliation');
        if (payment.planId) {
          const [plan] = await this.db.select().from(plans).where(eq(plans.id, payment.planId)).limit(1);
          if (plan) await this.activatePlanSubscription(payment.userId, plan, payment.id);
        }
        if (payment.targetProfileId) {
          await this.recordContactUnlock(payment.userId, payment.targetProfileId, payment.id);
        }
      }
      return { captured: true };
    }

    if (TERMINAL_FAILED_ORDER_STATUSES.has(cfOrder.order_status || '')) {
      if (payment.status !== 'captured') {
        await this.db
          .update(payments)
          .set({
            status: 'failed',
            providerStatus: cfOrder.order_status,
            failureReason: `Order ${cfOrder.order_status}`,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, payment.id));
      }
      return { failed: true };
    }

    const ageMs = Date.now() - new Date(payment.createdAt).getTime();
    if (ageMs > 20 * 60_000 && ageMs <= 24 * 60 * 60_000) {
      try {
        await this.withRateLimit(() =>
          this.cashfree.PGTerminateOrder(
            payment.providerOrderId!,
            { order_status: 'TERMINATED' },
            randomUUID(),
          ),
        );
        this.logger.log(`Proactively terminated stale order ${payment.providerOrderId}`);
      } catch (err: any) {
        this.logger.warn(
          `Terminate Order failed for ${payment.providerOrderId}`,
          err?.response?.data || err?.message,
        );
      }
    }

    return { pending: true, status: cfOrder.order_status };
  }

  async createRefund(input: {
    paymentId: string;
    refundAmountPaise: number;
    refundNote?: string;
    refundSpeed?: 'STANDARD' | 'INSTANT';
    actorUserId: string;
  }) {
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.id, input.paymentId))
      .limit(1);
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'captured') {
      throw new BadRequestException('Only captured payments can be refunded');
    }
    if (input.refundAmountPaise <= 0 || input.refundAmountPaise > payment.amountPaise) {
      throw new BadRequestException('Invalid refund amount');
    }
    if (!payment.providerOrderId) {
      throw new BadRequestException('Payment has no provider order');
    }

    const refundId = `refund_${payment.id.substring(0, 8)}_${Date.now().toString(36)}`;
    const request = {
      refund_amount: input.refundAmountPaise / 100,
      refund_id: refundId,
      refund_note: input.refundNote || 'Customer dispute refund',
      refund_speed: input.refundSpeed || 'STANDARD',
    };

    let cfRefund: any;
    try {
      const response = await this.withRateLimit(() =>
        this.cashfree.PGOrderCreateRefund(
          payment.providerOrderId!,
          request,
          randomUUID(),
          refundId,
        ),
      );
      cfRefund = response.data;
    } catch (err: any) {
      if (err?.response?.data?.type === 'idempotency_error') {
        throw new BadRequestException('Refund already initiated with different details');
      }
      this.logger.error('Cashfree refund creation failed', {
        paymentId: input.paymentId,
        error: err?.response?.data || err?.message,
      });
      throw new InternalServerErrorException('Failed to initiate refund');
    }

    await this.db.insert(paymentRefunds).values({
      paymentId: payment.id,
      refundId,
      cfRefundId: cfRefund?.cf_refund_id ?? null,
      refundStatus: cfRefund?.refund_status ?? null,
      refundAmountPaise: input.refundAmountPaise,
      refundNote: request.refund_note,
      refundSpeed: request.refund_speed,
      initiatedBy: input.actorUserId,
    });

    this.logger.warn(`Refund ${refundId} initiated for payment ${payment.id} by ${input.actorUserId}`);
    return {
      refundId,
      status: cfRefund?.refund_status,
      amount: input.refundAmountPaise,
    };
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
          gt(subscriptions.expiresAt, new Date()),
        ),
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
      method: r.provider === 'cashfree' ? 'Cashfree' : r.provider,
      status: 'paid',
      paidAt: r.createdAt.toISOString(),
    }));
  }

  async createContactUnlockOrder(userId: string, targetProfileId: string) {
    const [profile] = await this.db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    if (!profile) throw new NotFoundException('Profile not found');
    if (profile.id === targetProfileId) {
      throw new BadRequestException('Cannot unlock your own contact');
    }
    const [target] = await this.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, targetProfileId))
      .limit(1);
    if (!target) throw new NotFoundException('Target profile not found');

    const [owner] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    const amountPaise = 2900;
    const orderId = this.generateOrderId(profile.id);
    const frontendUrl = this.configService.get<string>('app.frontendUrl') || 'http://localhost:3000';
    const apiPublicUrl =
      this.configService.get<string>('app.apiPublicUrl') || 'http://localhost:4000/api';

    const request = {
      order_id: orderId,
      order_amount: amountPaise / 100,
      order_currency: 'INR',
      customer_details: {
        customer_id: userId,
        customer_name: profile.fullName || '',
        customer_email: owner?.email || undefined,
        customer_phone: this.toCustomerPhone(owner?.phone),
      },
      order_meta: {
        return_url: `${frontendUrl}/checkout/return`,
        notify_url: `${apiPublicUrl}/payments/webhook/cashfree`,
      },
      order_note: 'Contact unlock',
      order_tags: {
        userId,
        targetProfileId,
        orderType: 'contact_unlock',
      },
      order_expiry_time: this.toExpiryIso(15),
    };

    const cfOrder = await this.createCashfreeOrder(request, randomUUID(), orderId);

    await this.db.insert(payments).values({
      userId,
      amountPaise,
      currency: 'INR',
      provider: 'cashfree',
      providerOrderId: cfOrder.order_id,
      providerSessionId: cfOrder.payment_session_id,
      providerStatus: cfOrder.order_status,
      targetProfileId,
      status: 'created',
    });

    return {
      orderId: cfOrder.order_id,
      paymentSessionId: cfOrder.payment_session_id,
      amount: amountPaise,
      currency: 'INR',
      targetProfileId,
    };
  }

  async verifyContactUnlockPayment(userId: string, targetProfileId: string, orderId: string) {
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.providerOrderId, orderId))
      .limit(1);

    if (!payment) throw new NotFoundException('Payment record not found');
    if (payment.userId !== userId) {
      throw new ForbiddenException('Payment does not belong to this user');
    }
    if (!payment.targetProfileId) {
      throw new BadRequestException('Payment order is not bound to a target profile');
    }
    if (targetProfileId && targetProfileId !== payment.targetProfileId) {
      throw new BadRequestException('Target profile does not match the paid order');
    }

    if (payment.status === 'captured') {
      return { success: true, contactPhone: await this.resolveTargetPhone(payment.targetProfileId) };
    }

    const cfOrder = await this.fetchCashfreeOrder(orderId);
    this.assertAmountMatches(payment, cfOrder);

    if (cfOrder.order_status !== 'PAID') {
      return { success: false, status: cfOrder.order_status };
    }

    const providerPaymentId = await this.fetchSuccessfulPaymentId(orderId);
    await this.capturePayment(payment.id, providerPaymentId, 'client_callback');
    await this.recordContactUnlock(userId, payment.targetProfileId, payment.id);

    return { success: true, contactPhone: await this.resolveTargetPhone(payment.targetProfileId) };
  }

  async flagDiscrepancy(
    paymentId: string,
    payload: unknown,
    reason: string,
    extras?: {
      providerStatus?: string | null;
      expectedAmountPaise?: number;
      actualAmountPaise?: number;
    },
  ) {
    this.logger.error(`Payment discrepancy: ${reason}`, { paymentId });
    await this.db
      .update(payments)
      .set({ failureReason: reason, updatedAt: new Date() })
      .where(eq(payments.id, paymentId));
    try {
      await this.db.insert(paymentDiscrepancies).values({
        paymentId,
        reason,
        providerStatus: extras?.providerStatus ?? null,
        expectedAmountPaise: extras?.expectedAmountPaise ?? null,
        actualAmountPaise: extras?.actualAmountPaise ?? null,
        payloadSnapshot: payload ?? null,
      });
    } catch (err: any) {
      this.logger.warn(`Failed to insert discrepancy row for ${paymentId}`, err?.message);
    }
  }

  private async createCashfreeOrder(request: Record<string, unknown>, requestId: string, idempotencyKey: string) {
    try {
      const response = await this.withRateLimit(() =>
        this.cashfree.PGCreateOrder(request as any, requestId, idempotencyKey),
      );
      const replayed = (response as any)?.headers?.['x-idempotency-replayed'];
      if (replayed === 'true' || replayed === true) {
        this.logger.log(`CreateOrder idempotency replayed for ${idempotencyKey}`);
      }
      return response.data;
    } catch (err: any) {
      if (err?.response?.data?.type === 'idempotency_error') {
        this.logger.error('Cashfree idempotency_error — key reused with different body', {
          idempotencyKey,
          error: err?.response?.data,
        });
        throw new BadRequestException('Payment order already exists with different details');
      }
      this.logger.error('Cashfree order creation failed', {
        orderId: request.order_id,
        requestId,
        error: err?.response?.data || err?.message,
      });
      throw new InternalServerErrorException('Failed to create payment order');
    }
  }

  private async fetchCashfreeOrder(orderId: string) {
    try {
      const response = await this.withRateLimit(() =>
        this.cashfree.PGFetchOrder(orderId, randomUUID()),
      );
      return response.data;
    } catch (err: any) {
      this.logger.error(`Cashfree fetch order failed for ${orderId}`, err?.response?.data || err?.message);
      throw new InternalServerErrorException('Unable to verify payment status');
    }
  }

  private async fetchSuccessfulPaymentId(orderId: string): Promise<string | null> {
    try {
      const response = await this.withRateLimit(() =>
        this.cashfree.PGOrderFetchPayments(orderId, randomUUID()),
      );
      const paymentEntities = (response.data || []) as Array<{
        payment_status?: string;
        cf_payment_id?: string;
      }>;
      const successful = paymentEntities.find((p) => p.payment_status === 'SUCCESS');
      return successful?.cf_payment_id || null;
    } catch (err: any) {
      this.logger.warn(`PGOrderFetchPayments failed for ${orderId}`, err?.response?.data || err?.message);
      return null;
    }
  }

  private assertAmountMatches(payment: Payment, cfOrder: { order_amount?: number; order_currency?: string }) {
    const cfAmountPaise = Math.round(Number(cfOrder.order_amount) * 100);
    if (cfAmountPaise !== payment.amountPaise || cfOrder.order_currency !== payment.currency) {
      void this.flagDiscrepancy(payment.id, cfOrder, 'amount/currency mismatch', {
        expectedAmountPaise: payment.amountPaise,
        actualAmountPaise: cfAmountPaise,
      });
      throw new BadRequestException('Payment amount mismatch');
    }
  }

  private async capturePayment(
    paymentId: string,
    providerPaymentId: string | null,
    verifiedBy: VerifiedBy,
  ) {
    await this.db
      .update(payments)
      .set({
        status: 'captured',
        providerPaymentId,
        providerStatus: 'PAID',
        verifiedBy,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));
  }

  private async activatePlanSubscription(
    userId: string,
    plan: { id: string; durationDays: number; name: string; slug: string },
    paymentId?: string,
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

  private async recordContactUnlock(userId: string, targetProfileId: string, paymentId: string) {
    const [profile] = await this.db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    if (!profile) throw new NotFoundException('Profile not found');

    const [existingUnlock] = await this.db
      .select({ id: unlockedContacts.id })
      .from(unlockedContacts)
      .where(
        and(
          eq(unlockedContacts.unlockerProfileId, profile.id),
          eq(unlockedContacts.unlockedProfileId, targetProfileId),
        ),
      )
      .limit(1);
    if (!existingUnlock) {
      await this.db.insert(unlockedContacts).values({
        unlockerProfileId: profile.id,
        unlockedProfileId: targetProfileId,
        paymentId,
      });
    }

    const [existingSession] = await this.db
      .select()
      .from(chatSessions)
      .where(
        and(eq(chatSessions.profile1Id, profile.id), eq(chatSessions.profile2Id, targetProfileId)),
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
  }

  private async handleRefund(payment: Payment) {
    await this.db
      .update(payments)
      .set({ status: 'refunded', updatedAt: new Date() })
      .where(eq(payments.id, payment.id));

    if (payment.planId) {
      await this.db
        .update(subscriptions)
        .set({ status: 'expired', updatedAt: new Date() })
        .where(and(eq(subscriptions.paymentId, payment.id), eq(subscriptions.status, 'active')));
    }
    this.logger.warn(
      `Refund processed for payment ${payment.id}; entitlement revoked if applicable`,
    );
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

  private async withRateLimit<T>(op: () => Promise<T>): Promise<T> {
    let attempt = 0;
    while (attempt < 3) {
      try {
        return await op();
      } catch (err: any) {
        const status = err?.response?.status;
        if (status !== 429) throw err;
        const retryAfter = Number(err?.response?.headers?.['x-ratelimit-retry']) || 2 ** attempt;
        this.logger.warn(
          `Cashfree rate limited; retrying in ${retryAfter}s (attempt ${attempt + 1})`,
        );
        await new Promise((r) => setTimeout(r, Math.min(retryAfter, 60) * 1000));
        attempt += 1;
      }
    }
    throw new InternalServerErrorException('Cashfree rate limit exceeded');
  }

  private generateOrderId(profileId: string): string {
    return `cf_${profileId.substring(0, 8)}_${Date.now().toString(36)}`;
  }

  private toExpiryIso(offsetMinutes: number): string {
    return new Date(Date.now() + offsetMinutes * 60_000).toISOString();
  }

  private toCustomerPhone(phone?: string | null): string {
    const digits = (phone || '').replace(/\D/g, '');
    if (digits.length >= 10) return digits.slice(-10);
    throw new BadRequestException('A valid customer phone is required to create a payment order');
  }

  private header(
    headers: Record<string, string | string[] | undefined>,
    name: string,
  ): string | undefined {
    const raw = headers[name] ?? headers[name.toLowerCase()];
    if (Array.isArray(raw)) return raw[0];
    return raw;
  }

  private parseWebhookTimestamp(ts: string): number {
    const n = Number(ts);
    if (!Number.isFinite(n)) return NaN;
    return n < 1e12 ? n * 1000 : n;
  }
}
