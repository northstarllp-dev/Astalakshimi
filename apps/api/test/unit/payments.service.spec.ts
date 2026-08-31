import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from '../../src/payments/payments.service';
import { payments, subscriptions, plans, profiles } from '@astalakshimi/database';
import * as crypto from 'crypto';

jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn().mockResolvedValue({
        id: 'order_mock_123',
        amount: 29900,
        currency: 'INR',
      }),
    },
  }));
});

describe('Feature 4: Payments & Subscriptions - PaymentsService (Unit Tests)', () => {
  let paymentsService: PaymentsService;
  let mockDb: any;
  let mockConfigService: any;

  const mockSecret = 'test_real_secret_2026';

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'RAZORPAY_KEY_ID') return 'rzp_test_key123';
        if (key === 'RAZORPAY_KEY_SECRET') return mockSecret;
        return null;
      }),
    };

    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    };

    paymentsService = new PaymentsService(mockDb, mockConfigService);
  });

  describe('createOrder', () => {
    it('should throw NotFoundException if user has no profile', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      await expect(
        paymentsService.createOrder('user-no-profile', 'silver')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if requested plan is not found', async () => {
      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([{ id: 'prof-1', userId: 'user-1' }]),
          };
        } else {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]),
          };
        }
      });

      await expect(
        paymentsService.createOrder('user-1', 'non-existent-plan')
      ).rejects.toThrow("Plan 'non-existent-plan' not found");
    });

    it('should automatically activate free plan (price = 0) without creating Razorpay order', async () => {
      const mockProfile = { id: 'prof-1', userId: 'user-1' };
      const freePlan = {
        id: 'free-plan-uuid',
        slug: 'free',
        name: 'Free',
        pricePaise: 0,
        durationDays: 36500,
      };

      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([mockProfile]),
          };
        } else {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([freePlan]),
          };
        }
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      const mockValues = jest.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({ values: mockValues });

      const result = await paymentsService.createOrder('user-1', 'free');

      expect(result).toEqual({
        freeActivated: true,
        planId: 'free-plan-uuid',
        planSlug: 'free',
        planName: 'Free',
        amount: 0,
        currency: 'INR',
      });

      expect(mockDb.update).toHaveBeenCalledWith(subscriptions);
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          planId: 'free-plan-uuid',
          status: 'active',
        })
      );
    });

    it('should create order and record payment row in database for a paid plan (e.g. Silver)', async () => {
      const mockProfile = { id: 'prof-12345678', userId: 'user-1' };
      const silverPlan = {
        id: 'silver-plan-uuid',
        slug: 'silver',
        name: 'Silver',
        pricePaise: 29900,
        durationDays: 90,
      };

      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([mockProfile]),
          };
        } else {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([silverPlan]),
          };
        }
      });

      const mockValues = jest.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({ values: mockValues });

      const result = await paymentsService.createOrder('user-1', 'silver');

      expect(result.amount).toBe(29900);
      expect(result.currency).toBe('INR');
      expect(result.planSlug).toBe('silver');
      expect(result.planName).toBe('Silver');
      expect(result.orderId).toBeDefined();

      expect(mockDb.insert).toHaveBeenCalledWith(payments);
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          planId: 'silver-plan-uuid',
          amountPaise: 29900,
          currency: 'INR',
          provider: 'razorpay',
          status: 'created',
        })
      );
    });
  });

  describe('verifyPayment', () => {
    it('should throw BadRequestException if signature is invalid', async () => {
      await expect(
        paymentsService.verifyPayment(
          'user-1',
          'order_123',
          'pay_123',
          'completely_invalid_signature'
        )
      ).rejects.toThrow('Invalid payment signature');
    });

    it('should throw NotFoundException if payment record does not exist', async () => {
      const orderId = 'order_123';
      const paymentId = 'pay_123';
      const validSignature = crypto
        .createHmac('sha256', mockSecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      await expect(
        paymentsService.verifyPayment('user-1', orderId, paymentId, validSignature)
      ).rejects.toThrow('Payment record not found');
    });

    it('should successfully verify payment, mark captured, and activate new subscription', async () => {
      const orderId = 'order_valid_123';
      const paymentId = 'pay_valid_456';
      const validSignature = crypto
        .createHmac('sha256', mockSecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const paymentRecord = {
        id: 'payment-row-uuid',
        userId: 'user-1',
        planId: 'gold-plan-uuid',
        status: 'created',
        amountPaise: 49900,
      };

      const goldPlan = {
        id: 'gold-plan-uuid',
        name: 'Gold',
        slug: 'gold',
        durationDays: 180,
      };

      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          // payments select
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([paymentRecord]),
          };
        } else {
          // plans select
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([goldPlan]),
          };
        }
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      const mockInsertValues = jest.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({ values: mockInsertValues });

      const result = await paymentsService.verifyPayment(
        'user-1',
        orderId,
        paymentId,
        validSignature
      );

      expect(result).toEqual({
        success: true,
        planName: 'Gold',
        planSlug: 'gold',
      });

      // Verifies old subscriptions are marked expired
      expect(mockDb.update).toHaveBeenCalledWith(subscriptions);

      // Verifies new subscription is inserted
      expect(mockDb.insert).toHaveBeenCalledWith(subscriptions);
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          planId: 'gold-plan-uuid',
          paymentId: 'payment-row-uuid',
          status: 'active',
        })
      );
    });

    it('should return already processed if payment was already captured (idempotency)', async () => {
      const orderId = 'order_captured_123';
      const paymentId = 'pay_captured_456';
      const validSignature = crypto
        .createHmac('sha256', mockSecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const paymentRecord = {
        id: 'payment-row-uuid',
        status: 'captured',
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([paymentRecord]),
      });

      const result = await paymentsService.verifyPayment(
        'user-1',
        orderId,
        paymentId,
        validSignature
      );

      expect(result).toEqual({
        success: true,
        message: 'Payment already processed',
      });
    });
  });

  describe('getUserSubscription', () => {
    it('should return Free plan details when no active subscription is present', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      const sub = await paymentsService.getUserSubscription('user-1');

      expect(sub).toEqual({
        id: 'free',
        planId: 'free',
        planSlug: 'free',
        planName: 'Free',
        status: 'active',
        startsAt: null,
        expiresAt: null,
      });
    });

    it('should return active paid subscription details when found', async () => {
      const activeRecord = {
        id: 'sub-uuid-1',
        planId: 'gold-uuid',
        status: 'active',
        startsAt: new Date('2026-01-01'),
        expiresAt: new Date('2026-07-01'),
        plan: {
          id: 'gold-uuid',
          slug: 'gold',
          name: 'Gold',
        },
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([activeRecord]),
      });

      const sub = await paymentsService.getUserSubscription('user-1');

      expect(sub.id).toBe('sub-uuid-1');
      expect(sub.planSlug).toBe('gold');
      expect(sub.planName).toBe('Gold');
      expect(sub.status).toBe('active');
    });
  });

  describe('activateDemoPlan', () => {
    it('should refuse demo activation in production', async () => {
      const original = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        await expect(paymentsService.activateDemoPlan('user-1', 'silver')).rejects.toThrow(
          'Demo plan activation is disabled in production.'
        );
      } finally {
        process.env.NODE_ENV = original;
      }
    });

    it('should capture a demo payment and activate the plan', async () => {
      const silverPlan = {
        id: 'silver-plan-uuid',
        slug: 'silver',
        name: 'Silver',
        pricePaise: 29900,
        durationDays: 90,
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([silverPlan]),
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      let insertCount = 0;
      mockDb.insert.mockImplementation(() => {
        insertCount++;
        if (insertCount === 1) {
          return {
            values: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([{ id: 'pay-demo-1' }]),
            }),
          };
        }
        return { values: jest.fn().mockResolvedValue(undefined) };
      });

      const result = await paymentsService.activateDemoPlan('user-1', 'silver');

      expect(result).toEqual({
        success: true,
        demoActivated: true,
        planName: 'Silver',
        planSlug: 'silver',
      });
      expect(mockDb.insert).toHaveBeenCalledWith(payments);
      expect(mockDb.insert).toHaveBeenCalledWith(subscriptions);
      expect(mockDb.update).toHaveBeenCalledWith(subscriptions);
    });
  });

  describe('getUserInvoices', () => {
    it('should return formatted invoices for captured payments', async () => {
      const mockPaymentRows = [
        {
          id: 'pay-1',
          amountPaise: 49900,
          currency: 'INR',
          status: 'captured',
          provider: 'razorpay',
          providerOrderId: 'order_123',
          createdAt: new Date('2026-03-01T10:00:00Z'),
          planName: 'Gold',
          planSlug: 'gold',
        },
      ];

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(mockPaymentRows),
      });

      const invoices = await paymentsService.getUserInvoices('user-1');

      expect(invoices.length).toBe(1);
      expect(invoices[0].amount).toBe('₹499');
      expect(invoices[0].method).toBe('Razorpay');
      expect(invoices[0].status).toBe('paid');
      expect(invoices[0].planName).toBe('Gold');
    });
  });
});
