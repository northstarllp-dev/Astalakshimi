import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { PaymentsController } from '../../src/payments/payments.controller';
import { PaymentsService } from '../../src/payments/payments.service';
import type { UserSession } from '@astalakshimi/types';

describe('PaymentsController (Cashfree)', () => {
  let controller: PaymentsController;
  let paymentsService: jest.Mocked<PaymentsService>;
  let configService: { get: jest.Mock };

  const mockUserSession: UserSession = {
    userId: 'user-uuid-1',
    phone: '9876543210',
    role: 'member',
  };

  beforeEach(async () => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'payments.webhookIpAllowlistEnabled') return false;
        if (key === 'payments.cashfreeWebhookIps') return [];
        return undefined;
      }),
    };

    const mockPaymentsService = {
      createOrder: jest.fn(),
      verifyOrder: jest.fn(),
      getUserSubscription: jest.fn(),
      getUserInvoices: jest.fn(),
      createRefund: jest.fn(),
      handleWebhook: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: PaymentsService, useValue: mockPaymentsService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    controller = module.get(PaymentsController);
    paymentsService = module.get(PaymentsService);
  });

  describe('POST /payments/orders', () => {
    it('returns Cashfree session data', async () => {
      const expected = {
        orderId: 'cf_order_1',
        paymentSessionId: 'sess_1',
        amount: 29900,
        currency: 'INR',
        planId: 'plan-1',
        planSlug: 'silver',
        planName: 'Silver',
      };
      paymentsService.createOrder.mockResolvedValue(expected as any);

      const result = await controller.createOrder(mockUserSession, { planId: 'silver' });

      expect(paymentsService.createOrder).toHaveBeenCalledWith(mockUserSession.userId, 'silver');
      expect(result).toEqual(expected);
    });
  });

  describe('POST /payments/verify', () => {
    it('verifies the order server-side', async () => {
      const expected = { success: true, planName: 'Silver', planSlug: 'silver' };
      paymentsService.verifyOrder.mockResolvedValue(expected as any);

      const result = await controller.verifyOrder(mockUserSession, { orderId: 'cf_order_1' });

      expect(paymentsService.verifyOrder).toHaveBeenCalledWith(mockUserSession.userId, 'cf_order_1');
      expect(result).toEqual(expected);
    });
  });

  describe('POST /payments/webhook/cashfree', () => {
    it('forwards a valid signature payload', async () => {
      paymentsService.handleWebhook.mockResolvedValue({ received: true } as any);
      const req = {
        rawBody: Buffer.from('{"type":"PAYMENT_SUCCESS_WEBHOOK"}'),
        headers: {},
        ip: '127.0.0.1',
      } as any;

      const result = await controller.webhook(req, {
        'x-webhook-signature': 'sig',
        'x-webhook-timestamp': '123',
      });

      expect(paymentsService.handleWebhook).toHaveBeenCalled();
      expect(result).toEqual({ received: true });
    });

    it('returns 401 when the signature handler rejects', async () => {
      paymentsService.handleWebhook.mockRejectedValue(new UnauthorizedException('Invalid webhook signature'));
      const req = {
        rawBody: Buffer.from('{"type":"PAYMENT_SUCCESS_WEBHOOK"}'),
        headers: {},
        ip: '127.0.0.1',
      } as any;

      await expect(
        controller.webhook(req, { 'x-webhook-signature': 'bad', 'x-webhook-timestamp': '123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects missing raw body', async () => {
      await expect(controller.webhook({ headers: {}, ip: '1.1.1.1' } as any, {})).rejects.toThrow(
        'Missing webhook body',
      );
    });

    it('rejects non-allowlisted IPs when the allow-list is enabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'payments.webhookIpAllowlistEnabled') return true;
        if (key === 'payments.cashfreeWebhookIps') return ['52.66.25.127'];
        return undefined;
      });
      const req = {
        rawBody: Buffer.from('{}'),
        headers: { 'x-forwarded-for': '1.2.3.4' },
        ip: '1.2.3.4',
      } as any;
      await expect(controller.webhook(req, {})).rejects.toThrow('IP not allowed');
    });
  });

  describe('GET /payments/subscription', () => {
    it('returns the user subscription', async () => {
      const expected = { id: 'sub-1', planSlug: 'silver', status: 'active' };
      paymentsService.getUserSubscription.mockResolvedValue(expected as any);
      await expect(controller.getSubscription(mockUserSession)).resolves.toEqual(expected);
    });
  });

  describe('GET /payments/invoices', () => {
    it('returns invoices', async () => {
      const expected = [{ id: 'pay-1', method: 'Cashfree', status: 'paid' }];
      paymentsService.getUserInvoices.mockResolvedValue(expected as any);
      await expect(controller.getInvoices(mockUserSession)).resolves.toEqual(expected);
    });
  });
});
