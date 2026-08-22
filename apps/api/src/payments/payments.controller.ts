import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserSession } from '@astalakshimi/types';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('orders')
  createOrder(
    @CurrentUser() user: UserSession,
    @Body() body: { planId: string },
  ) {
    if (!body.planId) throw new BadRequestException('planId is required');
    return this.paymentsService.createOrder(user.userId, body.planId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify')
  verifyPayment(
    @Body() body: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
  ) {
    if (!body.razorpayOrderId || !body.razorpayPaymentId || !body.razorpaySignature) {
      throw new BadRequestException('Missing payment verification details');
    }
    return this.paymentsService.verifyPayment(
      body.razorpayOrderId,
      body.razorpayPaymentId,
      body.razorpaySignature
    );
  }
}
