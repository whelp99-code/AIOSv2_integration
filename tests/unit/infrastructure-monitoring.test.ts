import { describe, expect, it, beforeEach } from 'vitest';
import { LangfuseMonitor, MetricsCollector, timed } from '../../packages/infrastructure/monitoring/src/index';

describe('LangfuseMonitor', () => {
  let monitor: LangfuseMonitor;

  beforeEach(() => {
    monitor = new LangfuseMonitor({
      publicKey: 'pk-test',
      secretKey: 'sk-test',
      baseUrl: 'https://test.langfuse.com',
    });
  });

  it('should report configured when keys are set', () => {
    expect(monitor.isConfigured()).toBe(true);
  });

  it('should report not configured when keys are missing', () => {
    const unconfigured = new LangfuseMonitor();
    expect(unconfigured.isConfigured()).toBe(false);
  });

  it('should create and track traces', () => {
    const trace = monitor.createTrace('test-trace', { key: 'value' }, { input: 'data' });
    expect(trace.id).toMatch(/^trace_/);
    expect(trace.name).toBe('test-trace');
    expect(trace.metadata).toEqual({ key: 'value' });
    expect(trace.input).toEqual({ input: 'data' });
    expect(trace.startTime).toBeInstanceOf(Date);

    const traces = monitor.getTraces();
    expect(traces).toHaveLength(1);
    expect(traces[0].id).toBe(trace.id);
  });

  it('should end a trace with output and status', () => {
    const trace = monitor.createTrace('my-trace');
    monitor.endTrace(trace.id, { result: 'ok' }, 'success');

    const updated = monitor.getTraces()[0];
    expect(updated.endTime).toBeInstanceOf(Date);
    expect(updated.output).toEqual({ result: 'ok' });
    expect(updated.status).toBe('success');
  });

  it('should create and end generations', () => {
    const trace = monitor.createTrace('gen-trace');
    const gen = monitor.createGeneration(trace.id, 'llm-call', 'gpt-4', 'Hello');
    expect(gen.id).toMatch(/^gen_/);
    expect(gen.traceId).toBe(trace.id);
    expect(gen.model).toBe('gpt-4');

    monitor.endGeneration(gen.id, 'World', { promptTokens: 10, completionTokens: 5 });

    const gens = monitor.getGenerations(trace.id);
    expect(gens).toHaveLength(1);
    expect(gens[0].output).toBe('World');
    expect(gens[0].usage?.promptTokens).toBe(10);
  });

  it('should create and end spans', () => {
    const trace = monitor.createTrace('span-trace');
    const span = monitor.createSpan(trace.id, 'db-query', 'SELECT *');
    expect(span.id).toMatch(/^span_/);

    monitor.endSpan(span.id, 'rows: 5');

    const spans = monitor.getSpans(trace.id);
    expect(spans).toHaveLength(1);
    expect(spans[0].output).toBe('rows: 5');
  });

  it('should create scores', () => {
    const trace = monitor.createTrace('score-trace');
    const score = monitor.createScore(trace.id, 'quality', 0.95, 'Very good');
    expect(score.id).toMatch(/^score_/);
    expect(score.value).toBe(0.95);

    const scores = monitor.getScores(trace.id);
    expect(scores).toHaveLength(1);
  });

  it('should manage event queue', () => {
    monitor.createTrace('queued-trace');
    expect(monitor.getEventQueueSize()).toBe(1);
  });

  it('should flush when not configured returns success false', async () => {
    const unconfigured = new LangfuseMonitor();
    const result = await unconfigured.flush();
    expect(result.success).toBe(false);
    expect(result.sent).toBe(0);
  });

  it('should filter generations and spans by traceId', () => {
    const t1 = monitor.createTrace('t1');
    const t2 = monitor.createTrace('t2');
    monitor.createGeneration(t1.id, 'g1');
    monitor.createGeneration(t2.id, 'g2');
    monitor.createGeneration(t1.id, 'g3');

    expect(monitor.getGenerations(t1.id)).toHaveLength(2);
    expect(monitor.getGenerations(t2.id)).toHaveLength(1);
    expect(monitor.getGenerations()).toHaveLength(3);
  });

  it('should respect limit parameter', () => {
    for (let i = 0; i < 10; i++) {
      monitor.createTrace(`trace-${i}`);
    }
    expect(monitor.getTraces(5)).toHaveLength(5);
  });
});

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  it('should record metrics', () => {
    collector.record('requests', 1, 'count', { endpoint: '/api' });
    const metrics = collector.getMetrics('requests');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].name).toBe('requests');
    expect(metrics[0].value).toBe(1);
    expect(metrics[0].tags).toEqual({ endpoint: '/api' });
  });

  it('should increment and decrement', () => {
    collector.increment('counter');
    collector.increment('counter');
    collector.decrement('counter');
    expect(collector.getMetrics('counter')).toHaveLength(3);
  });

  it('should record gauge values', () => {
    collector.gauge('cpu', 75.5);
    expect(collector.getMetrics('cpu')[0].value).toBe(75.5);
    expect(collector.getMetrics('cpu')[0].unit).toBe('gauge');
  });

  it('should record timer values', () => {
    collector.timer('latency', 150);
    expect(collector.getMetrics('latency')[0].unit).toBe('ms');
  });

  it('should record histogram values', () => {
    collector.histogram('response_size', 1024);
    expect(collector.getMetrics('response_size')[0].unit).toBe('histogram');
  });

  it('should compute summary statistics', () => {
    collector.record('test', 10, 'ms');
    collector.record('test', 20, 'ms');
    collector.record('test', 30, 'ms');

    const summary = collector.getSummary('test');
    expect(summary).not.toBeNull();
    expect(summary!.count).toBe(3);
    expect(summary!.sum).toBe(60);
    expect(summary!.min).toBe(10);
    expect(summary!.max).toBe(30);
    expect(summary!.avg).toBe(20);
    expect(summary!.last).toBe(30);
  });

  it('should return null summary for nonexistent metric', () => {
    expect(collector.getSummary('nonexistent')).toBeNull();
  });

  it('should get all summaries', () => {
    collector.record('a', 1, 'count');
    collector.record('b', 2, 'count');
    const summaries = collector.getAllSummaries();
    expect(summaries).toHaveLength(2);
  });

  it('should get metric names', () => {
    collector.record('alpha', 1, 'count');
    collector.record('beta', 2, 'count');
    collector.record('alpha', 3, 'count');
    const names = collector.getMetricNames();
    expect(names).toContain('alpha');
    expect(names).toContain('beta');
  });

  it('should clear all metrics', () => {
    collector.record('a', 1, 'count');
    collector.clear();
    expect(collector.size()).toBe(0);
  });

  it('should evict old metrics when exceeding maxMetrics', () => {
    const small = new MetricsCollector(5);
    for (let i = 0; i < 10; i++) {
      small.record('test', i, 'count');
    }
    expect(small.size()).toBe(5);
    expect(small.getMetrics('test')[0].value).toBe(5);
  });
});

describe('timed utility', () => {
  it('should measure successful async operations', async () => {
    const collector = new MetricsCollector();
    const result = await timed(collector, 'operation', async () => {
      return 42;
    });
    expect(result).toBe(42);
    const metrics = collector.getMetrics('operation');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].unit).toBe('ms');
    expect(metrics[0].tags?.status).toBe('success');
  });

  it('should measure failed async operations and re-throw', async () => {
    const collector = new MetricsCollector();
    await expect(
      timed(collector, 'operation', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    const metrics = collector.getMetrics('operation');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].tags?.status).toBe('error');
  });
});
