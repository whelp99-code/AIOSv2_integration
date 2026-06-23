/**
 * Shadow Logger — Phase 3: Shadow Mode
 *
 * Logs rule result vs LLM result for comparison without affecting routing.
 * Stores entries for offline analysis, disagreement detection, and metrics.
 *
 * Source: docs/54-llm-classifier-model-integration-replan.md Phase 3
 */

import type { PersonaType } from './classifier';
import type { DecisionSource, DecisionReason } from './hybrid-classifier';

// ── Types ─────────────────────────────────────────────────────────────

export interface ShadowLogEntry {
  /** Unique entry ID */
  id: string;
  /** Timestamp */
  timestamp: string;
  /** Mail ID */
  mailId: string;
  /** Rule classification result */
  rule: {
    category: PersonaType;
    confidence: number;
    matchedRules: string[];
  };
  /** LLM classification result (null if not called or failed) */
  llm: {
    category: PersonaType;
    confidence: number;
    reasoning: string;
  } | null;
  /** Final merged result */
  merged: {
    category: PersonaType;
    confidence: number;
    source: DecisionSource;
    reason: DecisionReason;
  };
  /** Whether rule and LLM agree */
  agreement: boolean;
  /** Whether this is a high-risk disagreement */
  highRiskDisagreement: boolean;
  /** Whether manual review is needed */
  needsReview: boolean;
  /** Latency breakdown */
  latency: {
    ruleMs: number;
    llmMs: number;
    totalMs: number;
  };
  /** Prompt version used */
  promptVersion: string;
  /** Provider used (null if LLM not called) */
  provider: string | null;
  /** Token usage */
  tokens: { prompt: number; completion: number; total: number };
  /** Whether PII was redacted */
  piiRedacted: boolean;
  /** Redaction count */
  piiRedactionCount: number;
}

export interface ShadowSummary {
  totalEntries: number;
  agreementCount: number;
  disagreementCount: number;
  agreementRate: number;
  highRiskDisagreementCount: number;
  reviewNeededCount: number;
  llmCalledCount: number;
  llmCallRatio: number;
  llmSuccessCount: number;
  llmSchemaValidCount: number;
  schemaValidRate: number;
  latency: {
    ruleP50: number;
    ruleP95: number;
    llmP50: number;
    llmP95: number;
    totalP50: number;
    totalP95: number;
  };
  perCategory: Record<string, {
    ruleCorrect: number;
    total: number;
    accuracy: number;
  }>;
  providerBreakdown: Record<string, {
    calls: number;
    failures: number;
    avgLatencyMs: number;
    totalTokens: number;
  }>;
}

// ── Shadow Logger ─────────────────────────────────────────────────────

export class ShadowLogger {
  private entries: ShadowLogEntry[] = [];
  private nextId = 1;

  /**
   * Log a shadow entry comparing rule and LLM results.
   */
  log(params: {
    mailId: string;
    rule: ShadowLogEntry['rule'];
    llm: ShadowLogEntry['llm'];
    merged: ShadowLogEntry['merged'];
    latency: ShadowLogEntry['latency'];
    promptVersion?: string;
    provider?: string | null;
    tokens?: ShadowLogEntry['tokens'];
    piiRedacted?: boolean;
    piiRedactionCount?: number;
  }): ShadowLogEntry {
    const agreement = params.llm
      ? params.rule.category === params.llm.category
      : true; // no LLM = no disagreement

    const highRiskDisagreement = params.llm
      ? this.isHighRisk(params.rule.category, params.llm.category)
      : false;

    const entry: ShadowLogEntry = {
      id: `shadow-${String(this.nextId++).padStart(6, '0')}`,
      timestamp: new Date().toISOString(),
      mailId: params.mailId,
      rule: params.rule,
      llm: params.llm,
      merged: params.merged,
      agreement,
      highRiskDisagreement,
      needsReview: params.merged.source === 'manual-review',
      latency: params.latency,
      promptVersion: params.promptVersion ?? 'v1',
      provider: params.provider ?? null,
      tokens: params.tokens ?? { prompt: 0, completion: 0, total: 0 },
      piiRedacted: params.piiRedacted ?? false,
      piiRedactionCount: params.piiRedactionCount ?? 0,
    };

    this.entries.push(entry);
    return entry;
  }

  /**
   * Get all logged entries.
   */
  getEntries(): readonly ShadowLogEntry[] {
    return this.entries;
  }

  /**
   * Get disagreements only.
   */
  getDisagreements(): ShadowLogEntry[] {
    return this.entries.filter(e => !e.agreement && e.llm !== null);
  }

  /**
   * Get high-risk disagreements that need review.
   */
  getHighRiskDisagreements(): ShadowLogEntry[] {
    return this.entries.filter(e => e.highRiskDisagreement);
  }

  /**
   * Generate summary statistics.
   */
  summarize(): ShadowSummary {
    const total = this.entries.length;
    if (total === 0) {
      return this.emptySummary();
    }

    const withLLM = this.entries.filter(e => e.llm !== null);
    const agreements = this.entries.filter(e => e.agreement);
    const disagreements = this.entries.filter(e => !e.agreement && e.llm !== null);
    const highRisk = this.entries.filter(e => e.highRiskDisagreement);
    const reviewNeeded = this.entries.filter(e => e.needsReview);
    const llmSuccess = withLLM.filter(e => e.llm !== null);
    const schemaValid = withLLM.filter(e => e.merged.reason !== 'llm_invalid_response');

    // Latency percentiles
    const ruleLatencies = this.entries.map(e => e.latency.ruleMs).sort((a, b) => a - b);
    const llmLatencies = withLLM.map(e => e.latency.llmMs).sort((a, b) => a - b);
    const totalLatencies = this.entries.map(e => e.latency.totalMs).sort((a, b) => a - b);

    // Per-category accuracy (where ground truth matches rule)
    const perCategory: Record<string, { ruleCorrect: number; total: number; accuracy: number }> = {};
    for (const entry of this.entries) {
      const cat = entry.merged.category;
      if (!perCategory[cat]) {
        perCategory[cat] = { ruleCorrect: 0, total: 0, accuracy: 0 };
      }
      perCategory[cat].total++;
      if (entry.agreement || entry.merged.source === 'rule') {
        perCategory[cat].ruleCorrect++;
      }
    }
    for (const cat of Object.keys(perCategory)) {
      const p = perCategory[cat];
      p.accuracy = p.total > 0 ? p.ruleCorrect / p.total : 0;
    }

    // Provider breakdown
    const providerBreakdown: Record<string, { calls: number; failures: number; avgLatencyMs: number; totalTokens: number }> = {};
    for (const entry of withLLM) {
      const prov = entry.provider ?? 'unknown';
      if (!providerBreakdown[prov]) {
        providerBreakdown[prov] = { calls: 0, failures: 0, avgLatencyMs: 0, totalTokens: 0 };
      }
      providerBreakdown[prov].calls++;
      providerBreakdown[prov].totalTokens += entry.tokens.total;
      providerBreakdown[prov].avgLatencyMs += entry.latency.llmMs;
      if (entry.merged.reason === 'llm_timeout' || entry.merged.reason === 'llm_fallback_to_rule') {
        providerBreakdown[prov].failures++;
      }
    }
    for (const prov of Object.keys(providerBreakdown)) {
      const p = providerBreakdown[prov];
      p.avgLatencyMs = p.calls > 0 ? p.avgLatencyMs / p.calls : 0;
    }

    return {
      totalEntries: total,
      agreementCount: agreements.length,
      disagreementCount: disagreements.length,
      agreementRate: withLLM.length > 0 ? agreements.length / withLLM.length : 1,
      highRiskDisagreementCount: highRisk.length,
      reviewNeededCount: reviewNeeded.length,
      llmCalledCount: withLLM.length,
      llmCallRatio: total > 0 ? withLLM.length / total : 0,
      llmSuccessCount: llmSuccess.length,
      llmSchemaValidCount: schemaValid.length,
      schemaValidRate: withLLM.length > 0 ? schemaValid.length / withLLM.length : 1,
      latency: {
        ruleP50: percentile(ruleLatencies, 50),
        ruleP95: percentile(ruleLatencies, 95),
        llmP50: percentile(llmLatencies, 50),
        llmP95: percentile(llmLatencies, 95),
        totalP50: percentile(totalLatencies, 50),
        totalP95: percentile(totalLatencies, 95),
      },
      perCategory,
      providerBreakdown,
    };
  }

  /**
   * Export entries as JSON.
   */
  exportJSON(): string {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      entryCount: this.entries.length,
      summary: this.summarize(),
      entries: this.entries,
    }, null, 2);
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.entries = [];
    this.nextId = 1;
  }

  // ── Private ──────────────────────────────────────────────────────

  private isHighRisk(ruleCat: string, llmCat: string): boolean {
    const pairs: Array<[string, string]> = [
      ['CEO', 'WORK_SUPPORT'],
      ['WORK_SUPPORT', 'CEO'],
      ['FINANCE', 'WORK_SUPPORT'],
      ['WORK_SUPPORT', 'FINANCE'],
    ];
    return pairs.some(([a, b]) =>
      (ruleCat === a && llmCat === b) || (ruleCat === b && llmCat === a),
    );
  }

  private emptySummary(): ShadowSummary {
    return {
      totalEntries: 0,
      agreementCount: 0,
      disagreementCount: 0,
      agreementRate: 1,
      highRiskDisagreementCount: 0,
      reviewNeededCount: 0,
      llmCalledCount: 0,
      llmCallRatio: 0,
      llmSuccessCount: 0,
      llmSchemaValidCount: 0,
      schemaValidRate: 1,
      latency: { ruleP50: 0, ruleP95: 0, llmP50: 0, llmP95: 0, totalP50: 0, totalP95: 0 },
      perCategory: {},
      providerBreakdown: {},
    };
  }
}

// ── Utility ───────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}
