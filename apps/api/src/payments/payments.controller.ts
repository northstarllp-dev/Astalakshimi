import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { AllowUnverified } from '../common/decorators/allow-unverified.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { z } from 'zod';
import type { UserSession } from '@astalakshimi/types';

const createOrderSchema = z.object({
  planId: z.string().min(1).max(200),
});

const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(3).max(200),
  razorpayPaymentId: z.string().min(3).max(200),
  razorpaySignature: z.string().min(8).max(1000),
});

@UseGuards(JwtAuthGuard)
@AllowUnverified()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('orders')
  createOrder(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(createOrderSchema)) body: { planId: string },
  ) {
    return this.paymentsService.createOrder(user.userId, body.planId);
  }

  @Post('verify')
  verifyPayment(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(verifyPaymentSchema))
    body: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
  ) {
    return this.paymentsService.verifyPayment(
      user.userId,
      body.razorpayOrderId,
      body.razorpayPaymentId,
      body.razorpaySignature,
    );
  }

  @Get('subscription')
  getSubscription(@CurrentUser() user: UserSession) {
    return this.paymentsService.getUserSubscription(user.userId);
  }

  @Get('invoices')
  getInvoices(@CurrentUser() user: UserSession) {
    return this.paymentsService.getUserInvoices(user.userId);
  }
}
