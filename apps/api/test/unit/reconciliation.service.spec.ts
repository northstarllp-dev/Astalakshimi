import { ReconciliationService } from '../../src/payments/reconciliation.service';
import { PaymentsService } from '../../src/payments/payments.service';

jest.mock('@nestjs/schedule', () => ({
  Cron: () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) => descriptor,
}));

describe('ReconciliationService', () => {
  let service: ReconciliationService;
  let mockDb: { select: jest.Mock };
  let paymentsService: {
    reconcileOrder: jest.Mock;
    flagDiscrepancy: jest.Mock;
  };

  const createdAt = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000);

  function selectReturning(rows: unknown[]) {
    const q: Record<string, jest.Mock> = {
      from: jest.fn(),
      where: jest.fn(),
      limit: jest.fn(),
    };
    q.from.mockReturnValue(q);
    q.where.mockReturnValue(q);
    q.limit.mockResolvedValue(rows);
    Object.assign(q, {
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve(rows).then(resolve, reject),
    });
    return q;
  }

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
    };
    paymentsService = {
      reconcileOrder: jest.fn(),
      flagDiscrepancy: jest.fn().mockResolvedValue(undefined),
    };
    service = new ReconciliationService(mockDb as any, paymentsService as unknown as PaymentsService);
  });

  it('skips orders newer than 5 minutes by only querying older created rows', async () => {
    mockDb.select.mockReturnValue(selectReturning([]));
    await service.reconcileStuckOrders();
    expect(paymentsService.reconcileOrder).not.toHaveBeenCalled();
  });

  it('flags orders stuck more than 24 hours for manual review', async () => {
    const old = {
      id: 'pay-old',
      providerOrderId: 'cf_old',
      createdAt: createdAt(25 * 60),
    };
    mockDb.select.mockReturnValue(selectReturning([old]));
    await service.reconcileStuckOrders();
    expect(paymentsService.flagDiscrepancy).toHaveBeenCalledWith(
      'pay-old',
      null,
      'payment stuck >24h — needs manual review',
    );
    expect(paymentsService.reconcileOrder).not.toHaveBeenCalled();
  });

  it('flags pending orders older than 30 minutes', async () => {
    const stuck = {
      id: 'pay-stuck',
      providerOrderId: 'cf_stuck',
      createdAt: createdAt(40),
    };
    mockDb.select.mockReturnValue(selectReturning([stuck]));
    paymentsService.reconcileOrder.mockResolvedValue({ pending: true, status: 'ACTIVE' });
    await service.reconcileStuckOrders();
    expect(paymentsService.reconcileOrder).toHaveBeenCalledWith(stuck);
    expect(paymentsService.flagDiscrepancy).toHaveBeenCalledWith(
      'pay-stuck',
      null,
      'payment stuck >30 min',
    );
  });

  it('logs captured and failed outcomes without extra discrepancy', async () => {
    const paid = {
      id: 'pay-paid',
      providerOrderId: 'cf_paid',
      createdAt: createdAt(10),
    };
    mockDb.select.mockReturnValue(selectReturning([paid]));
    paymentsService.reconcileOrder.mockResolvedValue({ captured: true });
    await service.reconcileStuckOrders();
    expect(paymentsService.flagDiscrepancy).not.toHaveBeenCalled();
  });
});
