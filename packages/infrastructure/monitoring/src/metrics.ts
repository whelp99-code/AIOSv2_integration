/**
 * Metrics Collector
 * 시스템 메트릭 수집기
 */

export interface MetricEntry {
  name: string;
  value: number;
  unit: string;
  tags?: Record<string, string>;
  timestamp: Date;
}

export interface MetricSummary {
  name: string;
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  last: number;
}

export class MetricsCollector {
  private metrics: MetricEntry[] = [];
  private maxMetrics: number;

  constructor(maxMetrics = 10000) {
    this.maxMetrics = maxMetrics;
  }

  record(name: string, value: number, unit: string, tags?: Record<string, string>): void {
    this.metrics.push({ name, value, unit, tags, timestamp: new Date() });
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  increment(name: string, tags?: Record<string, string>): void {
    this.record(name, 1, 'count', tags);
  }

  decrement(name: string, tags?: Record<string, string>): void {
    this.record(name, -1, 'count', tags);
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.record(name, value, 'gauge', tags);
  }

  timer(name: string, ms: number, tags?: Record<string, string>): void {
    this.record(name, ms, 'ms', tags);
  }

  histogram(name: string, value: number, tags?: Record<string, string>): void {
    this.record(name, value, 'histogram', tags);
  }

  getMetrics(name?: string, limit = 100): MetricEntry[] {
    const filtered = name ? this.metrics.filter((m) => m.name === name) : this.metrics;
    return filtered.slice(-limit);
  }

  getSummary(name: string): MetricSummary | null {
    const entries = this.metrics.filter((m) => m.name === name);
    if (entries.length === 0) return null;

    const values = entries.map((e) => e.value);
    return {
      name,
      count: entries.length,
      sum: values.reduce((a, b) => a + b, 0),
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      last: values[values.length - 1],
    };
  }

  getAllSummaries(): MetricSummary[] {
    const names = new Set(this.metrics.map((m) => m.name));
    return Array.from(names)
      .map((name) => this.getSummary(name))
      .filter((s): s is MetricSummary => s !== null);
  }

  getMetricNames(): string[] {
    return Array.from(new Set(this.metrics.map((m) => m.name)));
  }

  clear(): void {
    this.metrics = [];
  }

  size(): number {
    return this.metrics.length;
  }
}

/**
 * Timer utility for measuring async operations
 */
export async function timed<T>(
  collector: MetricsCollector,
  name: string,
  fn: () => Promise<T>,
  tags?: Record<string, string>,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    collector.timer(name, Date.now() - start, { ...tags, status: 'success' });
    return result;
  } catch (error) {
    collector.timer(name, Date.now() - start, { ...tags, status: 'error' });
    throw error;
  }
}
