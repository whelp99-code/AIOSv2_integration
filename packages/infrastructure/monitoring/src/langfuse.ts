/**
 * Langfuse Monitoring Adapter
 * Langfuse 관측성/모니터링 연동 (F-aios-v3 재활용)
 */

export interface LangfuseConfig {
  publicKey?: string;
  secretKey?: string;
  baseUrl?: string;
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

export class LangfuseMonitor {
  private publicKey: string;
  private secretKey: string;
  private baseUrl: string;
  private traces: TraceEvent[] = [];

  constructor(config: LangfuseConfig = {}) {
    this.publicKey = config.publicKey || process.env.LANGFUSE_PUBLIC_KEY || '';
    this.secretKey = config.secretKey || process.env.LANGFUSE_SECRET_KEY || '';
    this.baseUrl = config.baseUrl || 'https://cloud.langfuse.com';
  }

  createTrace(name: string, metadata?: Record<string, unknown>): TraceEvent {
    const trace: TraceEvent = {
      id: `trace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      metadata,
      startTime: new Date(),
    };
    this.traces.push(trace);
    return trace;
  }

  endTrace(traceId: string, output?: unknown, status?: 'success' | 'error'): void {
    const trace = this.traces.find((t) => t.id === traceId);
    if (trace) {
      trace.endTime = new Date();
      trace.output = output;
      trace.status = status;
    }
  }

  getTraces(limit = 50): TraceEvent[] {
    return this.traces.slice(-limit);
  }

  isConfigured(): boolean {
    return !!(this.publicKey && this.secretKey);
  }
}
