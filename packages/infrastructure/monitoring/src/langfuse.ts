/**
 * Langfuse Monitoring Adapter
 * Langfuse 관측성/모니터링 연동 (F-aios-v3 재활용)
 */

export interface LangfuseConfig {
  publicKey?: string;
  secretKey?: string;
  baseUrl?: string;
  flushInterval?: number;
  batchSize?: number;
}

export interface TraceEvent {
  id: string;
  name: string;
  metadata?: Record<string, unknown>;
  input?: unknown;
  output?: unknown;
  startTime: Date;
  endTime?: Date;
  status?: 'success' | 'error';
  tags?: string[];
}

export interface GenerationEvent {
  id: string;
  traceId: string;
  name: string;
  model?: string;
  input?: unknown;
  output?: unknown;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  startTime: Date;
  endTime?: Date;
  metadata?: Record<string, unknown>;
}

export interface SpanEvent {
  id: string;
  traceId: string;
  name: string;
  input?: unknown;
  output?: unknown;
  startTime: Date;
  endTime?: Date;
  metadata?: Record<string, unknown>;
}

export interface ScoreEvent {
  id: string;
  traceId: string;
  name: string;
  value: number;
  comment?: string;
  timestamp: Date;
}

export class LangfuseMonitor {
  private publicKey: string;
  private secretKey: string;
  private baseUrl: string;
  private traces: TraceEvent[] = [];
  private generations: GenerationEvent[] = [];
  private spans: SpanEvent[] = [];
  private scores: ScoreEvent[] = [];
  private flushInterval: number;
  private batchSize: number;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private eventQueue: Array<Record<string, unknown>> = [];

  constructor(config: LangfuseConfig = {}) {
    this.publicKey = config.publicKey || process.env.LANGFUSE_PUBLIC_KEY || '';
    this.secretKey = config.secretKey || process.env.LANGFUSE_SECRET_KEY || '';
    this.baseUrl = config.baseUrl || process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com';
    this.flushInterval = config.flushInterval ?? 10000;
    this.batchSize = config.batchSize ?? 100;
  }

  createTrace(name: string, metadata?: Record<string, unknown>, input?: unknown): TraceEvent {
    const trace: TraceEvent = {
      id: `trace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      metadata,
      input,
      startTime: new Date(),
    };
    this.traces.push(trace);
    this.enqueueEvent('trace-create', {
      id: trace.id,
      name: trace.name,
      metadata: trace.metadata,
      input: trace.input,
      timestamp: trace.startTime.toISOString(),
    });
    return trace;
  }

  endTrace(traceId: string, output?: unknown, status?: 'success' | 'error', metadata?: Record<string, unknown>): void {
    const trace = this.traces.find((t) => t.id === traceId);
    if (trace) {
      trace.endTime = new Date();
      trace.output = output;
      trace.status = status;
      if (metadata) trace.metadata = { ...trace.metadata, ...metadata };
      this.enqueueEvent('trace-update', {
        id: trace.id,
        output: trace.output,
        status: trace.status,
        metadata: trace.metadata,
        timestamp: trace.endTime.toISOString(),
      });
    }
  }

  createGeneration(traceId: string, name: string, model?: string, input?: unknown): GenerationEvent {
    const generation: GenerationEvent = {
      id: `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      traceId,
      name,
      model,
      input,
      startTime: new Date(),
    };
    this.generations.push(generation);
    this.enqueueEvent('generation-create', {
      id: generation.id,
      traceId: generation.traceId,
      name: generation.name,
      model: generation.model,
      input: generation.input,
      timestamp: generation.startTime.toISOString(),
    });
    return generation;
  }

  endGeneration(generationId: string, output?: unknown, usage?: GenerationEvent['usage'], metadata?: Record<string, unknown>): void {
    const gen = this.generations.find((g) => g.id === generationId);
    if (gen) {
      gen.endTime = new Date();
      gen.output = output;
      gen.usage = usage;
      if (metadata) gen.metadata = { ...gen.metadata, ...metadata };
      this.enqueueEvent('generation-update', {
        id: gen.id,
        output: gen.output,
        usage: gen.usage,
        metadata: gen.metadata,
        timestamp: gen.endTime.toISOString(),
      });
    }
  }

  createSpan(traceId: string, name: string, input?: unknown): SpanEvent {
    const span: SpanEvent = {
      id: `span_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      traceId,
      name,
      input,
      startTime: new Date(),
    };
    this.spans.push(span);
    this.enqueueEvent('span-create', {
      id: span.id,
      traceId: span.traceId,
      name: span.name,
      input: span.input,
      timestamp: span.startTime.toISOString(),
    });
    return span;
  }

  endSpan(spanId: string, output?: unknown, metadata?: Record<string, unknown>): void {
    const span = this.spans.find((s) => s.id === spanId);
    if (span) {
      span.endTime = new Date();
      span.output = output;
      if (metadata) span.metadata = { ...span.metadata, ...metadata };
      this.enqueueEvent('span-update', {
        id: span.id,
        output: span.output,
        metadata: span.metadata,
        timestamp: span.endTime.toISOString(),
      });
    }
  }

  createScore(traceId: string, name: string, value: number, comment?: string): ScoreEvent {
    const score: ScoreEvent = {
      id: `score_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      traceId,
      name,
      value,
      comment,
      timestamp: new Date(),
    };
    this.scores.push(score);
    this.enqueueEvent('score-create', {
      id: score.id,
      traceId: score.traceId,
      name: score.name,
      value: score.value,
      comment: score.comment,
      timestamp: score.timestamp.toISOString(),
    });
    return score;
  }

  getTraces(limit = 50): TraceEvent[] {
    return this.traces.slice(-limit);
  }

  getGenerations(traceId?: string, limit = 50): GenerationEvent[] {
    const filtered = traceId ? this.generations.filter((g) => g.traceId === traceId) : this.generations;
    return filtered.slice(-limit);
  }

  getSpans(traceId?: string, limit = 50): SpanEvent[] {
    const filtered = traceId ? this.spans.filter((s) => s.traceId === traceId) : this.spans;
    return filtered.slice(-limit);
  }

  getScores(traceId?: string, limit = 50): ScoreEvent[] {
    const filtered = traceId ? this.scores.filter((s) => s.traceId === traceId) : this.scores;
    return filtered.slice(-limit);
  }

  getEventQueueSize(): number {
    return this.eventQueue.length;
  }

  isConfigured(): boolean {
    return !!(this.publicKey && this.secretKey);
  }

  startAutoFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.flushInterval);
  }

  stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  async flush(): Promise<{ sent: number; success: boolean }> {
    if (!this.isConfigured() || this.eventQueue.length === 0) {
      return { sent: 0, success: false };
    }

    const batch = this.eventQueue.splice(0, this.batchSize);

    try {
      const authHeader = `Basic ${Buffer.from(`${this.publicKey}:${this.secretKey}`).toString('base64')}`;
      const response = await fetch(`${this.baseUrl}/api/public/ingestion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({ batch }),
      });

      return { sent: batch.length, success: response.ok };
    } catch {
      // Re-queue failed events
      this.eventQueue.unshift(...batch);
      return { sent: 0, success: false };
    }
  }

  private enqueueEvent(type: string, body: Record<string, unknown>): void {
    this.eventQueue.push({ type, body, timestamp: new Date().toISOString() });
  }
}
