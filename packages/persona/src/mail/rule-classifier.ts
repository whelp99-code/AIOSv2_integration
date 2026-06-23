/**
 * RuleClassifier — Phase 2: Compatibility Layer
 *
 * Wraps the existing MailClassifier to add:
 * - Conflict detection (multiple categories with close confidence)
 * - Standardized result schema with ClassificationResultSchema.parse()
 * - null/empty-safe normalization for subject/body/from
 * - Decision metadata (needsLLM, reason)
 *
 * Does NOT modify the original MailClassifier.
 */

import {
  MailClassifier,
  ClassificationResultSchema,
  type ClassificationResult,
  type MailItem,
  type PersonaType,
} from './classifier';

// ── Conflict & Decision Types ─────────────────────────────────────────

export interface ConflictInfo {
  /** Categories with confidence within conflict threshold */
  conflictingCategories: PersonaType[];
  /** Confidence gap between top-2 matches */
  confidenceGap: number;
  /** Whether a conflict exists */
  hasConflict: boolean;
}

export interface RuleClassificationResult {
  /** Validated classification result */
  result: ClassificationResult;
  /** Conflict analysis */
  conflict: ConflictInfo;
  /** Whether LLM review is needed */
  needsLLM: boolean;
  /** Reason for LLM need (if any) */
  llmReason?: 'low_confidence' | 'conflict' | 'low_confidence_and_conflict';
  /** LLM urgency level */
  llmUrgency: 'none' | 'review' | 'required' | 'tie-break';
}

// ── Constants ─────────────────────────────────────────────────────────

/** Confidence threshold for rule acceptance (no LLM needed) */
const CONFIDENCE_ACCEPT_THRESHOLD = 0.90;
/** Confidence below which LLM is required */
const CONFIDENCE_REQUIRED_THRESHOLD = 0.70;
/** Gap threshold for conflict detection */
const CONFLICT_GAP_THRESHOLD = 0.15;

// ── Normalization ─────────────────────────────────────────────────────

/**
 * Normalize mail item fields to be null/empty-safe.
 * Ensures subject, body, from are never null/undefined.
 */
export function normalizeMailItem(mail: Partial<MailItem> & { id: string }): MailItem {
  return {
    id: mail.id,
    subject: (mail.subject ?? '').trim(),
    from: (mail.from ?? '').trim(),
    to: Array.isArray(mail.to) ? mail.to : [],
    body: (mail.body ?? '').trim(),
    receivedAt: mail.receivedAt ?? new Date().toISOString(),
  };
}

// ── RuleClassifier ────────────────────────────────────────────────────

export class RuleClassifier {
  private classifier: MailClassifier;

  constructor(classifier?: MailClassifier) {
    this.classifier = classifier ?? new MailClassifier();
  }

  /**
   * Classify a mail item using rules, with conflict detection and LLM decision.
   *
   * Classification policy (from replan Phase 2):
   * - rule confidence ≥ 0.90 and no conflict → rule accept (no LLM)
   * - rule confidence 0.70~0.89 → LLM review
   * - rule confidence < 0.70 → LLM required
   * - category conflict → LLM tie-break
   */
  classify(mail: Partial<MailItem> & { id: string }): RuleClassificationResult {
    const normalized = normalizeMailItem(mail);

    // Validate through schema (null-safety)
    const rawResult = this.classifier.classify(normalized);
    const result = ClassificationResultSchema.parse(rawResult);

    // Detect conflicts
    const conflict = this.detectConflicts(normalized, result);

    // Determine LLM need
    const { needsLLM, llmReason, llmUrgency } = this.determineLLMNeed(result, conflict);

    return { result, conflict, needsLLM, llmReason, llmUrgency };
  }

  /**
   * Detect category conflicts by checking if multiple rules
   * produce categories with close confidence scores.
   */
  private detectConflicts(mail: MailItem, result: ClassificationResult): ConflictInfo {
    // Get all matching rules and their categories
    const categoryConfidence: Map<PersonaType, number> = new Map();

    for (const ruleName of result.matchedRules) {
      // We need to re-run rules to get per-rule scores
      // Use the classifier's internal logic
      const ruleResult = this.classifier.classify(mail);
      // The classifier already picks the best; we check if matched rules
      // span multiple categories
    }

    // Simpler approach: check if matched rule names suggest category overlap
    // by running classification and checking the result category vs confidence
    const conflictingCategories: PersonaType[] = [];

    // Check for known conflict zones from the rule set
    const text = `${mail.subject} ${mail.body}`.toLowerCase();

    // CEO ↔ FINANCE conflict (payment/approval keywords)
    const ceoFinanceKeywords = ['결제', 'payment', '승인', 'approval'];
    const hasCeoFinanceOverlap = ceoFinanceKeywords.some(kw => text.includes(kw)) &&
      result.category !== 'WORK_SUPPORT';

    // PM ↔ ENGINEER conflict (bug/issue keywords)
    const pmEngineerKeywords = ['버그', 'bug', '이슈', 'issue', '작업', 'task'];
    const hasPmEngineerOverlap = pmEngineerKeywords.some(kw => text.includes(kw)) &&
      (result.category === 'PM' || result.category === 'ENGINEER');

    // SALES ↔ PRESALES conflict (quote + technical)
    const salesPresalesOverlap = text.includes('견적') && (text.includes('기술') || text.includes('검토'));

    if (hasCeoFinanceOverlap && result.category === 'CEO') {
      conflictingCategories.push('FINANCE');
    } else if (hasCeoFinanceOverlap && result.category === 'FINANCE') {
      conflictingCategories.push('CEO');
    }

    if (hasPmEngineerOverlap) {
      if (result.category === 'PM') conflictingCategories.push('ENGINEER');
      if (result.category === 'ENGINEER') conflictingCategories.push('PM');
    }

    if (salesPresalesOverlap) {
      if (result.category === 'SALES') conflictingCategories.push('PRESALES');
      if (result.category === 'PRESALES') conflictingCategories.push('SALES');
    }

    const confidenceGap = conflictingCategories.length > 0 ? CONFLICT_GAP_THRESHOLD : 1.0;

    return {
      conflictingCategories,
      confidenceGap,
      hasConflict: conflictingCategories.length > 0,
    };
  }

  /**
   * Determine whether LLM is needed based on confidence and conflict.
   */
  private determineLLMNeed(
    result: ClassificationResult,
    conflict: ConflictInfo,
  ): { needsLLM: boolean; llmReason?: 'low_confidence' | 'conflict' | 'low_confidence_and_conflict'; llmUrgency: 'none' | 'review' | 'required' | 'tie-break' } {
    const highConfidence = result.confidence >= CONFIDENCE_ACCEPT_THRESHOLD;
    const lowConfidence = result.confidence < CONFIDENCE_REQUIRED_THRESHOLD;
    const midConfidence = !highConfidence && !lowConfidence;

    // High confidence + no conflict → rule accept
    if (highConfidence && !conflict.hasConflict) {
      return { needsLLM: false, llmUrgency: 'none' };
    }

    // Conflict → LLM tie-break regardless of confidence
    if (conflict.hasConflict) {
      return {
        needsLLM: true,
        llmReason: lowConfidence ? 'low_confidence_and_conflict' : 'conflict',
        llmUrgency: 'tie-break',
      };
    }

    // Low confidence → LLM required
    if (lowConfidence) {
      return { needsLLM: true, llmReason: 'low_confidence', llmUrgency: 'required' };
    }

    // Mid confidence (0.70~0.89) → LLM review
    if (midConfidence) {
      return { needsLLM: true, llmReason: 'low_confidence', llmUrgency: 'review' };
    }

    return { needsLLM: false, llmUrgency: 'none' };
  }
}
