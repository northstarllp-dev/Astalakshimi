import { metrics, metricsAccessAllowed, percentileNearestRank } from '../../src/common/metrics/latency-histogram';
import { normalizePath, routeTemplate } from '../../src/common/metrics/metrics.middleware';
import { resolveDbPoolMax, resolveStatementTimeoutMs } from '../../src/database/pool-config';

describe('latency percentiles', () => {
  it('uses nearest-rank so p95 and p99 land on real samples', () => {
    const samples = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentileNearestRank(samples, 50)).toBe(50);
    expect(percentileNearestRank(samples, 95)).toBe(95);
    expect(percentileNearestRank(samples, 99)).toBe(99);
    expect(percentileNearestRank([], 99)).toBe(0);
    expect(percentileNearestRank([42], 99)).toBe(42);
  });

  it('reports p95 and p99 from the recent window and keeps 5xx separate', () => {
    metrics.reset();
    for (let i = 1; i <= 100; i++) {
      metrics.record('GET', '/api/search', i === 100 ? 500 : 200, i);
    }

    const snap = metrics.snapshot();
    expect(snap.http.count).toBe(100);
    expect(snap.http.errors).toBe(1);
    expect(snap.http.p50Ms).toBe(50);
    expect(snap.http.p95Ms).toBe(95);
    expect(snap.http.p99Ms).toBe(99);

    const search = snap.http.routes.find((r) => r.route === '/api/search');
    expect(search?.p95Ms).toBe(95);
    expect(search?.p99Ms).toBe(99);

    const text = metrics.toPrometheus();
    expect(text).toContain('http_request_latency_ms{method="GET",route="/api/search",quantile="0.95"} 95');
    expect(text).toContain('http_request_latency_ms{method="GET",route="/api/search",quantile="0.99"} 99');
    expect(text).toContain('http_request_errors_total{method="GET",route="/api/search"} 1');
    expect(text).toContain('nodejs_eventloop_lag_p99_ms');
  });

  it('drops samples older than the 1024-wide window', () => {
    metrics.reset();
    for (let i = 0; i < 1024; i++) metrics.record('GET', '/api/health', 200, 5);
    for (let i = 0; i < 1024; i++) metrics.record('GET', '/api/health', 200, 800);

    const snap = metrics.snapshot();
    expect(snap.http.samples).toBe(1024);
    expect(snap.http.p50Ms).toBe(800);
    expect(snap.http.p99Ms).toBe(800);
    expect(snap.http.count).toBe(2048);
    expect(snap.http.maxMs).toBe(800);
  });

  it('keeps database operations out of the http route list', () => {
    metrics.reset();
    metrics.record('DB', 'search.query', 200, 40);
    metrics.record('GET', '/api/search', 200, 80);

    const snap = metrics.snapshot();
    expect(snap.http.routes.map((r) => r.route)).toEqual(['/api/search']);
    expect(snap.db.operations.map((r) => r.route)).toEqual(['search.query']);
    expect(snap.db.p99Ms).toBe(40);
    expect(metrics.toPrometheus()).toContain('db_operation_latency_ms{method="DB",route="search.query",quantile="0.99"} 40');
  });

  it('caps route cardinality', () => {
    metrics.reset();
    for (let i = 0; i < 250; i++) metrics.record('GET', `/api/r/${i}`, 200, 10);
    const snap = metrics.snapshot();
    expect(snap.http.routes.length).toBeLessThanOrEqual(201);
    expect(snap.http.routes.some((r) => r.route === 'other')).toBe(true);
    expect(snap.http.count).toBe(250);
  });
});

describe('metrics access', () => {
  it('is open when no token is configured', () => {
    expect(metricsAccessAllowed({}, '')).toBe(true);
  });

  it('accepts the token header or a bearer token', () => {
    expect(metricsAccessAllowed({ 'x-metrics-token': 'secret' }, 'secret')).toBe(true);
    expect(metricsAccessAllowed({ authorization: 'Bearer secret' }, 'secret')).toBe(true);
    expect(metricsAccessAllowed({ authorization: 'Bearer nope' }, 'secret')).toBe(false);
    expect(metricsAccessAllowed({ 'x-metrics-token': 'secret-extra' }, 'secret')).toBe(false);
  });
});

describe('route labels', () => {
  it('prefers the express route template and collapses raw ids', () => {
    expect(routeTemplate({ method: 'get', route: { path: '/api/profiles/:id' } })).toEqual({
      method: 'GET',
      route: '/api/profiles/:id',
    });
    expect(
      normalizePath('/api/profiles/11111111-1111-4111-8111-111111111111/photos/42?x=1'),
    ).toBe('/api/profiles/:id/photos/:n');
  });
});

describe('pool config', () => {
  it('defaults the pool to 20 and clamps bad values', () => {
    expect(resolveDbPoolMax(undefined)).toBe(20);
    expect(resolveDbPoolMax('')).toBe(20);
    expect(resolveDbPoolMax('8')).toBe(8);
    expect(resolveDbPoolMax('0')).toBe(20);
    expect(resolveDbPoolMax('5000')).toBe(100);
    expect(resolveStatementTimeoutMs(undefined)).toBe(15_000);
    expect(resolveStatementTimeoutMs('0')).toBe(0);
    expect(resolveStatementTimeoutMs('-1')).toBe(15_000);
  });
});
