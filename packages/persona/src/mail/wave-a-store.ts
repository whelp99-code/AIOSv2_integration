/**
 * Wave A Store — Phase 4: Canary Rollout & Wave A Model Integration
 *
 * In-memory store for the 12 Wave A models. Provides typed CRUD operations
 * that mirror the Prisma schema. Can be swapped for real Prisma calls
 * once database migrations are applied.
 *
 * Wave A models: Persona, MailClassification, PersonaAction, LlmCall,
 * CostEvent, ErrorEvent, AuditLog, StateTransitionLog, QualityGate,
 * ValidationPlan, ValidationCheck, IntegrationHealth
 *
 * Source: docs/54-llm-classifier-model-integration-replan.md Phase 4
 */

import type { PersonaType } from './classifier';
import type { DecisionSource, DecisionReason } from './hybrid-classifier';

// ═══════════════════════════════════════════════════════════════════════
// Model Types (mirror Prisma schema)
// ═══════════════════════════════════════════════════════════════════════

export interface MailClassificationRecord {
  id: string;
  mailId: string;
  personaType: PersonaType;
  confidence: number;
  matchedRules: string[];
  /** 'rule' | 'llm' | 'merged' | 'manual-review' */
  source: DecisionSource;
  reason: DecisionReason;
  status: string;
  createdAt: string;
}

export interface LlmCallRecord {
  id: string;
  commandRunId: string | null;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number | null;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

export interface CostEventRecord {
  id: string;
  commandRunId: string | null;
  source: string;
  amountUsd: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ErrorEventRecord {
  id: string;
  source: string;
  message: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  action: string;
  actorId: string | null;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface StateTransitionLogRecord {
  id: string;
  entityType: string;
  entityId: string;
  fromStatus: string | null;
  toStatus: string;
  actorType: string | null;
  actorId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface QualityGateRecord {
  id: string;
  gateKey: string;
  requiredChecks: string[];
  passed: boolean;
  actualResults: Record<string, boolean>;
  createdAt: string;
}

export interface ValidationPlanRecord {
  id: string;
  commandRunId: string | null;
  name: string;
  status: string;
  checks: ValidationCheckRecord[];
  createdAt: string;
}

export interface ValidationCheckRecord {
  id: string;
  planId: string;
  checkKey: string;
  status: 'pending' | 'passed' | 'failed';
  actualValue: number | null;
  threshold: number | null;
  createdAt: string;
}

export interface IntegrationHealthRecord {
  id: string;
  serviceKey: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  lastCheckedAt: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface PersonaActionRecord {
  id: string;
  personaType: PersonaType;
  mailId: string | null;
  action: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Wave A Store
// ═══════════════════════════════════════════════════════════════════════

let nextId = 1;
function genId(): string {
  return `wa-${String(nextId++).padStart(8, '0')}`;
}

export class WaveAStore {
  // ── In-memory collections ────────────────────────────────────────
  readonly mailClassifications: MailClassificationRecord[] = [];
  readonly llmCalls: LlmCallRecord[] = [];
  readonly costEvents: CostEventRecord[] = [];
  readonly errorEvents: ErrorEventRecord[] = [];
  readonly auditLogs: AuditLogRecord[] = [];
  readonly stateTransitions: StateTransitionLogRecord[] = [];
  readonly qualityGates: QualityGateRecord[] = [];
  readonly validationPlans: ValidationPlanRecord[] = [];
  readonly validationChecks: ValidationCheckRecord[] = [];
  readonly integrationHealth: IntegrationHealthRecord[] = [];
  readonly personaActions: PersonaActionRecord[] = [];

  // ── MailClassification ─────────────────────────────────────────

  recordClassification(params: {
    mailId: string;
    personaType: PersonaType;
    confidence: number;
    matchedRules: string[];
    source: DecisionSource;
    reason: DecisionReason;
    status?: string;
  }): MailClassificationRecord {
    const record: MailClassificationRecord = {
      id: genId(),
      mailId: params.mailId,
      personaType: params.personaType,
      confidence: params.confidence,
      matchedRules: params.matchedRules,
      source: params.source,
      reason: params.reason,
      status: params.status ?? 'completed',
      createdAt: new Date().toISOString(),
    };
    this.mailClassifications.push(record);
    return record;
  }

  getClassificationsByMailId(mailId: string): MailClassificationRecord[] {
    return this.mailClassifications.filter(r => r.mailId === mailId);
  }

  // ── LlmCall ────────────────────────────────────────────────────

  recordLlmCall(params: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    success: boolean;
    errorMessage?: string;
    commandRunId?: string;
  }): LlmCallRecord {
    const record: LlmCallRecord = {
      id: genId(),
      commandRunId: params.commandRunId ?? null,
      provider: params.provider,
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      totalTokens: params.inputTokens + params.outputTokens,
      latencyMs: params.latencyMs,
      success: params.success,
      errorMessage: params.errorMessage ?? null,
      createdAt: new Date().toISOString(),
    };
    this.llmCalls.push(record);
    return record;
  }

  // ── CostEvent ──────────────────────────────────────────────────

  recordCostEvent(params: {
    source: string;
    amountUsd: number;
    metadata?: Record<string, unknown>;
    commandRunId?: string;
  }): CostEventRecord {
    const record: CostEventRecord = {
      id: genId(),
      commandRunId: params.commandRunId ?? null,
      source: params.source,
      amountUsd: params.amountUsd,
      metadata: params.metadata ?? null,
      createdAt: new Date().toISOString(),
    };
    this.costEvents.push(record);
    return record;
  }

  getTotalCostUsd(): number {
    return this.costEvents.reduce((sum, e) => sum + e.amountUsd, 0);
  }

  // ── ErrorEvent ─────────────────────────────────────────────────

  recordError(params: {
    source: string;
    message: string;
    details?: Record<string, unknown>;
  }): ErrorEventRecord {
    const record: ErrorEventRecord = {
      id: genId(),
      source: params.source,
      message: params.message,
      details: params.details ?? null,
      createdAt: new Date().toISOString(),
    };
    this.errorEvents.push(record);
    return record;
  }

  // ── AuditLog ───────────────────────────────────────────────────

  recordAudit(params: {
    action: string;
    entityType: string;
    entityId: string;
    actorId?: string;
    metadata?: Record<string, unknown>;
  }): AuditLogRecord {
    const record: AuditLogRecord = {
      id: genId(),
      action: params.action,
      actorId: params.actorId ?? null,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata ?? null,
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.push(record);
    return record;
  }

  // ── StateTransitionLog ─────────────────────────────────────────

  recordTransition(params: {
    entityType: string;
    entityId: string;
    fromStatus: string | null;
    toStatus: string;
    actorType?: string;
    actorId?: string;
    metadata?: Record<string, unknown>;
  }): StateTransitionLogRecord {
    const record: StateTransitionLogRecord = {
      id: genId(),
      entityType: params.entityType,
      entityId: params.entityId,
      fromStatus: params.fromStatus,
      toStatus: params.toStatus,
      actorType: params.actorType ?? null,
      actorId: params.actorId ?? null,
      metadata: params.metadata ?? null,
      createdAt: new Date().toISOString(),
    };
    this.stateTransitions.push(record);
    return record;
  }

  // ── QualityGate ────────────────────────────────────────────────

  recordQualityGate(params: {
    gateKey: string;
    requiredChecks: string[];
    actualResults: Record<string, boolean>;
  }): QualityGateRecord {
    const passed = params.requiredChecks.every(k => params.actualResults[k] === true);
    const record: QualityGateRecord = {
      id: genId(),
      gateKey: params.gateKey,
      requiredChecks: params.requiredChecks,
      passed,
      actualResults: params.actualResults,
      createdAt: new Date().toISOString(),
    };
    this.qualityGates.push(record);
    return record;
  }

  // ── ValidationPlan + Checks ────────────────────────────────────

  createValidationPlan(params: {
    name: string;
    checks: Array<{ checkKey: string; threshold: number }>;
    commandRunId?: string;
  }): ValidationPlanRecord {
    const plan: ValidationPlanRecord = {
      id: genId(),
      commandRunId: params.commandRunId ?? null,
      name: params.name,
      status: 'pending',
      checks: [],
      createdAt: new Date().toISOString(),
    };
    this.validationPlans.push(plan);

    for (const check of params.checks) {
      const c: ValidationCheckRecord = {
        id: genId(),
        planId: plan.id,
        checkKey: check.checkKey,
        status: 'pending',
        actualValue: null,
        threshold: check.threshold,
        createdAt: new Date().toISOString(),
      };
      this.validationChecks.push(c);
      plan.checks.push(c);
    }

    return plan;
  }

  completeValidationCheck(checkId: string, actualValue: number): ValidationCheckRecord | null {
    const check = this.validationChecks.find(c => c.id === checkId);
    if (!check) return null;
    check.actualValue = actualValue;
    check.status = check.threshold !== null && actualValue >= check.threshold ? 'passed' : 'failed';

    // Update plan status
    const plan = this.validationPlans.find(p => p.id === check.planId);
    if (plan) {
      const allChecks = this.validationChecks.filter(c => c.planId === plan.id);
      if (allChecks.every(c => c.status === 'passed')) {
        plan.status = 'passed';
      } else if (allChecks.some(c => c.status === 'failed')) {
        plan.status = 'failed';
      }
    }

    return check;
  }

  // ── IntegrationHealth ──────────────────────────────────────────

  recordHealth(params: {
    serviceKey: string;
    status: 'healthy' | 'degraded' | 'down' | 'unknown';
    details?: Record<string, unknown>;
  }): IntegrationHealthRecord {
    const existing = this.integrationHealth.find(h => h.serviceKey === params.serviceKey);
    if (existing) {
      existing.status = params.status;
      existing.lastCheckedAt = new Date().toISOString();
      existing.details = params.details ?? null;
      existing.updatedAt = new Date().toISOString();
      return existing;
    }
    const record: IntegrationHealthRecord = {
      id: genId(),
      serviceKey: params.serviceKey,
      status: params.status,
      lastCheckedAt: new Date().toISOString(),
      details: params.details ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.integrationHealth.push(record);
    return record;
  }

  // ── PersonaAction ──────────────────────────────────────────────

  recordPersonaAction(params: {
    personaType: PersonaType;
    action: string;
    input: Record<string, unknown>;
    mailId?: string;
    output?: Record<string, unknown>;
    status?: PersonaActionRecord['status'];
    error?: string;
  }): PersonaActionRecord {
    const record: PersonaActionRecord = {
      id: genId(),
      personaType: params.personaType,
      mailId: params.mailId ?? null,
      action: params.action,
      input: params.input,
      output: params.output ?? null,
      status: params.status ?? 'PENDING',
      error: params.error ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.personaActions.push(record);
    return record;
  }

  // ── Aggregate: Record full classification pipeline ─────────────

  /**
   * Record a complete classification pipeline result.
   * This writes to MailClassification, LlmCall, CostEvent, AuditLog,
   * and StateTransitionLog in one call.
   */
  recordPipelineResult(params: {
    mailId: string;
    classification: {
      personaType: PersonaType;
      confidence: number;
      matchedRules: string[];
      source: DecisionSource;
      reason: DecisionReason;
    };
    llmCall?: {
      provider: string;
      model: string;
      inputTokens: number;
      outputTokens: number;
      latencyMs: number;
      success: boolean;
      errorMessage?: string;
    };
    cost?: {
      amountUsd: number;
    };
    previousStatus?: string;
  }): {
    classification: MailClassificationRecord;
    llmCall: LlmCallRecord | null;
    costEvent: CostEventRecord | null;
    auditLog: AuditLogRecord;
    transition: StateTransitionLogRecord;
  } {
    const classification = this.recordClassification({
      mailId: params.mailId,
      ...params.classification,
    });

    const llmCall = params.llmCall
      ? this.recordLlmCall(params.llmCall)
      : null;

    const costEvent = params.cost
      ? this.recordCostEvent({
          source: 'llm-classification',
          amountUsd: params.cost.amountUsd,
          metadata: { mailId: params.mailId, provider: params.llmCall?.provider },
        })
      : null;

    const auditLog = this.recordAudit({
      action: 'classification',
      entityType: 'MailClassification',
      entityId: classification.id,
      metadata: {
        mailId: params.mailId,
        category: classification.personaType,
        source: classification.source,
        confidence: classification.confidence,
      },
    });

    const transition = this.recordTransition({
      entityType: 'MailClassification',
      entityId: classification.id,
      fromStatus: params.previousStatus ?? null,
      toStatus: classification.status,
      actorType: 'system',
      metadata: { reason: classification.reason },
    });

    return { classification, llmCall, costEvent, auditLog, transition };
  }

  // ── Summary ────────────────────────────────────────────────────

  summary(): Record<string, number> {
    return {
      mailClassifications: this.mailClassifications.length,
      llmCalls: this.llmCalls.length,
      costEvents: this.costEvents.length,
      errorEvents: this.errorEvents.length,
      auditLogs: this.auditLogs.length,
      stateTransitions: this.stateTransitions.length,
      qualityGates: this.qualityGates.length,
      validationPlans: this.validationPlans.length,
      validationChecks: this.validationChecks.length,
      integrationHealth: this.integrationHealth.length,
      personaActions: this.personaActions.length,
    };
  }

  clear(): void {
    this.mailClassifications.length = 0;
    this.llmCalls.length = 0;
    this.costEvents.length = 0;
    this.errorEvents.length = 0;
    this.auditLogs.length = 0;
    this.stateTransitions.length = 0;
    this.qualityGates.length = 0;
    this.validationPlans.length = 0;
    this.validationChecks.length = 0;
    this.integrationHealth.length = 0;
    this.personaActions.length = 0;
  }
}
