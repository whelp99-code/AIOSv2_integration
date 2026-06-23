/**
 * HybridMailClassifier — Phase 2: Compatibility Layer & Hybrid Classifier
 *
 * Async hybrid classifier that combines rule-based and LLM classification:
 * - Uses RuleClassifier for fast path (high confidence, no conflict)
 * - Calls LLMGateway for uncertain cases
 * - Merges rule/LLM decisions with disagreement policy
 * - Supports 5 rollout modes via RolloutConfig
 * - In rules-only mode, produces identical results to MailClassifier
 *
 * Source: docs/54-llm-classifier-model-integration-replan.md Phase 2
 */

import {
  type ClassificationResult,
  type MailItem,
} from './classifier';
import {
  RuleClassifier,
  normalizeMailItem,
  type RuleClassificationResult,
} from './rule-classifier';
import {
  LLMGateway,
  type ClassificationCallRequest,
  type ClassificationCallResult,
} from './llm-gateway';
import {
  type ClassifierMode,
  type RolloutConfig,
  loadRolloutConfig,
  shouldCallLLM,
  getEffectiveMode,
} from './rollout-config';

// ── Types ─────────────────────────────────────────────────────────────

export type DecisionSource = 'rule' | 'llm' | 'merged' | 'manual-review';
export type DecisionReason =
  | 'rule_accept'
  | 'llm_accept'
  | 'rule_llm_agree'
  | 'rule_llm_disagree_low_risk'
  | 'rule_llm_disagree_high_risk'
  | 'llm_fallback_to_rule'
  | 'llm_timeout'
  | 'llm_budget_exceeded'
  | 'llm_invalid_response'
  | 'mode_rules_only';

export interface HybridClassificationResult {
  /** Final classification result (compatible with ClassificationResult) */
  result: ClassificationResult;
  /** Decision source */
  source: DecisionSource;
  /** Decision reason */
  reason: DecisionReason;
  /** Rule classifier output (always available) */
  ruleResult: RuleClassificationResult;
  /** LLM result (null if not called or failed) */
  llmResult: ClassificationCallResult | null;
  /** Whether this case needs manual review */
  needsReview: boolean;
  /** Current effective mode */
  mode: ClassifierMode;
  /** Total latency in ms */
  latencyMs: number;
}

export interface ClassifyOptions {
  /** Override rollout config for this call */
  mode?: ClassifierMode;
  /** Request index for canary percentage */
  requestIndex?: number;
}

// ── HybridMailClassifier ──────────────────────────────────────────────

export class HybridMailClassifier {
  private ruleClassifier: RuleClassifier;
  private gateway: LLMGateway | null;
  private config: RolloutConfig;
  private requestCounter: number = 0;

  constructor(options?: {
    ruleClassifier?: RuleClassifier;
    gateway?: LLMGateway | null;
    config?: RolloutConfig;
  }) {
    this.ruleClassifier = options?.ruleClassifier ?? new RuleClassifier();
    this.gateway = options?.gateway ?? null;
    this.config = options?.config ?? loadRolloutConfig();
  }

  /**
   * Async hybrid classification entry point.
   *
   * In rules-only mode, this returns the exact same result as
   * MailClassifier.classify() — the compatibility guarantee.
   */
  async classifyAsync(
    mail: Partial<MailItem> & { id: string },
    options?: ClassifyOptions,
  ): Promise<HybridClassificationResult> {
    const start = Date.now();
    const normalized = normalizeMailItem(mail);
    const mode = options?.mode ?? getEffectiveMode(this.config);
    const requestIndex = options?.requestIndex ?? this.requestCounter++;

    // Step 1: Always run rule classification
    const ruleResult = this.ruleClassifier.classify(normalized);

    // Step 2: In rules-only or kill-switch mode, return rule result directly
    if (mode === 'rules-only' || mode === 'kill-switch') {
      return {
        result: ruleResult.result,
        source: 'rule',
        reason: 'mode_rules_only',
        ruleResult,
        llmResult: null,
        needsReview: false,
        mode,
        latencyMs: Date.now() - start,
      };
    }

    // Step 3: Determine if LLM should be called
    const llmNeeded = this.shouldCallLLM(ruleResult, mode, requestIndex);

    if (!llmNeeded) {
      // Rule accept — high confidence, no conflict
      return {
        result: ruleResult.result,
        source: 'rule',
        reason: 'rule_accept',
        ruleResult,
        llmResult: null,
        needsReview: false,
        mode,
        latencyMs: Date.now() - start,
      };
    }

    // Step 4: Call LLM through gateway
    const llmResult = await this.callLLM(normalized);

    // Step 5: Merge decisions
    return this.mergeDecisions(ruleResult, llmResult, mode, start);
  }

  /**
   * Synchronous classify (rules-only).
   * Preserves backward compatibility with MailClassifier.classify().
   */
  classify(mail: Partial<MailItem> & { id: string }): ClassificationResult {
    const normalized = normalizeMailItem(mail);
    return this.ruleClassifier.classify(normalized).result;
  }

  // ── Private Methods ────────────────────────────────────────────────

  /**
   * Determine if LLM should be called based on rule result and mode.
   */
  private shouldCallLLM(
    ruleResult: RuleClassificationResult,
    mode: ClassifierMode,
    requestIndex: number,
  ): boolean {
    // Check if LLM calling is allowed in this mode
    if (!shouldCallLLM(this.config)) return false;

    // In shadow mode, always call LLM (but only log, don't route)
    if (mode === 'shadow') return true;

    // In canary mode, check if this request is in the canary group
    if (mode === 'canary') {
      const canaryPercent = this.config.canaryPercentage;
      if (requestIndex % 100 >= canaryPercent) return false;
    }

    // For hybrid/canary (in canary group), use rule result to decide
    return ruleResult.needsLLM;
  }

  /**
   * Call LLM through gateway with fallback handling.
   */
  private async callLLM(mail: MailItem): Promise<ClassificationCallResult | null> {
    if (!this.gateway) return null;

    try {
      const request: ClassificationCallRequest = {
        subject: mail.subject,
        body: mail.body,
        from: mail.from,
      };
      return await this.gateway.classify(request);
    } catch {
      // LLM call failed — will fall back to rule result
      return null;
    }
  }

  /**
   * Merge rule and LLM decisions according to the disagreement policy.
   *
   * Policy (from replan):
   * - LLM confident + agrees with rule → accept LLM
   * - LLM confident + disagrees (low risk) → accept LLM
   * - LLM confident + disagrees (high risk) → manual review
   * - LLM failed/timeout/budget → rule fallback
   * - In shadow mode → always return rule result, log LLM separately
   */
  private mergeDecisions(
    ruleResult: RuleClassificationResult,
    llmResult: ClassificationCallResult | null,
    mode: ClassifierMode,
    start: number,
  ): HybridClassificationResult {
    // Shadow mode: always use rule result for routing
    if (mode === 'shadow') {
      return {
        result: ruleResult.result,
        source: 'rule',
        reason: ruleResult.needsLLM ? 'rule_accept' : 'rule_accept',
        ruleResult,
        llmResult,
        needsReview: false,
        mode,
        latencyMs: Date.now() - start,
      };
    }

    // LLM failed or not available
    if (!llmResult || llmResult.fallbackToRule || !llmResult.classification) {
      const reason: DecisionReason = !llmResult
        ? 'llm_timeout'
        : llmResult.fallbackReason === 'schema_validation_failed'
          ? 'llm_invalid_response'
          : 'llm_fallback_to_rule';

      return {
        result: ruleResult.result,
        source: 'rule',
        reason,
        ruleResult,
        llmResult,
        needsReview: false,
        mode,
        latencyMs: Date.now() - start,
      };
    }

    // LLM succeeded — check agreement
    const llmCategory = llmResult.classification.category;
    const ruleCategory = ruleResult.result.category;
    const agrees = llmCategory === ruleCategory;

    if (agrees) {
      // Rule and LLM agree — use higher confidence
      const merged: ClassificationResult = {
        category: ruleCategory,
        confidence: Math.max(ruleResult.result.confidence, llmResult.classification.confidence),
        matchedRules: ruleResult.result.matchedRules,
      };
      return {
        result: merged,
        source: 'merged',
        reason: 'rule_llm_agree',
        ruleResult,
        llmResult,
        needsReview: false,
        mode,
        latencyMs: Date.now() - start,
      };
    }

    // Disagreement — check if high-risk
    const isHighRisk = this.isHighRiskDisagreement(ruleCategory, llmCategory);

    if (isHighRisk) {
      // High-risk disagreement → manual review
      return {
        result: {
          ...ruleResult.result,
          originalCategory: llmCategory,
        },
        source: 'manual-review',
        reason: 'rule_llm_disagree_high_risk',
        ruleResult,
        llmResult,
        needsReview: true,
        mode,
        latencyMs: Date.now() - start,
      };
    }

    // Low-risk disagreement — accept LLM if more confident
    if (llmResult.classification.confidence > ruleResult.result.confidence) {
      return {
        result: {
          category: llmCategory,
          confidence: llmResult.classification.confidence,
          matchedRules: ruleResult.result.matchedRules,
          originalCategory: ruleCategory,
        },
        source: 'llm',
        reason: 'rule_llm_disagree_low_risk',
        ruleResult,
        llmResult,
        needsReview: false,
        mode,
        latencyMs: Date.now() - start,
      };
    }

    // LLM not more confident — stick with rule
    return {
      result: ruleResult.result,
      source: 'rule',
      reason: 'rule_llm_disagree_low_risk',
      ruleResult,
      llmResult,
      needsReview: false,
      mode,
      latencyMs: Date.now() - start,
    };
  }

  /**
   * High-risk disagreements that require manual review.
   * These are category pairs where wrong routing has serious consequences.
   */
  private isHighRiskDisagreement(ruleCategory: string, llmCategory: string): boolean {
    const highRiskPairs: Array<[string, string]> = [
      ['CEO', 'WORK_SUPPORT'],      // CEO mail misclassified as support
      ['WORK_SUPPORT', 'CEO'],       // Support mail escalated to CEO
      ['FINANCE', 'WORK_SUPPORT'],   // Finance mail lost
      ['WORK_SUPPORT', 'FINANCE'],   // Support misrouted to finance
    ];

    return highRiskPairs.some(
      ([a, b]) => (ruleCategory === a && llmCategory === b) || (ruleCategory === b && llmCategory === a),
    );
  }
}
