import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Headers,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { AllowUnverified } from '../common/decorators/allow-unverified.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { z } from 'zod';
import type { UserSession } from '@astalakshimi/types';

const createOrderSchema = z.object({
  planId: z.string().min(1).max(200),
});

const verifyOrderSchema = z.object({
  orderId: z.string().min(3).max(200),
});

const createRefundSchema = z.object({
  paymentId: z.string().uuid(),
  refundAmountPaise: z.number().int().positive(),
  refundNote: z.string().max(500).optional(),
  refundSpeed: z.enum(['STANDARD', 'INSTANT']).optional(),
});

type RawBodyRequest = Request & { rawBody?: Buffer };

@UseGuards(JwtAuthGuard)
@AllowUnverified()
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('orders')
  createOrder(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(createOrderSchema)) body: { planId: string },
  ) {
    return this.paymentsService.createOrder(user.userId, body.planId);
  }

  @Post('verify')
  verifyOrder(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(verifyOrderSchema)) body: { orderId: string },
  ) {
    return this.paymentsService.verifyOrder(user.userId, body.orderId);
  }

  @Get('subscription')
  getSubscription(@CurrentUser() user: UserSession) {
    return this.paymentsService.getUserSubscription(user.userId);
  }

  @Get('invoices')
  getInvoices(@CurrentUser() user: UserSession) {
    return this.paymentsService.getUserInvoices(user.userId);
  }

  @Post('refunds')
  createRefund(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(createRefundSchema))
    body: {
      paymentId: string;
      refundAmountPaise: number;
      refundNote?: string;
      refundSpeed?: 'STANDARD' | 'INSTANT';
    },
  ) {
    return this.paymentsService.createRefund({
      ...body,
      actorUserId: user.userId,
    });
  }

  @Public()
  @SkipThrottle()
  @Post('webhook/cashfree')
  async webhook(@Req() req: RawBodyRequest, @Headers() headers: Record<string, string>) {
    if (this.configService.get('payments.webhookIpAllowlistEnabled') === true) {
      const allowlist = this.configService.get<string[]>('payments.cashfreeWebhookIps') ?? [];
      const ip = this.extractClientIp(req);
      if (allowlist.length > 0 && !allowlist.includes(ip)) {
        this.logger.warn(`Webhook from non-allowlisted IP: ${ip}`);
        throw new UnauthorizedException('IP not allowed');
      }
    }

    const rawBody = req.rawBody;
    if (!rawBody || rawBody.length === 0) {
      throw new UnauthorizedException('Missing webhook body');
    }
    return this.paymentsService.handleWebhook(rawBody, headers);
  }

  private extractClientIp(req: Request): string {
    const xf = req.headers['x-forwarded-for'];
    if (typeof xf === 'string' && xf.length > 0) return xf.split(',')[0].trim();
    if (Array.isArray(xf) && xf[0]) return xf[0].split(',')[0].trim();
    return req.ip || '';
  }
}
