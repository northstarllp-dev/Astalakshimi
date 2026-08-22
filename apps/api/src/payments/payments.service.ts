import { Injectable, Inject, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { payments, subscriptions, plans, profiles } from '@astalakshimi/database';
import { eq, and } from 'drizzle-orm';
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

  async createOrder(userId: string, planId: string) {
    // Get profile
    const [profile] = await this.db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    if (!profile) throw new NotFoundException('Profile not found');

    // Get plan
    const [plan] = await this.db.select().from(plans).where(eq(plans.id, planId)).limit(1);
    if (!plan) throw new NotFoundException('Plan not found');

    try {
      // Create Razorpay Order
      const options = {
        amount: plan.pricePaise, // amount in the smallest currency unit
        currency: 'INR',
        receipt: `rcpt_${profile.id.substring(0, 8)}_${Date.now()}`,
      };
      
      const order = await this.razorpay.orders.create(options);

      // Create Payment Record
      const [payment] = await this.db.insert(payments).values({
        userId,
        planId: plan.id,
        amountPaise: plan.pricePaise,
        currency: 'INR',
        provider: 'razorpay',
        providerOrderId: order.id,
        status: 'created',
      }).returning();

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: this.configService.get<string>('RAZORPAY_KEY_ID'),
      };
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException('Failed to create payment order');
    }
  }

  async verifyPayment(
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

    if (generatedSignature !== razorpaySignature) {
      throw new InternalServerErrorException('Invalid payment signature');
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

    // Get plan details for subscription
    const [plan] = await this.db.select().from(plans).where(eq(plans.id, payment.planId)).limit(1);
    
    // Create or update subscription
    const startsAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

    // Deactivate old subscriptions
    await this.db
      .update(subscriptions)
      .set({ status: 'expired' })
      .where(
        and(
          eq(subscriptions.userId, payment.userId),
          eq(subscriptions.status, 'active')
        )
      );

    await this.db.insert(subscriptions).values({
      userId: payment.userId,
      planId: plan.id,
      paymentId: payment.id,
      startsAt,
      expiresAt,
      status: 'active',
    });

    return { success: true };
  }
}
