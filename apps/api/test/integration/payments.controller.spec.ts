import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from '../../src/payments/payments.controller';
import { PaymentsService } from '../../src/payments/payments.service';
import type { UserSession } from '@astalakshimi/types';

describe('Feature 4: Payments - PaymentsController (Integration Tests)', () => {
  let controller: PaymentsController;
  let paymentsService: jest.Mocked<PaymentsService>;

  const mockUserSession: UserSession = {
    userId: 'user-uuid-1',
    phone: '9876543210',
    role: 'member',
  };

  beforeEach(async () => {
    const mockPaymentsService = {
      createOrder: jest.fn(),
      verifyPayment: jest.fn(),
      getUserSubscription: jest.fn(),
      getUserInvoices: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    paymentsService = module.get(PaymentsService);
  });

  describe('POST /payments/orders', () => {
    it('should create an order for the selected plan', async () => {
      const expected = {
        orderId: 'order_123',
        amount: 29900,
        currency: 'INR',
        keyId: 'rzp_key',
        planId: 'plan-1',
        planSlug: 'silver',
        planName: 'Silver',
      };

      paymentsService.createOrder.mockResolvedValue(expected);

      const result = await controller.createOrder(mockUserSession, { planId: 'silver' });

      expect(paymentsService.createOrder).toHaveBeenCalledWith(
        mockUserSession.userId,
        'silver'
      );
      expect(result).toEqual(expected);
    });
  });

  describe('POST /payments/verify', () => {
    it('should verify payment signature and activate subscription', async () => {
      const body = {
        razorpayOrderId: 'order_123',
        razorpayPaymentId: 'pay_123',
        razorpaySignature: 'sig_123',
      };

      const expected = {
        success: true,
        planName: 'Silver',
        planSlug: 'silver',
      };

      paymentsService.verifyPayment.mockResolvedValue(expected);

      const result = await controller.verifyPayment(mockUserSession, body);

      expect(paymentsService.verifyPayment).toHaveBeenCalledWith(
        mockUserSession.userId,
        body.razorpayOrderId,
        body.razorpayPaymentId,
        body.razorpaySignature
      );
      expect(result).toEqual(expected);
    });
  });

  describe('GET /payments/subscription', () => {
    it('should return the user subscription', async () => {
      const expected = {
        id: 'sub-1',
        planId: 'silver',
        planSlug: 'silver',
        planName: 'Silver',
        status: 'active',
        startsAt: new Date(),
        expiresAt: new Date(),
      };

      paymentsService.getUserSubscription.mockResolvedValue(expected as any);

      const result = await controller.getSubscription(mockUserSession);

      expect(paymentsService.getUserSubscription).toHaveBeenCalledWith(mockUserSession.userId);
      expect(result).toEqual(expected);
    });
  });

  describe('GET /payments/invoices', () => {
    it('should return invoice list for user', async () => {
      const expected = [
        {
          id: 'pay-1',
          planId: 'silver',
          planName: 'Silver',
          amount: '₹299',
          method: 'Razorpay',
          status: 'paid',
          paidAt: new Date().toISOString(),
        },
      ];

      paymentsService.getUserInvoices.mockResolvedValue(expected);

      const result = await controller.getInvoices(mockUserSession);

      expect(paymentsService.getUserInvoices).toHaveBeenCalledWith(mockUserSession.userId);
      expect(result).toEqual(expected);
    });
  });
});
