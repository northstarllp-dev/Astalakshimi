import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { payments } from '@astalakshimi/database';
import { and, eq, lt } from 'drizzle-orm';
import { PaymentsService } from './payments.service';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Cron('*/10 * * * *')
  async reconcileStuckOrders() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60_000);

    const stuck = await this.db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.status, 'created'),
          eq(payments.provider, 'cashfree'),
          lt(payments.createdAt, fiveMinutesAgo),
        ),
      );

    for (const payment of stuck) {
      if (payment.createdAt < dayAgo) {
        await this.paymentsService.flagDiscrepancy(
          payment.id,
          null,
          'payment stuck >24h — needs manual review',
        );
        continue;
      }

      try {
        const result = await this.paymentsService.reconcileOrder(payment);
        if (result.captured) {
          this.logger.log(`Reconciliation captured order ${payment.providerOrderId}`);
        } else if (result.failed) {
          this.logger.log(`Reconciliation marked order ${payment.providerOrderId} as failed`);
        } else if (result.pending) {
          if (payment.createdAt < new Date(Date.now() - 30 * 60_000)) {
            await this.paymentsService.flagDiscrepancy(
              payment.id,
              null,
              'payment stuck >30 min',
            );
          }
        }
      } catch (err: any) {
        this.logger.error(`Reconciliation failed for ${payment.providerOrderId}`, err);
        await this.paymentsService.flagDiscrepancy(
          payment.id,
          null,
          `reconciliation error: ${err?.message || 'unknown'}`,
        );
      }
    }
  }
}
