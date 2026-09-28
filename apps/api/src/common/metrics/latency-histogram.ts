import { monitorEventLoopDelay, type IntervalHistogram } from 'perf_hooks';
import { timingSafeEqual } from 'crypto';
import { resolveDbPoolMax } from '../../database/pool-config';

/** Upper bounds for the lifetime histogram, in milliseconds. The last bucket is +Inf. */
export const LATENCY_BUCKET_BOUNDS_MS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000] as const;

const RING_CAPACITY = 1024;
const MAX_ROUTE_SERIES = 200;

export type LatencySample = {
  method: string;
  route: string;
  count: number;
  errors: number;
  avgMs: number;
  samples: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
};

type Series = {
  method: string;
  route: string;
  buckets: number[];
  sumMs: number;
  count: number;
  errors: number;
  maxMs: number;
  ring: Float64Array;
  ringCount: number;
  ringPos: number;
};

function emptySeries(method: string, route: string): Series {
  return {
    method,
    route,
    buckets: new Array(LATENCY_BUCKET_BOUNDS_MS.length + 1).fill(0),
    sumMs: 0,
    count: 0,
    errors: 0,
    maxMs: 0,
    ring: new Float64Array(RING_CAPACITY),
    ringCount: 0,
    ringPos: 0,
  };
}

/** Nearest-rank percentile. `sortedAsc` must already be sorted ascending. `p` is 0–100. */
export function percentileNearestRank(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const rank = Math.ceil((p / 100) * sortedAsc.length) - 1;
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, rank));
  return sortedAsc[idx];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function summarize(series: Series): LatencySample {
  const occupied = series.ringCount;
  const values: number[] = [];
  for (let i = 0; i < occupied; i++) values.push(series.ring[i]);
  values.sort((a, b) => a - b);
  return {
    method: series.method,
    route: series.route,
    count: series.count,
    errors: series.errors,
    avgMs: series.count === 0 ? 0 : round1(series.sumMs / series.count),
    samples: occupied,
    p50Ms: round1(percentileNearestRank(values, 50)),
    p95Ms: round1(percentileNearestRank(values, 95)),
    p99Ms: round1(percentileNearestRank(values, 99)),
    maxMs: round1(series.maxMs),
  };
}

function observe(series: Series, status: number, durationMs: number): void {
  const duration = durationMs < 0 || !Number.isFinite(durationMs) ? 0 : durationMs;
  series.count += 1;
  series.sumMs += duration;
  if (duration > series.maxMs) series.maxMs = duration;
  if (status >= 500) series.errors += 1;

  let bucket: number = LATENCY_BUCKET_BOUNDS_MS.length;
  for (let i = 0; i < LATENCY_BUCKET_BOUNDS_MS.length; i++) {
    if (duration <= LATENCY_BUCKET_BOUNDS_MS[i]) {
      bucket = i;
      break;
    }
  }
  series.buckets[bucket] += 1;

  series.ring[series.ringPos] = duration;
  series.ringPos = (series.ringPos + 1) % RING_CAPACITY;
  if (series.ringCount < RING_CAPACITY) series.ringCount += 1;
}

function escapeLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
}

function nanosToMs(ns: number): number {
  return round1(ns / 1e6);
}

export function safeTokenEqual(presented: string | undefined, expected: string): boolean {
  if (!presented) return false;
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function metricsAccessAllowed(
  headers: Record<string, string | string[] | undefined>,
  token = process.env.METRICS_TOKEN,
): boolean {
  const expected = token?.trim();
  if (!expected) return true;
  const header = headers['x-metrics-token'];
  const presented = Array.isArray(header) ? header[0] : header;
  const auth = headers.authorization;
  const authValue = Array.isArray(auth) ? auth[0] : auth;
  const bearer = authValue?.startsWith('Bearer ') ? authValue.slice('Bearer '.length) : undefined;
  return safeTokenEqual(presented, expected) || safeTokenEqual(bearer, expected);
}

/**
 * In-process latency registry.
 *
 * p50/p95/p99 are nearest-rank over the last 1024 samples per route (the
 * recent window). The Prometheus histogram is cumulative for the process
 * lifetime, so a scraper can also compute quantiles with histogram_quantile.
 * Single-instance: each task reports its own window. Aggregate across tasks
 * in the scraper, not here.
 */
function clearSeries(series: Series): void {
  series.buckets.fill(0);
  series.sumMs = 0;
  series.count = 0;
  series.errors = 0;
  series.maxMs = 0;
  series.ring.fill(0);
  series.ringCount = 0;
  series.ringPos = 0;
}

export class LatencyRegistry {
  private readonly httpTotal = emptySeries('*', '*');
  private readonly dbTotal = emptySeries('DB', '*');
  private readonly httpRoutes = new Map<string, Series>();
  private readonly dbRoutes = new Map<string, Series>();
  private readonly eventLoop: IntervalHistogram;

  constructor() {
    this.eventLoop = monitorEventLoopDelay({ resolution: 20 });
    this.eventLoop.enable();
    // Keep the lag histogram on a one-minute window without tying it to scrapes.
    const timer = setInterval(() => this.eventLoop.reset(), 60_000);
    timer.unref();
  }

  reset(): void {
    clearSeries(this.httpTotal);
    clearSeries(this.dbTotal);
    this.httpRoutes.clear();
    this.dbRoutes.clear();
    this.eventLoop.reset();
  }

  record(method: string, route: string, status: number, durationMs: number): void {
    const isDb = method === 'DB';
    const totals = isDb ? this.dbTotal : this.httpTotal;
    const routes = isDb ? this.dbRoutes : this.httpRoutes;
    observe(totals, status, durationMs);

    const key = `${method} ${route}`;
    let series = routes.get(key);
    if (!series) {
      if (routes.size >= MAX_ROUTE_SERIES) {
        const overflowKey = 'other';
        series = routes.get(overflowKey);
        if (!series) {
          series = emptySeries(isDb ? 'DB' : 'OTHER', 'other');
          routes.set(overflowKey, series);
        }
      } else {
        series = emptySeries(method, route);
        routes.set(key, series);
      }
    }
    observe(series, status, durationMs);
  }

  private processStats() {
    const mem = process.memoryUsage();
    return {
      uptimeSec: round1(process.uptime()),
      rssMb: round1(mem.rss / (1024 * 1024)),
      heapUsedMb: round1(mem.heapUsed / (1024 * 1024)),
      eventLoopLagMeanMs: nanosToMs(this.eventLoop.mean),
      eventLoopLagP99Ms: nanosToMs(this.eventLoop.percentile(99)),
    };
  }

  snapshot() {
    const byLatency = (a: LatencySample, b: LatencySample) => b.p99Ms - a.p99Ms || b.count - a.count;
    return {
      windowSamples: RING_CAPACITY,
      generatedAt: new Date().toISOString(),
      process: this.processStats(),
      http: {
        ...summarize(this.httpTotal),
        routes: [...this.httpRoutes.values()].map(summarize).sort(byLatency),
      },
      db: {
        ...summarize(this.dbTotal),
        operations: [...this.dbRoutes.values()].map(summarize).sort(byLatency),
      },
    };
  }

  toPrometheus(): string {
    const lines: string[] = [];
    const httpSeries = [this.httpTotal, ...this.httpRoutes.values()];
    const dbSeries = [this.dbTotal, ...this.dbRoutes.values()];

    lines.push('# HELP http_request_duration_ms Lifetime request latency histogram.');
    lines.push('# TYPE http_request_duration_ms histogram');
    for (const s of httpSeries) this.writeHistogram(lines, 'http_request_duration_ms', s);

    lines.push('# HELP db_operation_duration_ms Lifetime database operation latency histogram.');
    lines.push('# TYPE db_operation_duration_ms histogram');
    for (const s of dbSeries) this.writeHistogram(lines, 'db_operation_duration_ms', s);

    lines.push('# HELP http_request_latency_ms Recent-window latency over the last 1024 samples.');
    lines.push('# TYPE http_request_latency_ms gauge');
    for (const s of httpSeries) this.writeQuantiles(lines, 'http_request_latency_ms', s);

    lines.push('# HELP db_operation_latency_ms Recent-window database operation latency.');
    lines.push('# TYPE db_operation_latency_ms gauge');
    for (const s of dbSeries) this.writeQuantiles(lines, 'db_operation_latency_ms', s);

    lines.push('# HELP http_requests_total Lifetime request count.');
    lines.push('# TYPE http_requests_total counter');
    lines.push('# HELP http_request_errors_total Lifetime 5xx count.');
    lines.push('# TYPE http_request_errors_total counter');
    for (const s of httpSeries) {
      const labels = `method="${escapeLabel(s.method)}",route="${escapeLabel(s.route)}"`;
      lines.push(`http_requests_total{${labels}} ${s.count}`);
      lines.push(`http_request_errors_total{${labels}} ${s.errors}`);
    }

    const mem = process.memoryUsage();
    const lag = this.processStats();
    lines.push('# HELP process_resident_memory_bytes Resident set size.');
    lines.push('# TYPE process_resident_memory_bytes gauge');
    lines.push(`process_resident_memory_bytes ${mem.rss}`);
    lines.push('# HELP process_heap_used_bytes V8 heap used.');
    lines.push('# TYPE process_heap_used_bytes gauge');
    lines.push(`process_heap_used_bytes ${mem.heapUsed}`);
    lines.push('# HELP nodejs_eventloop_lag_p99_ms Event-loop delay p99 over the current one-minute window.');
    lines.push('# TYPE nodejs_eventloop_lag_p99_ms gauge');
    lines.push(`nodejs_eventloop_lag_p99_ms ${lag.eventLoopLagP99Ms}`);
    lines.push('# HELP nodejs_eventloop_lag_mean_ms Event-loop delay mean over the current one-minute window.');
    lines.push('# TYPE nodejs_eventloop_lag_mean_ms gauge');
    lines.push(`nodejs_eventloop_lag_mean_ms ${lag.eventLoopLagMeanMs}`);
    lines.push('# HELP db_pool_max Configured Postgres pool size for this process.');
    lines.push('# TYPE db_pool_max gauge');
    lines.push(`db_pool_max ${resolveDbPoolMax()}`);

    return `${lines.join('\n')}\n`;
  }

  private writeHistogram(lines: string[], name: string, series: Series): void {
    let cumulative = 0;
    const labels = `method="${escapeLabel(series.method)}",route="${escapeLabel(series.route)}"`;
    for (let i = 0; i < LATENCY_BUCKET_BOUNDS_MS.length; i++) {
      cumulative += series.buckets[i];
      lines.push(`${name}_bucket{${labels},le="${LATENCY_BUCKET_BOUNDS_MS[i]}"} ${cumulative}`);
    }
    cumulative += series.buckets[LATENCY_BUCKET_BOUNDS_MS.length];
    lines.push(`${name}_bucket{${labels},le="+Inf"} ${cumulative}`);
    lines.push(`${name}_sum{${labels}} ${series.sumMs.toFixed(3)}`);
    lines.push(`${name}_count{${labels}} ${series.count}`);
  }

  private writeQuantiles(lines: string[], name: string, series: Series): void {
    const sample = summarize(series);
    const labels = `method="${escapeLabel(series.method)}",route="${escapeLabel(series.route)}"`;
    lines.push(`${name}{${labels},quantile="0.5"} ${sample.p50Ms}`);
    lines.push(`${name}{${labels},quantile="0.95"} ${sample.p95Ms}`);
    lines.push(`${name}{${labels},quantile="0.99"} ${sample.p99Ms}`);
  }
}

export const metrics = new LatencyRegistry();

export async function observeDb<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  let status = 200;
  try {
    return await fn();
  } catch (err) {
    status = 500;
    throw err;
  } finally {
    metrics.record('DB', operation, status, performance.now() - start);
  }
}
