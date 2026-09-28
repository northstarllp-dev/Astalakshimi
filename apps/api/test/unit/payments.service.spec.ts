import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PaymentsService } from '../../src/payments/payments.service';
import { Cashfree } from 'cashfree-pg';

jest.mock('cashfree-pg', () => {
  const instance = {
    XApiVersion: '',
    PGCreateOrder: jest.fn(),
    PGFetchOrder: jest.fn(),
    PGOrderFetchPayments: jest.fn(),
    PGTerminateOrder: jest.fn(),
    PGOrderCreateRefund: jest.fn(),
    PGVerifyWebhookSignature: jest.fn(),
  };
  return {
    CFEnvironment: { SANDBOX: 'SANDBOX', PRODUCTION: 'PRODUCTION' },
    Cashfree: Object.assign(jest.fn().mockImplementation(() => instance), {
      __instance: instance,
    }),
  };
});

type CfMock = {
  XApiVersion: string;
  PGCreateOrder: jest.Mock;
  PGFetchOrder: jest.Mock;
  PGOrderFetchPayments: jest.Mock;
  PGTerminateOrder: jest.Mock;
  PGOrderCreateRefund: jest.Mock;
  PGVerifyWebhookSignature: jest.Mock;
};

function cf(): CfMock {
  return (Cashfree as unknown as { __instance: CfMock }).__instance;
}

function selectReturning(rows: unknown[]) {
  const q: Record<string, jest.Mock> = {
    from: jest.fn(),
    where: jest.fn(),
    innerJoin: jest.fn(),
    leftJoin: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
  };
  q.from.mockReturnValue(q);
  q.where.mockReturnValue(q);
  q.innerJoin.mockReturnValue(q);
  q.leftJoin.mockReturnValue(q);
  q.orderBy.mockResolvedValue(rows);
  q.limit.mockResolvedValue(rows);
  return q;
}

function queueSelect(db: { select: jest.Mock }, responses: unknown[][]) {
  let i = 0;
  db.select.mockImplementation(() => selectReturning(responses[i++] ?? []));
}

describe('PaymentsService (Cashfree)', () => {
  let paymentsService: PaymentsService;
  let mockDb: any;
  let mockConfigService: { get: jest.Mock };

  const profile = { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', userId: 'user-1', fullName: 'Ada' };
  const paidPlan = {
    id: 'plan-silver',
    slug: 'silver',
    name: 'Silver',
    pricePaise: 29900,
    durationDays: 30,
  };
  const freePlan = {
    id: 'plan-free',
    slug: 'free',
    name: 'Free',
    pricePaise: 0,
    durationDays: 36500,
  };
  const owner = { id: 'user-1', email: 'ada@example.com', phone: '9876543210' };
  const createdPayment = {
    id: 'pay-1',
    userId: 'user-1',
    planId: paidPlan.id,
    targetProfileId: null,
    amountPaise: 29900,
    currency: 'INR',
    provider: 'cashfree',
    providerOrderId: 'cf_order_1',
    providerSessionId: 'sess_1',
    status: 'created',
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigService = {
      get: jest.fn((key: string) => {
        const map: Record<string, unknown> = {
          'payments.cashfreeClientId': 'TEST_ID',
          'payments.cashfreeClientSecret': 'TEST_SECRET',
          'payments.cashfreeEnvironment': 'sandbox',
          'payments.cashfreeApiVersion': '2025-01-01',
          'payments.cashfreeWebhookSecret': 'whsec',
          'payments.webhookReplayWindowMs': 5 * 60_000,
          'app.frontendUrl': 'http://localhost:3000',
          'app.apiPublicUrl': 'http://localhost:4000/api',
        };
        return map[key] ?? null;
      }),
    };

    mockDb = {
      select: jest.fn(),
      insert: jest.fn().mockReturnValue({ values: jest.fn().mockResolvedValue(undefined) }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) }),
      }),
    };

    cf().PGCreateOrder.mockResolvedValue({
      data: {
        order_id: 'cf_order_1',
        payment_session_id: 'sess_1',
        order_status: 'ACTIVE',
      },
      headers: {},
    });
    cf().PGFetchOrder.mockResolvedValue({
      data: { order_id: 'cf_order_1', order_status: 'PAID', order_amount: 299, order_currency: 'INR' },
    });
    cf().PGOrderFetchPayments.mockResolvedValue({
      data: [{ payment_status: 'SUCCESS', cf_payment_id: 'cfpay_1' }],
    });

    paymentsService = new PaymentsService(mockDb, mockConfigService as any);
  });

  describe('createOrder', () => {
    it('throws if the user has no profile', async () => {
      queueSelect(mockDb, [[]]);
      await expect(paymentsService.createOrder('user-1', 'silver')).rejects.toThrow(NotFoundException);
    });

    it('throws if the plan is not found', async () => {
      queueSelect(mockDb, [[profile], []]);
      await expect(paymentsService.createOrder('user-1', 'missing')).rejects.toThrow(
        "Plan 'missing' not found",
      );
    });

    it('activates a free plan without calling Cashfree', async () => {
      queueSelect(mockDb, [[profile], [freePlan]]);
      const result = await paymentsService.createOrder('user-1', 'free');
      expect(result).toMatchObject({ freeActivated: true, planSlug: 'free', amount: 0 });
      expect(cf().PGCreateOrder).not.toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('creates a Cashfree order and stores paymentSessionId', async () => {
      queueSelect(mockDb, [[profile], [paidPlan], [owner]]);
      const result = await paymentsService.createOrder('user-1', 'silver');
      expect(cf().PGCreateOrder).toHaveBeenCalled();
      expect(result).toEqual({
        orderId: 'cf_order_1',
        paymentSessionId: 'sess_1',
        amount: 29900,
        currency: 'INR',
        planId: paidPlan.id,
        planSlug: 'silver',
        planName: 'Silver',
      });
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('surfaces Cashfree SDK failures as 500', async () => {
      queueSelect(mockDb, [[profile], [paidPlan], [owner]]);
      cf().PGCreateOrder.mockRejectedValue({ response: { data: { message: 'boom' } } });
      await expect(paymentsService.createOrder('user-1', 'silver')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('maps idempotency_error to 400', async () => {
      queueSelect(mockDb, [[profile], [paidPlan], [owner]]);
      cf().PGCreateOrder.mockRejectedValue({
        response: { data: { type: 'idempotency_error', code: 'request_invalid' } },
      });
      await expect(paymentsService.createOrder('user-1', 'silver')).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyOrder', () => {
    it('throws if the payment is missing', async () => {
      queueSelect(mockDb, [[]]);
      await expect(paymentsService.verifyOrder('user-1', 'cf_order_1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws if another user owns the payment', async () => {
      queueSelect(mockDb, [[{ ...createdPayment, userId: 'other' }]]);
      await expect(paymentsService.verifyOrder('user-1', 'cf_order_1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns already processed when captured', async () => {
      queueSelect(mockDb, [[{ ...createdPayment, status: 'captured' }]]);
      const result = await paymentsService.verifyOrder('user-1', 'cf_order_1');
      expect(result).toEqual({ success: true, message: 'Payment already processed' });
      expect(cf().PGFetchOrder).not.toHaveBeenCalled();
    });

    it('captures and activates on PAID', async () => {
      queueSelect(mockDb, [[createdPayment], [paidPlan]]);
      const result = await paymentsService.verifyOrder('user-1', 'cf_order_1');
      expect(cf().PGFetchOrder).toHaveBeenCalledWith('cf_order_1', expect.any(String));
      expect(cf().PGOrderFetchPayments).toHaveBeenCalled();
      expect(result).toEqual({ success: true, planName: 'Silver', planSlug: 'silver' });
    });

    it('rejects amount/currency mismatch', async () => {
      queueSelect(mockDb, [[createdPayment]]);
      cf().PGFetchOrder.mockResolvedValue({
        data: { order_status: 'PAID', order_amount: 1, order_currency: 'INR' },
      });
      await expect(paymentsService.verifyOrder('user-1', 'cf_order_1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('returns pending status for non-PAID orders', async () => {
      queueSelect(mockDb, [[createdPayment]]);
      cf().PGFetchOrder.mockResolvedValue({
        data: { order_status: 'ACTIVE', order_amount: 299, order_currency: 'INR' },
      });
      const result = await paymentsService.verifyOrder('user-1', 'cf_order_1');
      expect(result).toMatchObject({ success: false, status: 'ACTIVE' });
    });
  });

  describe('handleWebhook', () => {
    const nowTs = () => String(Math.floor(Date.now() / 1000));
    const raw = Buffer.from(
      JSON.stringify({
        type: 'PAYMENT_SUCCESS_WEBHOOK',
        data: {
          order: { order_id: 'cf_order_1', order_amount: 299, order_currency: 'INR' },
          payment: { cf_payment_id: 'cfpay_1', payment_status: 'SUCCESS' },
        },
      }),
    );

    it('rejects missing signature or timestamp', async () => {
      await expect(paymentsService.handleWebhook(raw, {})).rejects.toThrow(UnauthorizedException);
    });

    it('rejects timestamps outside the replay window', async () => {
      const old = String(Math.floor(Date.now() / 1000) - 20 * 60);
      await expect(
        paymentsService.handleWebhook(raw, {
          'x-webhook-signature': 'sig',
          'x-webhook-timestamp': old,
        }),
      ).rejects.toThrow('Webhook timestamp out of replay window');
    });

    it('rejects invalid signatures', async () => {
      cf().PGVerifyWebhookSignature.mockImplementation(() => {
        throw new Error('bad sig');
      });
      await expect(
        paymentsService.handleWebhook(raw, {
          'x-webhook-signature': 'sig',
          'x-webhook-timestamp': nowTs(),
        }),
      ).rejects.toThrow('Invalid webhook signature');
    });

    it('ignores duplicate event ids', async () => {
      cf().PGVerifyWebhookSignature.mockReturnValue({
        type: 'PAYMENT_SUCCESS_WEBHOOK',
        object: JSON.parse(raw.toString()),
      });
      queueSelect(mockDb, [[{ id: 'pay-1' }]]);
      const result = await paymentsService.handleWebhook(raw, {
        'x-webhook-signature': 'sig',
        'x-webhook-timestamp': nowTs(),
      });
      expect(result).toEqual({ received: true, alreadyProcessed: true });
    });

    it('captures and activates on PAYMENT_SUCCESS_WEBHOOK', async () => {
      cf().PGVerifyWebhookSignature.mockReturnValue({
        type: 'PAYMENT_SUCCESS_WEBHOOK',
        object: JSON.parse(raw.toString()),
      });
      queueSelect(mockDb, [[], [createdPayment], [paidPlan]]);
      const result = await paymentsService.handleWebhook(raw, {
        'x-webhook-signature': 'sig',
        'x-webhook-timestamp': nowTs(),
      });
      expect(result).toEqual({ received: true });
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('flags a discrepancy on amount mismatch', async () => {
      const mismatch = {
        type: 'PAYMENT_SUCCESS_WEBHOOK',
        data: {
          order: { order_id: 'cf_order_1', order_amount: 1, order_currency: 'INR' },
          payment: { cf_payment_id: 'cfpay_1' },
        },
      };
      cf().PGVerifyWebhookSignature.mockReturnValue({ type: 'PAYMENT_SUCCESS_WEBHOOK', object: mismatch });
      queueSelect(mockDb, [[], [createdPayment]]);
      const result = await paymentsService.handleWebhook(Buffer.from(JSON.stringify(mismatch)), {
        'x-webhook-signature': 'sig',
        'x-webhook-timestamp': nowTs(),
      });
      expect(result).toEqual({ received: true, discrepancy: true });
    });

    it('marks failed on PAYMENT_FAILED_WEBHOOK', async () => {
      const payload = {
        type: 'PAYMENT_FAILED_WEBHOOK',
        data: {
          order: { order_id: 'cf_order_1', order_amount: 299, order_currency: 'INR' },
          payment: { payment_status: 'FAILED', error_message: 'bank declined' },
        },
      };
      cf().PGVerifyWebhookSignature.mockReturnValue({ type: 'PAYMENT_FAILED_WEBHOOK', object: payload });
      queueSelect(mockDb, [[], [createdPayment]]);
      await paymentsService.handleWebhook(Buffer.from(JSON.stringify(payload)), {
        'x-webhook-signature': 'sig',
        'x-webhook-timestamp': nowTs(),
      });
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('does not activate entitlement on PAYMENT_FLAGGED_WEBHOOK', async () => {
      const payload = {
        type: 'PAYMENT_FLAGGED_WEBHOOK',
        data: {
          order: { order_id: 'cf_order_1', order_amount: 299, order_currency: 'INR' },
          payment: { payment_status: 'FLAGGED' },
        },
      };
      cf().PGVerifyWebhookSignature.mockReturnValue({ type: 'PAYMENT_FLAGGED_WEBHOOK', object: payload });
      queueSelect(mockDb, [[], [createdPayment]]);
      await paymentsService.handleWebhook(Buffer.from(JSON.stringify(payload)), {
        'x-webhook-signature': 'sig',
        'x-webhook-timestamp': nowTs(),
      });
      expect(mockDb.insert).toHaveBeenCalled();
      expect(cf().PGOrderFetchPayments).not.toHaveBeenCalled();
    });

    it('revokes subscription on USER_REFUNDED_WEBHOOK', async () => {
      const payload = {
        type: 'USER_REFUNDED_WEBHOOK',
        data: {
          order: { order_id: 'cf_order_1', order_amount: 299, order_currency: 'INR' },
        },
      };
      cf().PGVerifyWebhookSignature.mockReturnValue({ type: 'USER_REFUNDED_WEBHOOK', object: payload });
      queueSelect(mockDb, [[], [{ ...createdPayment, status: 'captured' }]]);
      await paymentsService.handleWebhook(Buffer.from(JSON.stringify(payload)), {
        'x-webhook-signature': 'sig',
        'x-webhook-timestamp': nowTs(),
      });
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('logs and ignores unknown event types', async () => {
      const payload = {
        type: 'SOMETHING_ELSE',
        data: { order: { order_id: 'cf_order_1', order_amount: 299, order_currency: 'INR' } },
      };
      cf().PGVerifyWebhookSignature.mockReturnValue({ type: 'SOMETHING_ELSE', object: payload });
      queueSelect(mockDb, [[], [createdPayment]]);
      const result = await paymentsService.handleWebhook(Buffer.from(JSON.stringify(payload)), {
        'x-webhook-signature': 'sig',
        'x-webhook-timestamp': nowTs(),
      });
      expect(result).toEqual({ received: true });
    });
  });

  describe('reconcileOrder', () => {
    it('captures PAID stuck orders via PGOrderFetchPayments', async () => {
      queueSelect(mockDb, [[paidPlan]]);
      const result = await paymentsService.reconcileOrder(createdPayment as any);
      expect(cf().PGFetchOrder).toHaveBeenCalled();
      expect(cf().PGOrderFetchPayments).toHaveBeenCalled();
      expect(result).toEqual({ captured: true });
    });

    it('marks EXPIRED orders as failed', async () => {
      cf().PGFetchOrder.mockResolvedValue({
        data: { order_status: 'EXPIRED', order_amount: 299, order_currency: 'INR' },
      });
      const result = await paymentsService.reconcileOrder(createdPayment as any);
      expect(result).toEqual({ failed: true });
    });

    it('flags discrepancy on amount mismatch', async () => {
      cf().PGFetchOrder.mockResolvedValue({
        data: { order_status: 'PAID', order_amount: 1, order_currency: 'INR' },
      });
      const result = await paymentsService.reconcileOrder(createdPayment as any);
      expect(result).toEqual({ discrepancy: true });
    });

    it('terminates ACTIVE orders older than 20 minutes', async () => {
      cf().PGFetchOrder.mockResolvedValue({
        data: { order_status: 'ACTIVE', order_amount: 299, order_currency: 'INR' },
      });
      cf().PGTerminateOrder.mockResolvedValue({ data: { order_status: 'TERMINATION_REQUESTED' } });
      const stale = {
        ...createdPayment,
        createdAt: new Date(Date.now() - 25 * 60_000),
      };
      const result = await paymentsService.reconcileOrder(stale as any);
      expect(cf().PGTerminateOrder).toHaveBeenCalled();
      expect(result).toMatchObject({ pending: true, status: 'ACTIVE' });
    });
  });

  describe('withRateLimit', () => {
    beforeEach(() => {
      jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        if (typeof fn === 'function') fn();
        return 0 as any;
      });
    });

    afterEach(() => {
      (global.setTimeout as unknown as jest.Mock).mockRestore();
    });

    it('retries on 429 using x-ratelimit-retry', async () => {
      queueSelect(mockDb, [[profile], [paidPlan], [owner]]);
      cf()
        .PGCreateOrder.mockRejectedValueOnce({
          response: { status: 429, headers: { 'x-ratelimit-retry': '1' }, data: { type: 'rate_limit_error' } },
        })
        .mockResolvedValueOnce({
          data: { order_id: 'cf_order_1', payment_session_id: 'sess_1', order_status: 'ACTIVE' },
          headers: {},
        });
      const result = await paymentsService.createOrder('user-1', 'silver');
      expect(result.orderId).toBe('cf_order_1');
      expect(cf().PGCreateOrder).toHaveBeenCalledTimes(2);
    });

    it('throws after 3 failed 429 attempts', async () => {
      queueSelect(mockDb, [[profile], [paidPlan], [owner]]);
      cf().PGCreateOrder.mockRejectedValue({
        response: { status: 429, headers: { 'x-ratelimit-retry': '1' }, data: { type: 'rate_limit_error' } },
      });
      await expect(paymentsService.createOrder('user-1', 'silver')).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(cf().PGCreateOrder).toHaveBeenCalledTimes(3);
    });

    it('passes through non-429 errors immediately', async () => {
      queueSelect(mockDb, [[profile], [paidPlan], [owner]]);
      cf().PGCreateOrder.mockRejectedValue({ response: { status: 500, data: { message: 'nope' } } });
      await expect(paymentsService.createOrder('user-1', 'silver')).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(cf().PGCreateOrder).toHaveBeenCalledTimes(1);
    });
  });
});
