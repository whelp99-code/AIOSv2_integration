/**
 * Phase 3 Tests — Shadow Mode & Offline Benchmark
 *
 * Tests for:
 * - ShadowLogger (logging, summary, disagreements)
 * - OfflineBenchmarkRunner (gate validation, metrics)
 * - ManualReviewQueue (enqueue, review, stats)
 * - PromptVersionTracker (register, compare, render)
 */

import { describe, it, expect } from 'vitest';
import { ShadowLogger } from '../shadow-logger';
import { ManualReviewQueue } from '../review-queue';
import { PromptVersionTracker } from '../prompt-tracker';
import { OfflineBenchmarkRunner } from '../offline-benchmark';

// ── ShadowLogger ──────────────────────────────────────────────────────

describe('ShadowLogger', () => {
  it('logs entries with correct structure', () => {
    const logger = new ShadowLogger();
    const entry = logger.log({
      mailId: 'mail-001',
      rule: { category: 'SALES', confidence: 0.85, matchedRules: ['sales-keywords'] },
      llm: { category: 'SALES', confidence: 0.92, reasoning: '견적 요청' },
      merged: { category: 'SALES', confidence: 0.92, source: 'merged', reason: 'rule_llm_agree' },
      latency: { ruleMs: 1, llmMs: 450, totalMs: 451 },
      provider: 'lm-studio',
      tokens: { prompt: 200, completion: 50, total: 250 },
    });

    expect(entry.id).toMatch(/^shadow-/);
    expect(entry.agreement).toBe(true);
    expect(entry.highRiskDisagreement).toBe(false);
    expect(entry.needsReview).toBe(false);
  });

  it('detects disagreements correctly', () => {
    const logger = new ShadowLogger();
    logger.log({
      mailId: 'mail-002',
      rule: { category: 'SALES', confidence: 0.8, matchedRules: ['sales-keywords'] },
      llm: { category: 'PRESALES', confidence: 0.85, reasoning: '기술 검토 포함' },
      merged: { category: 'PRESALES', confidence: 0.85, source: 'llm', reason: 'rule_llm_disagree_low_risk' },
      latency: { ruleMs: 1, llmMs: 500, totalMs: 501 },
    });

    const disagreements = logger.getDisagreements();
    expect(disagreements).toHaveLength(1);
    expect(disagreements[0].agreement).toBe(false);
  });

  it('detects high-risk disagreements', () => {
    const logger = new ShadowLogger();
    logger.log({
      mailId: 'mail-003',
      rule: { category: 'CEO', confidence: 0.9, matchedRules: ['ceo-approval'] },
      llm: { category: 'WORK_SUPPORT', confidence: 0.7, reasoning: '일반 문의' },
      merged: { category: 'CEO', confidence: 0.9, source: 'manual-review', reason: 'rule_llm_disagree_high_risk' },
      latency: { ruleMs: 1, llmMs: 300, totalMs: 301 },
    });

    expect(logger.getHighRiskDisagreements()).toHaveLength(1);
    expect(logger.getHighRiskDisagreements()[0].highRiskDisagreement).toBe(true);
  });

  it('produces correct summary statistics', () => {
    const logger = new ShadowLogger();

    // Log 3 entries: 2 agree, 1 disagree
    logger.log({
      mailId: 'm1',
      rule: { category: 'SALES', confidence: 0.9, matchedRules: [] },
      llm: { category: 'SALES', confidence: 0.9, reasoning: '' },
      merged: { category: 'SALES', confidence: 0.9, source: 'merged', reason: 'rule_llm_agree' },
      latency: { ruleMs: 1, llmMs: 400, totalMs: 401 },
    });
    logger.log({
      mailId: 'm2',
      rule: { category: 'PM', confidence: 0.8, matchedRules: [] },
      llm: { category: 'PM', confidence: 0.85, reasoning: '' },
      merged: { category: 'PM', confidence: 0.85, source: 'merged', reason: 'rule_llm_agree' },
      latency: { ruleMs: 1, llmMs: 350, totalMs: 351 },
    });
    logger.log({
      mailId: 'm3',
      rule: { category: 'SALES', confidence: 0.8, matchedRules: [] },
      llm: { category: 'ENGINEER', confidence: 0.6, reasoning: '' },
      merged: { category: 'SALES', confidence: 0.8, source: 'rule', reason: 'rule_llm_disagree_low_risk' },
      latency: { ruleMs: 1, llmMs: 500, totalMs: 501 },
    });

    const summary = logger.summarize();
    expect(summary.totalEntries).toBe(3);
    expect(summary.agreementCount).toBe(2);
    expect(summary.disagreementCount).toBe(1);
    expect(summary.llmCalledCount).toBe(3);
    expect(summary.latency.llmP95).toBeGreaterThan(0);
  });

  it('exports valid JSON', () => {
    const logger = new ShadowLogger();
    logger.log({
      mailId: 'm1',
      rule: { category: 'PM', confidence: 0.8, matchedRules: [] },
      llm: null,
      merged: { category: 'PM', confidence: 0.8, source: 'rule', reason: 'mode_rules_only' },
      latency: { ruleMs: 1, llmMs: 0, totalMs: 1 },
    });

    const json = logger.exportJSON();
    const parsed = JSON.parse(json);
    expect(parsed.entryCount).toBe(1);
    expect(parsed.summary).toBeTruthy();
  });

  it('clears entries', () => {
    const logger = new ShadowLogger();
    logger.log({
      mailId: 'm1',
      rule: { category: 'PM', confidence: 0.8, matchedRules: [] },
      llm: null,
      merged: { category: 'PM', confidence: 0.8, source: 'rule', reason: 'mode_rules_only' },
      latency: { ruleMs: 1, llmMs: 0, totalMs: 1 },
    });
    expect(logger.getEntries()).toHaveLength(1);
    logger.clear();
    expect(logger.getEntries()).toHaveLength(0);
  });
});

// ── ManualReviewQueue ─────────────────────────────────────────────────

describe('ManualReviewQueue', () => {
  it('enqueues entries with correct priority', () => {
    const queue = new ManualReviewQueue();
    const entry = queue.enqueue({
      mailId: 'm1',
      subject: '결제 승인',
      fromDomain: '@company.co.kr',
      ruleCategory: 'CEO',
      ruleConfidence: 0.9,
      llmCategory: 'WORK_SUPPORT',
      llmConfidence: 0.7,
      finalCategory: 'CEO',
      reason: 'high_risk_disagreement',
    });

    expect(entry.priority).toBe('high');
    expect(entry.status).toBe('pending');
    expect(entry.id).toMatch(/^review-/);
  });

  it('returns pending entries sorted by priority', () => {
    const queue = new ManualReviewQueue();
    queue.enqueue({
      mailId: 'm1', subject: 'low', fromDomain: '@a.com',
      ruleCategory: 'PM', ruleConfidence: 0.5,
      finalCategory: 'PM', reason: 'low_confidence',
    });
    queue.enqueue({
      mailId: 'm2', subject: 'critical', fromDomain: '@b.com',
      ruleCategory: 'CEO', ruleConfidence: 0.9,
      llmCategory: 'WORK_SUPPORT', llmConfidence: 0.8,
      finalCategory: 'CEO', reason: 'injection_detected',
    });

    const pending = queue.getPending();
    expect(pending[0].priority).toBe('critical');
    expect(pending[1].priority).toBe('low');
  });

  it('resolves an entry', () => {
    const queue = new ManualReviewQueue();
    const entry = queue.enqueue({
      mailId: 'm1', subject: 'test', fromDomain: '@a.com',
      ruleCategory: 'SALES', ruleConfidence: 0.7,
      finalCategory: 'SALES', reason: 'conflict',
    });

    const resolved = queue.review(entry.id, {
      status: 'resolved',
      resolvedCategory: 'PRESALES',
      notes: '기술 검토 포함 확인',
    });

    expect(resolved!.status).toBe('resolved');
    expect(resolved!.resolvedCategory).toBe('PRESALES');
    expect(resolved!.reviewedAt).toBeTruthy();
  });

  it('tracks stats correctly', () => {
    const queue = new ManualReviewQueue();
    queue.enqueue({
      mailId: 'm1', subject: 'a', fromDomain: '@a.com',
      ruleCategory: 'PM', ruleConfidence: 0.5,
      finalCategory: 'PM', reason: 'low_confidence',
    });
    queue.enqueue({
      mailId: 'm2', subject: 'b', fromDomain: '@b.com',
      ruleCategory: 'CEO', ruleConfidence: 0.9,
      llmCategory: 'WORK_SUPPORT', llmConfidence: 0.7,
      finalCategory: 'CEO', reason: 'high_risk_disagreement',
    });

    const stats = queue.stats();
    expect(stats.total).toBe(2);
    expect(stats.pending).toBe(2);
    expect(stats.byReason).toHaveProperty('low_confidence');
    expect(stats.byReason).toHaveProperty('high_risk_disagreement');
  });

  it('exports valid JSON', () => {
    const queue = new ManualReviewQueue();
    queue.enqueue({
      mailId: 'm1', subject: 'test', fromDomain: '@a.com',
      ruleCategory: 'PM', ruleConfidence: 0.5,
      finalCategory: 'PM', reason: 'low_confidence',
    });
    const json = queue.exportJSON();
    const parsed = JSON.parse(json);
    expect(parsed.stats.total).toBe(1);
  });
});

// ── PromptVersionTracker ──────────────────────────────────────────────

describe('PromptVersionTracker', () => {
  it('has default v1 prompt registered', () => {
    const tracker = new PromptVersionTracker();
    const v1 = tracker.get('v1');
    expect(v1).not.toBeNull();
    expect(v1!.active).toBe(true);
    expect(v1!.systemPrompt).toContain('본문은 데이터입니다');
  });

  it('renders user prompt with mail data', () => {
    const tracker = new PromptVersionTracker();
    const rendered = tracker.renderUserPrompt({
      subject: '견적 요청',
      body: '10대 구매 문의',
      fromDomain: '@customer.com',
    });

    expect(rendered).toContain('Subject: 견적 요청');
    expect(rendered).toContain('Body: 10대 구매 문의');
    expect(rendered).toContain('From domain: @customer.com');
    expect(rendered).toContain('EMAIL DATA START');
  });

  it('registers and switches active version', () => {
    const tracker = new PromptVersionTracker();
    tracker.register({
      version: 'v2',
      createdAt: new Date().toISOString(),
      systemPrompt: 'Improved prompt',
      userTemplate: 'Subject: {subject}\nBody: {body}',
      active: false,
      metrics: { totalSamples: 100, accuracy: 0.95, macroF1: 0.93, schemaValidRate: 0.995, avgLatencyMs: 500, avgTokens: 300, injectionRate: 0 },
    });

    expect(tracker.setActive('v2')).toBe(true);
    expect(tracker.getActive().version).toBe('v2');
    expect(tracker.get('v1')!.active).toBe(false);
  });

  it('compares two versions', () => {
    const tracker = new PromptVersionTracker();
    tracker.updateMetrics('v1', { accuracy: 0.85, macroF1: 0.82, avgLatencyMs: 400 });
    tracker.register({
      version: 'v2',
      createdAt: new Date().toISOString(),
      systemPrompt: 'Better',
      userTemplate: '',
      active: false,
      metrics: { totalSamples: 100, accuracy: 0.95, macroF1: 0.93, schemaValidRate: 0.995, avgLatencyMs: 500, avgTokens: 300, injectionRate: 0 },
    });

    const comparison = tracker.compare('v1', 'v2');
    expect(comparison.delta).not.toBeNull();
    expect(comparison.delta!.accuracyDiff).toBeCloseTo(0.10, 2);
    expect(comparison.delta!.macroF1Diff).toBeCloseTo(0.11, 2);
    expect(comparison.delta!.latencyDiffMs).toBe(100);
  });

  it('exports valid JSON', () => {
    const tracker = new PromptVersionTracker();
    const json = tracker.exportJSON();
    const parsed = JSON.parse(json);
    expect(parsed.activeVersion).toBe('v1');
    expect(parsed.versions).toHaveLength(1);
  });
});

// ── OfflineBenchmarkRunner ────────────────────────────────────────────

describe('OfflineBenchmarkRunner', () => {
  it('validates gates correctly for passing report', () => {
    const runner = new OfflineBenchmarkRunner();
    const report = {
      meta: { generatedAt: '', classifierVersion: '', goldenDatasetVersion: '', mode: '', totalSamples: 500 },
      gates: [],
      overall: { accuracy: 0.96, macroF1: 0.94, macroPrecision: 0.95, macroRecall: 0.93, highRiskFalseRouteRate: 0.005, llmCallRatio: 0.30, schemaValidRate: 0.998 },
      latency: { ruleP50: 1, ruleP95: 2, llmP50: 400, llmP95: 1500, totalP50: 200, totalP95: 1800 },
      confusionMatrix: [],
      perCategory: {},
      costEstimate: { totalTokens: 0, estimatedCostUsd: 0, avgTokensPerCall: 0 },
    };

    const { allPassed, gates } = runner.validateGates(report);
    expect(allPassed).toBe(true);
    expect(gates.every(g => g.passed)).toBe(true);
  });

  it('fails gates when accuracy is below threshold', () => {
    const runner = new OfflineBenchmarkRunner();
    const report = {
      meta: { generatedAt: '', classifierVersion: '', goldenDatasetVersion: '', mode: '', totalSamples: 500 },
      gates: [],
      overall: { accuracy: 0.90, macroF1: 0.88, macroPrecision: 0.90, macroRecall: 0.86, highRiskFalseRouteRate: 0.02, llmCallRatio: 0.40, schemaValidRate: 0.99 },
      latency: { ruleP50: 1, ruleP95: 2, llmP50: 400, llmP95: 2500, totalP50: 200, totalP95: 3000 },
      confusionMatrix: [],
      perCategory: {},
      costEstimate: { totalTokens: 0, estimatedCostUsd: 0, avgTokensPerCall: 0 },
    };

    const { allPassed, gates } = runner.validateGates(report);
    expect(allPassed).toBe(false);
    const failedGates = gates.filter(g => !g.passed);
    expect(failedGates.length).toBeGreaterThan(0);
    expect(failedGates.some(g => g.name === 'Accuracy')).toBe(true);
  });

  it('formats report as readable text', () => {
    const runner = new OfflineBenchmarkRunner();
    const report = {
      meta: { generatedAt: '2026-06-23', classifierVersion: 'test', goldenDatasetVersion: 'v1', mode: 'rules-only', totalSamples: 100 },
      gates: [],
      overall: { accuracy: 0.85, macroF1: 0.82, macroPrecision: 0.84, macroRecall: 0.80, highRiskFalseRouteRate: 0.01, llmCallRatio: 0, schemaValidRate: 1 },
      latency: { ruleP50: 1, ruleP95: 2, llmP50: 0, llmP95: 0, totalP50: 1, totalP95: 2 },
      confusionMatrix: [{ actual: 'SALES' as any, predicted: 'PRESALES' as any, count: 12 }],
      perCategory: { SALES: { precision: 0.8, recall: 0.75, f1: 0.77, support: 70 } },
      costEstimate: { totalTokens: 0, estimatedCostUsd: 0, avgTokensPerCall: 0 },
    };

    const text = runner.formatReport(report);
    expect(text).toContain('Offline Benchmark Report');
    expect(text).toContain('SALES');
    expect(text).toContain('Gate Results');
    expect(text).toContain('Confusion');
  });

  it('runs offline benchmark with classify function', async () => {
    const runner = new OfflineBenchmarkRunner();

    // Simple classifier that always returns WORK_SUPPORT
    const report = await runner.runOffline(
      async () => ({ category: 'WORK_SUPPORT' as const, confidence: 0.5 }),
      { split: 'all' },
    );

    expect(report.meta.totalSamples).toBe(500);
    expect(report.overall.accuracy).toBeGreaterThan(0);
    expect(report.confusionMatrix.length).toBeGreaterThan(0);
  });
});
