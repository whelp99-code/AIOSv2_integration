/**
 * Manual Review Queue — Phase 3
 *
 * Collects high-risk disagreements and uncertain classifications
 * for human review. Stores entries in memory with export capability.
 *
 * Source: docs/54-llm-classifier-model-integration-replan.md Phase 3
 */

import type { PersonaType } from './classifier';

// ── Types ─────────────────────────────────────────────────────────────

export type ReviewStatus = 'pending' | 'reviewed' | 'resolved' | 'escalated';
export type ReviewPriority = 'low' | 'medium' | 'high' | 'critical';

export interface ReviewEntry {
  /** Unique review ID */
  id: string;
  /** Timestamp when queued */
  queuedAt: string;
  /** Timestamp when reviewed (null if pending) */
  reviewedAt: string | null;
  /** Mail ID */
  mailId: string;
  /** Mail subject (for display) */
  subject: string;
  /** Mail from (domain only for privacy) */
  fromDomain: string;
  /** Rule classification */
  ruleCategory: PersonaType;
  ruleConfidence: number;
  /** LLM classification */
  llmCategory: PersonaType | null;
  llmConfidence: number | null;
  /** Final classification */
  finalCategory: PersonaType;
  /** Review reason */
  reason: 'high_risk_disagreement' | 'low_confidence' | 'conflict' | 'schema_mismatch' | 'injection_detected';
  /** Priority based on risk */
  priority: ReviewPriority;
  /** Review status */
  status: ReviewStatus;
  /** Reviewer notes */
  reviewerNotes: string | null;
  /** Resolved category (after human review) */
  resolvedCategory: PersonaType | null;
  /** Rule names that matched */
  matchedRules: string[];
}

export interface ReviewQueueStats {
  total: number;
  pending: number;
  reviewed: number;
  resolved: number;
  escalated: number;
  byPriority: Record<ReviewPriority, number>;
  byReason: Record<string, number>;
  avgReviewTimeMs: number;
}

// ── Manual Review Queue ───────────────────────────────────────────────

export class ManualReviewQueue {
  private entries: ReviewEntry[] = [];
  private nextId = 1;

  /**
   * Add an entry to the review queue.
   */
  enqueue(params: {
    mailId: string;
    subject: string;
    fromDomain: string;
    ruleCategory: PersonaType;
    ruleConfidence: number;
    llmCategory?: PersonaType | null;
    llmConfidence?: number | null;
    finalCategory: PersonaType;
    reason: ReviewEntry['reason'];
    matchedRules?: string[];
  }): ReviewEntry {
    const entry: ReviewEntry = {
      id: `review-${String(this.nextId++).padStart(6, '0')}`,
      queuedAt: new Date().toISOString(),
      reviewedAt: null,
      mailId: params.mailId,
      subject: params.subject,
      fromDomain: params.fromDomain,
      ruleCategory: params.ruleCategory,
      ruleConfidence: params.ruleConfidence,
      llmCategory: params.llmCategory ?? null,
      llmConfidence: params.llmConfidence ?? null,
      finalCategory: params.finalCategory,
      reason: params.reason,
      priority: this.calculatePriority(params.reason, params.ruleConfidence),
      status: 'pending',
      reviewerNotes: null,
      resolvedCategory: null,
      matchedRules: params.matchedRules ?? [],
    };

    this.entries.push(entry);
    return entry;
  }

  /**
   * Mark an entry as reviewed with resolution.
   */
  review(
    id: string,
    resolution: {
      status: 'resolved' | 'escalated';
      resolvedCategory?: PersonaType;
      notes?: string;
    },
  ): ReviewEntry | null {
    const entry = this.entries.find(e => e.id === id);
    if (!entry) return null;

    entry.reviewedAt = new Date().toISOString();
    entry.status = resolution.status;
    entry.resolvedCategory = resolution.resolvedCategory ?? null;
    entry.reviewerNotes = resolution.notes ?? null;

    return entry;
  }

  /**
   * Get all pending entries sorted by priority (critical first).
   */
  getPending(): ReviewEntry[] {
    const priorityOrder: Record<ReviewPriority, number> = {
      critical: 0, high: 1, medium: 2, low: 3,
    };
    return this.entries
      .filter(e => e.status === 'pending')
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  /**
   * Get entry by ID.
   */
  getById(id: string): ReviewEntry | null {
    return this.entries.find(e => e.id === id) ?? null;
  }

  /**
   * Get all entries.
   */
  getAll(): readonly ReviewEntry[] {
    return this.entries;
  }

  /**
   * Get queue statistics.
   */
  stats(): ReviewQueueStats {
    const total = this.entries.length;
    const pending = this.entries.filter(e => e.status === 'pending').length;
    const reviewed = this.entries.filter(e => e.status === 'reviewed').length;
    const resolved = this.entries.filter(e => e.status === 'resolved').length;
    const escalated = this.entries.filter(e => e.status === 'escalated').length;

    const byPriority: Record<ReviewPriority, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    const byReason: Record<string, number> = {};

    for (const entry of this.entries) {
      byPriority[entry.priority]++;
      byReason[entry.reason] = (byReason[entry.reason] || 0) + 1;
    }

    // Average review time for resolved entries
    const resolvedEntries = this.entries.filter(e => e.reviewedAt);
    const totalReviewTime = resolvedEntries.reduce((sum, e) => {
      return sum + (new Date(e.reviewedAt!).getTime() - new Date(e.queuedAt).getTime());
    }, 0);
    const avgReviewTimeMs = resolvedEntries.length > 0 ? totalReviewTime / resolvedEntries.length : 0;

    return { total, pending, reviewed, resolved, escalated, byPriority, byReason, avgReviewTimeMs };
  }

  /**
   * Export queue as JSON.
   */
  exportJSON(): string {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      stats: this.stats(),
      entries: this.entries,
    }, null, 2);
  }

  // ── Private ──────────────────────────────────────────────────────

  private calculatePriority(reason: ReviewEntry['reason'], confidence: number): ReviewPriority {
    if (reason === 'injection_detected') return 'critical';
    if (reason === 'high_risk_disagreement') return 'high';
    if (reason === 'schema_mismatch') return 'high';
    if (reason === 'conflict' && confidence < 0.5) return 'high';
    if (reason === 'low_confidence' && confidence < 0.5) return 'medium';
    return 'low';
  }
}
