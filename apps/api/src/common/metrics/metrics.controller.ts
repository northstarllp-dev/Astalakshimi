import { Controller, Get, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../decorators/public.decorator';
import { metrics, metricsAccessAllowed } from './latency-histogram';

type HeaderBag = { headers: Record<string, string | string[] | undefined> };

/**
 * Latency and process metrics.
 *
 *   GET /api/metrics              JSON snapshot with p50 / p95 / p99
 *   GET /api/metrics/prometheus   Prometheus text exposition
 *
 * Open when METRICS_TOKEN is unset. When it is set, send it as
 * `x-metrics-token` or `Authorization: Bearer <token>`.
 */
@Public()
@Controller('metrics')
export class MetricsController {
  @Get()
  summary(@Req() req: HeaderBag) {
    this.assertAllowed(req);
    return metrics.snapshot();
  }

  @Get('prometheus')
  prometheus(@Req() req: HeaderBag, @Res() res: Response) {
    this.assertAllowed(req);
    res.status(200).type('text/plain; version=0.0.4; charset=utf-8').send(metrics.toPrometheus());
  }

  private assertAllowed(req: HeaderBag) {
    if (!metricsAccessAllowed(req.headers)) {
      throw new UnauthorizedException();
    }
  }
}
