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

export class MetricsCollector {
  private metrics: MetricEntry[] = [];

  record(name: string, value: number, unit: string, tags?: Record<string, string>): void {
    this.metrics.push({ name, value, unit, tags, timestamp: new Date() });
  }

  increment(name: string, tags?: Record<string, string>): void {
    this.record(name, 1, 'count', tags);
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.record(name, value, 'gauge', tags);
  }

  timer(name: string, ms: number, tags?: Record<string, string>): void {
    this.record(name, ms, 'ms', tags);
  }

  getMetrics(name?: string, limit = 100): MetricEntry[] {
    const filtered = name ? this.metrics.filter((m) => m.name === name) : this.metrics;
    return filtered.slice(-limit);
  }
}
