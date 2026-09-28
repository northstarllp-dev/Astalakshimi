import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { metrics } from './latency-histogram';

type Req = {
  id?: string;
  method?: string;
  url?: string;
  originalUrl?: string;
  baseUrl?: string;
  route?: { path?: string };
};

type Res = {
  statusCode?: number;
  headersSent?: boolean;
  setHeader(name: string, value: string): void;
  once(event: string, cb: () => void): void;
  end: (...args: any[]) => any;
};

function slowRequestMs(): number {
  const n = Number(process.env.SLOW_REQUEST_MS ?? 500);
  return Number.isFinite(n) && n >= 0 ? n : 500;
}

/** Collapse ids so unmatched paths cannot blow up the route cardinality. */
export function normalizePath(path: string): string {
  const pathname = path.split('?')[0] || '/';
  return pathname
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:n');
}

export function routeTemplate(req: Req): { method: string; route: string } {
  const method = (req.method || 'GET').toUpperCase();
  const expressRoute = req.route?.path;
  if (expressRoute) {
    const base = req.baseUrl ?? '';
    if (!base || expressRoute.startsWith(base)) return { method, route: expressRoute };
    const joined = `${base}${expressRoute.startsWith('/') ? expressRoute : `/${expressRoute}`}`;
    return { method, route: joined.replace(/\/{2,}/g, '/') };
  }
  const raw = req.originalUrl || req.url || 'unmatched';
  return { method, route: normalizePath(raw) };
}

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HttpMetrics');

  use(req: Req, res: Res, next: () => void): void {
    const started = performance.now();
    const originalEnd = res.end;
    res.end = (...args: any[]) => {
      const duration = performance.now() - started;
      if (!res.headersSent) {
        res.setHeader('Server-Timing', `app;dur=${duration.toFixed(1)}`);
        res.setHeader('x-response-time', `${Math.round(duration)}ms`);
      }
      return originalEnd.apply(res, args);
    };

    let recorded = false;
    const record = () => {
      if (recorded) return;
      recorded = true;
      const duration = performance.now() - started;
      const { method, route } = routeTemplate(req);
      if (route.includes('/metrics')) return;
      const status = res.statusCode || 0;
      metrics.record(method, route, status, duration);
      if (duration >= slowRequestMs()) {
        this.logger.warn(
          `${method} ${route} ${status} ${duration.toFixed(1)}ms requestId=${req.id ?? '-'}`,
        );
      }
    };

    res.once('finish', record);
    res.once('close', record);
    next();
  }
}
