/**
 * Canary Router — Phase 4: Canary Rollout
 *
 * Integrates HybridMailClassifier with WaveAStore for canary rollout.
 * Handles the 4-stage rollout: read path → shadow write → canary enable → full enable.
 * Supports instant rollback via HYBRID_CLASSIFIER_MODE=rules-only.
 *
 * Source: docs/54-llm-classifier-model-integration-replan.md Phase 4
 */

import type { MailItem, PersonaType } from './classifier';
import { HybridMailClassifier, type HybridClassificationResult, type ClassifyOptions } from './hybrid-classifier';
import { WaveAStore } from './wave-a-store';
import type { ClassifierMode, RolloutConfig } from './rollout-config';
import { loadRolloutConfig, getEffectiveMode } from './rollout-config';

// ── Types ─────────────────────────────────────────────────────────────

export interface CanaryRouterConfig {
  /** Rollout config (defaults to env-based) */
  rolloutConfig?: RolloutConfig;
  /** Whether to enable Wave A persistence writes */
  enableWrites?: boolean;
  /** Whether to enable shadow writes (always true in shadow/canary/hybrid) */
  enableShadowWrites?: boolean;
}

export interface CanaryRouterResult {
  /** Classification result */
  classification: HybridClassificationResult;
  /** Whether Wave A records were written */
  persisted: boolean;
  /** Wave A record IDs (if persisted) */
  recordIds?: {
    classificationId?: string;
    llmCallId?: string;
    costEventId?: string;
    auditLogId?: string;
    transitionId?: string;
  };
}

// ── Canary Router ─────────────────────────────────────────────────────

export class CanaryRouter {
  private classifier: HybridMailClassifier;
  private store: WaveAStore;
  private config: CanaryRouterConfig;
  private requestCounter: number = 0;

  constructor(options?: {
    classifier?: HybridMailClassifier;
    store?: WaveAStore;
    config?: CanaryRouterConfig;
  }) {
    this.classifier = options?.classifier ?? new HybridMailClassifier();
    this.store = options?.store ?? new WaveAStore();
    this.config = options?.config ?? {};
  }

  /**
   * Route a mail item through the canary pipeline.
   *
   * Stages:
   * 1. Read path — always works (no mutation)
   * 2. Shadow write — log classification to Wave A (if enabled)
   * 3. Canary/hybrid — route based on mode
   */
  async route(mail: Partial<MailItem> & { id: string }): Promise<CanaryRouterResult> {
    const mode = this.config.rolloutConfig
      ? getEffectiveMode(this.config.rolloutConfig)
      : getEffectiveMode(loadRolloutConfig());

    const requestIndex = this.requestCounter++;

    // Step 1: Classify
    const classification = await this.classifier.classifyAsync(mail, {
      mode,
      requestIndex,
    });

    // Step 2: Shadow write to Wave A (if enabled)
    const enableWrites = this.config.enableWrites ?? true;
    let recordIds: CanaryRouterResult['recordIds'];

    if (enableWrites) {
      const previousStatus = this.store.getClassificationsByMailId(mail.id).pop()?.status;
      const pipeline = this.store.recordPipelineResult({
        mailId: mail.id,
        classification: {
          personaType: classification.result.category,
          confidence: classification.result.confidence,
          matchedRules: classification.result.matchedRules,
          source: classification.source,
          reason: classification.reason,
        },
        llmCall: classification.llmResult && !classification.llmResult.fallbackToRule
          ? {
              provider: classification.llmResult.provider,
              model: 'unknown',
              inputTokens: classification.llmResult.tokens.prompt,
              outputTokens: classification.llmResult.tokens.completion,
              latencyMs: classification.llmResult.latencyMs,
              success: true,
            }
          : undefined,
        cost: classification.llmResult && classification.llmResult.tokens.total > 0
          ? { amountUsd: (classification.llmResult.tokens.total / 1000) * 0.002 }
          : undefined,
        previousStatus,
      });

      recordIds = {
        classificationId: pipeline.classification.id,
        llmCallId: pipeline.llmCall?.id,
        costEventId: pipeline.costEvent?.id,
        auditLogId: pipeline.auditLog.id,
        transitionId: pipeline.transition.id,
      };
    }

    return {
      classification,
      persisted: enableWrites,
      recordIds,
    };
  }

  /**
   * Get the Wave A store for inspection.
   */
  getStore(): WaveAStore {
    return this.store;
  }

  /**
   * Get current request counter.
   */
  getRequestCount(): number {
    return this.requestCounter;
  }

  /**
   * Record a quality gate result.
   */
  recordQualityGate(gateKey: string, requiredChecks: string[], actualResults: Record<string, boolean>) {
    return this.store.recordQualityGate({ gateKey, requiredChecks, actualResults });
  }

  /**
   * Record integration health.
   */
  recordHealth(serviceKey: string, status: 'healthy' | 'degraded' | 'down' | 'unknown', details?: Record<string, unknown>) {
    return this.store.recordHealth({ serviceKey, status, details });
  }

  /**
   * Record an error event.
   */
  recordError(source: string, message: string, details?: Record<string, unknown>) {
    return this.store.recordError({ source, message, details });
  }

  /**
   * Get store summary.
   */
  summary() {
    return this.store.summary();
  }
}
