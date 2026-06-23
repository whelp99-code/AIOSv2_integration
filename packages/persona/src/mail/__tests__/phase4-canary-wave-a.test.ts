/**
 * Phase 4 Tests — Canary Rollout & Wave A Model Integration
 *
 * Tests for:
 * - WaveAStore (all 12 models, pipeline recording)
 * - CanaryRouter (read path, shadow write, mode-based routing)
 * - Rollback via rules-only mode
 * - Quality gate recording
 */

import { describe, it, expect } from 'vitest';
import { WaveAStore } from '../wave-a-store';
import { CanaryRouter } from '../canary-router';
import type { MailItem } from '../classifier';

// ── Fixtures ──────────────────────────────────────────────────────────

const makeMail = (overrides: Partial<MailItem> = {}): MailItem => ({
  id: overrides.id ?? 'mail-test-001',
  subject: overrides.subject ?? 'HCI 견적 요청',
  from: overrides.from ?? 'buyer@customer.com',
  to: overrides.to ?? ['sales@company.co.kr'],
  body: overrides.body ?? '10노드 견적 부탁드립니다',
  receivedAt: overrides.receivedAt ?? '2026-06-23T10:00:00Z',
});

// ── WaveAStore ────────────────────────────────────────────────────────

describe('WaveAStore', () => {
  it('records MailClassification', () => {
    const store = new WaveAStore();
    const record = store.recordClassification({
      mailId: 'm1',
      personaType: 'SALES',
      confidence: 0.85,
      matchedRules: ['sales-keywords'],
      source: 'rule',
      reason: 'rule_accept',
    });
    expect(record.id).toBeTruthy();
    expect(record.personaType).toBe('SALES');
    expect(store.mailClassifications).toHaveLength(1);
  });

  it('records LlmCall with token tracking', () => {
    const store = new WaveAStore();
    const record = store.recordLlmCall({
      provider: 'lm-studio',
      model: 'local-model',
      inputTokens: 200,
      outputTokens: 50,
      latencyMs: 450,
      success: true,
    });
    expect(record.totalTokens).toBe(250);
    expect(record.provider).toBe('lm-studio');
    expect(store.llmCalls).toHaveLength(1);
  });

  it('records CostEvent and calculates total', () => {
    const store = new WaveAStore();
    store.recordCostEvent({ source: 'llm', amountUsd: 0.05 });
    store.recordCostEvent({ source: 'llm', amountUsd: 0.03 });
    expect(store.getTotalCostUsd()).toBeCloseTo(0.08, 4);
  });

  it('records ErrorEvent', () => {
    const store = new WaveAStore();
    store.recordError({ source: 'classifier', message: 'LLM timeout', details: { timeout: 5000 } });
    expect(store.errorEvents).toHaveLength(1);
    expect(store.errorEvents[0].message).toBe('LLM timeout');
  });

  it('records AuditLog', () => {
    const store = new WaveAStore();
    store.recordAudit({
      action: 'classification',
      entityType: 'MailClassification',
      entityId: 'c1',
      metadata: { category: 'SALES' },
    });
    expect(store.auditLogs).toHaveLength(1);
    expect(store.auditLogs[0].action).toBe('classification');
  });

  it('records StateTransitionLog', () => {
    const store = new WaveAStore();
    store.recordTransition({
      entityType: 'MailClassification',
      entityId: 'c1',
      fromStatus: null,
      toStatus: 'completed',
    });
    expect(store.stateTransitions).toHaveLength(1);
    expect(store.stateTransitions[0].toStatus).toBe('completed');
  });

  it('records QualityGate with pass/fail', () => {
    const store = new WaveAStore();
    const gate = store.recordQualityGate({
      gateKey: 'phase3-benchmark',
      requiredChecks: ['accuracy', 'macroF1', 'latency'],
      actualResults: { accuracy: true, macroF1: true, latency: true },
    });
    expect(gate.passed).toBe(true);

    const failedGate = store.recordQualityGate({
      gateKey: 'phase3-benchmark-fail',
      requiredChecks: ['accuracy', 'macroF1'],
      actualResults: { accuracy: true, macroF1: false },
    });
    expect(failedGate.passed).toBe(false);
  });

  it('creates ValidationPlan with checks', () => {
    const store = new WaveAStore();
    const plan = store.createValidationPlan({
      name: 'classifier-benchmark',
      checks: [
        { checkKey: 'accuracy', threshold: 0.95 },
        { checkKey: 'macroF1', threshold: 0.93 },
      ],
    });
    expect(plan.status).toBe('pending');
    expect(plan.checks).toHaveLength(2);

    // Complete checks
    store.completeValidationCheck(plan.checks[0].id, 0.96);
    expect(plan.checks[0].status).toBe('passed');

    store.completeValidationCheck(plan.checks[1].id, 0.90);
    expect(plan.checks[1].status).toBe('failed');
    expect(plan.status).toBe('failed');
  });

  it('records IntegrationHealth', () => {
    const store = new WaveAStore();
    store.recordHealth({ serviceKey: 'llm-gateway', status: 'healthy' });
    store.recordHealth({ serviceKey: 'llm-gateway', status: 'degraded' });
    // Should update existing, not create new
    expect(store.integrationHealth).toHaveLength(1);
    expect(store.integrationHealth[0].status).toBe('degraded');
  });

  it('records PersonaAction', () => {
    const store = new WaveAStore();
    store.recordPersonaAction({
      personaType: 'SALES',
      action: 'draft-reply',
      input: { mailId: 'm1' },
      mailId: 'm1',
    });
    expect(store.personaActions).toHaveLength(1);
    expect(store.personaActions[0].status).toBe('PENDING');
  });

  it('records full pipeline result', () => {
    const store = new WaveAStore();
    const result = store.recordPipelineResult({
      mailId: 'm1',
      classification: {
        personaType: 'SALES',
        confidence: 0.85,
        matchedRules: ['sales-keywords'],
        source: 'rule',
        reason: 'rule_accept',
      },
      llmCall: {
        provider: 'lm-studio',
        model: 'local',
        inputTokens: 200,
        outputTokens: 50,
        latencyMs: 400,
        success: true,
      },
      cost: { amountUsd: 0.0005 },
    });

    expect(result.classification.personaType).toBe('SALES');
    expect(result.llmCall).not.toBeNull();
    expect(result.costEvent).not.toBeNull();
    expect(result.auditLog.action).toBe('classification');
    expect(result.transition.toStatus).toBe('completed');
  });

  it('summary() returns all collection counts', () => {
    const store = new WaveAStore();
    store.recordClassification({
      mailId: 'm1', personaType: 'PM', confidence: 0.8,
      matchedRules: [], source: 'rule', reason: 'rule_accept',
    });
    store.recordLlmCall({
      provider: 'lm-studio', model: 'local',
      inputTokens: 100, outputTokens: 30, latencyMs: 300, success: true,
    });
    const summary = store.summary();
    expect(summary.mailClassifications).toBe(1);
    expect(summary.llmCalls).toBe(1);
  });

  it('clear() resets all collections', () => {
    const store = new WaveAStore();
    store.recordClassification({
      mailId: 'm1', personaType: 'PM', confidence: 0.8,
      matchedRules: [], source: 'rule', reason: 'rule_accept',
    });
    expect(store.mailClassifications).toHaveLength(1);
    store.clear();
    expect(store.mailClassifications).toHaveLength(0);
  });
});

// ── CanaryRouter ──────────────────────────────────────────────────────

describe('CanaryRouter', () => {
  it('routes in rules-only mode and persists to Wave A', async () => {
    const router = new CanaryRouter({
      config: { enableWrites: true },
    });

    const result = await router.route(makeMail(), { mode: 'rules-only' });

    expect(result.classification.source).toBe('rule');
    expect(result.persisted).toBe(true);
    expect(result.recordIds?.classificationId).toBeTruthy();
    expect(result.recordIds?.auditLogId).toBeTruthy();
    expect(result.recordIds?.transitionId).toBeTruthy();
    // No LLM call in rules-only mode
    expect(result.recordIds?.llmCallId).toBeUndefined();
  });

  it('persists classification with correct category', async () => {
    const router = new CanaryRouter({
      config: { enableWrites: true },
    });

    await router.route(makeMail({
      subject: '청구서 발행',
      body: '6월분 invoice 발행 요청',
    }), { mode: 'rules-only' });

    const store = router.getStore();
    expect(store.mailClassifications).toHaveLength(1);
    expect(store.mailClassifications[0].personaType).toBe('FINANCE');
    expect(store.auditLogs).toHaveLength(1);
    expect(store.stateTransitions).toHaveLength(1);
  });

  it('does not persist when enableWrites is false', async () => {
    const router = new CanaryRouter({
      config: { enableWrites: false },
    });

    const result = await router.route(makeMail(), { mode: 'rules-only' });

    expect(result.persisted).toBe(false);
    expect(result.recordIds).toBeUndefined();
    expect(router.getStore().mailClassifications).toHaveLength(0);
  });

  it('records quality gate result', async () => {
    const router = new CanaryRouter();
    router.recordQualityGate('phase3-gate', ['accuracy', 'macroF1'], {
      accuracy: true,
      macroF1: true,
    });

    const store = router.getStore();
    expect(store.qualityGates).toHaveLength(1);
    expect(store.qualityGates[0].passed).toBe(true);
  });

  it('records integration health', async () => {
    const router = new CanaryRouter();
    router.recordHealth('llm-gateway', 'healthy', { provider: 'lm-studio' });
    router.recordHealth('prisma-db', 'degraded', { latency: 500 });

    expect(router.getStore().integrationHealth).toHaveLength(2);
  });

  it('records error events', async () => {
    const router = new CanaryRouter();
    router.recordError('llm-gateway', 'Provider timeout', { timeout: 5000 });

    expect(router.getStore().errorEvents).toHaveLength(1);
  });

  it('tracks request counter', async () => {
    const router = new CanaryRouter({ config: { enableWrites: false } });
    await router.route(makeMail({ id: 'm1' }), { mode: 'rules-only' });
    await router.route(makeMail({ id: 'm2' }), { mode: 'rules-only' });
    expect(router.getRequestCount()).toBe(2);
  });

  it('rollback to rules-only is instant', async () => {
    const router = new CanaryRouter({ config: { enableWrites: true } });

    // Route a few mails
    for (let i = 0; i < 5; i++) {
      await router.route(makeMail({ id: `m${i}` }), { mode: 'hybrid' });
    }
    expect(router.getStore().mailClassifications).toHaveLength(5);

    // Rollback
    const rollbackResult = await router.route(makeMail({ id: 'rollback-test' }), { mode: 'rules-only' });
    expect(rollbackResult.classification.source).toBe('rule');
    expect(rollbackResult.classification.reason).toBe('mode_rules_only');
  });

  it('shadow mode writes but does not route via LLM', async () => {
    const router = new CanaryRouter({ config: { enableWrites: true } });
    const result = await router.route(makeMail(), { mode: 'shadow' });

    // Classification still uses rule result for routing
    expect(result.classification.result).toBeTruthy();
    expect(result.persisted).toBe(true);
  });
});

// ── Integration: Pipeline Recording ───────────────────────────────────

describe('Wave A Pipeline Integration', () => {
  it('records full classification pipeline with all Wave A models', async () => {
    const store = new WaveAStore();

    // Simulate a full pipeline result
    const pipeline = store.recordPipelineResult({
      mailId: 'integration-001',
      classification: {
        personaType: 'ENGINEER',
        confidence: 0.85,
        matchedRules: ['engineer-code-review', 'engineer-bug-fix'],
        source: 'rule',
        reason: 'rule_accept',
      },
      llmCall: {
        provider: 'lm-studio',
        model: 'local-model',
        inputTokens: 300,
        outputTokens: 80,
        latencyMs: 500,
        success: true,
      },
      cost: { amountUsd: 0.00076 },
    });

    // Verify all Wave A records
    const summary = store.summary();
    expect(summary.mailClassifications).toBe(1);
    expect(summary.llmCalls).toBe(1);
    expect(summary.costEvents).toBe(1);
    expect(summary.auditLogs).toBe(1);
    expect(summary.stateTransitions).toBe(1);

    // Verify data integrity
    expect(pipeline.classification.mailId).toBe('integration-001');
    expect(pipeline.classification.personaType).toBe('ENGINEER');
    expect(pipeline.llmCall!.totalTokens).toBe(380);
    expect(pipeline.costEvent!.amountUsd).toBeCloseTo(0.00076, 6);
    expect(pipeline.auditLog.entityType).toBe('MailClassification');
    expect(pipeline.transition.fromStatus).toBeNull();
    expect(pipeline.transition.toStatus).toBe('completed');
  });

  it('quality gate records benchmark pass/fail', () => {
    const store = new WaveAStore();

    // Create validation plan
    const plan = store.createValidationPlan({
      name: 'phase3-benchmark',
      checks: [
        { checkKey: 'accuracy', threshold: 0.95 },
        { checkKey: 'macroF1', threshold: 0.93 },
        { checkKey: 'schemaValidRate', threshold: 0.995 },
      ],
    });

    // Complete checks (higher-is-better metrics)
    store.completeValidationCheck(plan.checks[0].id, 0.96);   // accuracy: 0.96 >= 0.95 ✓
    store.completeValidationCheck(plan.checks[1].id, 0.94);   // macroF1: 0.94 >= 0.93 ✓
    store.completeValidationCheck(plan.checks[2].id, 0.998);  // schemaValidRate: 0.998 >= 0.995 ✓

    expect(plan.status).toBe('passed');

    // Record quality gate
    const gate = store.recordQualityGate({
      gateKey: 'phase3-benchmark-gate',
      requiredChecks: ['accuracy', 'macroF1', 'schemaValidRate'],
      actualResults: {
        accuracy: true,
        macroF1: true,
        schemaValidRate: true,
      },
    });

    expect(gate.passed).toBe(true);
  });
});
