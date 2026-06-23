/**
 * Mail Insight Engine — Phase 5
 *
 * Orchestrates Wave B capabilities:
 * - Thread-level mail grouping and summary generation
 * - Derived candidate creation (always 'proposed' status)
 * - Policy memory management with versioned read path
 * - Notification routing (immediate vs daily digest)
 *
 * Source: docs/54-llm-classifier-model-integration-replan.md Phase 5
 */

import type { PersonaType } from './classifier';
import type { WaveBStore, CandidateType, NotificationChannel, NotificationSeverity } from './wave-b-store';

// ── Types ─────────────────────────────────────────────────────────────

export interface ThreadSummaryInput {
  threadKey: string;
  threadTitle: string;
  accountEmail?: string;
  messages: Array<{
    id: string;
    subject: string;
    fromEmail: string;
    bodyPreview?: string;
    receivedAt: string;
  }>;
}

export interface CandidateSuggestion {
  candidateType: CandidateType;
  title: string;
  summary: string;
  sourceTitle?: string;
  sourceSender?: string;
  sourceReceivedAt?: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface PolicyUpdate {
  policyKey: string;
  config: Record<string, unknown>;
  reason: string;
  approvedBy?: string;
}

// ── Mail Insight Engine ───────────────────────────────────────────────

export class MailInsightEngine {
  private store: WaveBStore;

  constructor(store: WaveBStore) {
    this.store = store;
  }

  // ── Thread Management ──────────────────────────────────────────

  /**
   * Process a group of related messages into an insight thread.
   * Groups messages by threadKey and creates/updates a thread with summary.
   */
  processThread(input: ThreadSummaryInput): {
    thread: ReturnType<WaveBStore['createInsightThread']>;
    isNew: boolean;
    candidates: ReturnType<WaveBStore['createCandidate']>[];
  } {
    // Check if thread already exists
    const existing = this.store.getThreadByThreadKey(input.threadKey);

    if (existing) {
      // Update existing thread
      existing.messageCount += input.messages.length;
      existing.messageIds.push(...input.messages.map(m => m.id));
      existing.latestReceivedAt = input.messages[input.messages.length - 1]?.receivedAt ?? existing.latestReceivedAt;
      existing.updatedAt = new Date().toISOString();

      // Generate candidates from new messages
      const candidates = this.generateCandidates(input);

      return { thread: existing, isNew: false, candidates };
    }

    // Store messages
    for (const msg of input.messages) {
      this.store.recordMessage({
        accountId: 'default',
        subject: msg.subject,
        fromEmail: msg.fromEmail,
        bodyPreview: msg.bodyPreview,
        groupKey: input.threadKey,
      });
    }

    // Create thread
    const thread = this.store.createInsightThread({
      threadKey: input.threadKey,
      threadTitle: input.threadTitle,
      accountEmail: input.accountEmail,
      messageIds: input.messages.map(m => m.id),
      summary: this.generateThreadSummary(input),
      nextActions: this.suggestNextActions(input),
      aiEnhanced: true,
    });

    // Generate candidates
    const candidates = this.generateCandidates(input);

    return { thread, isNew: true, candidates };
  }

  /**
   * Generate a thread summary from messages.
   */
  private generateThreadSummary(input: ThreadSummaryInput): string {
    const subject = input.threadTitle || input.messages[0]?.subject || 'No subject';
    const senderCount = new Set(input.messages.map(m => m.fromEmail)).size;
    const msgCount = input.messages.length;

    return `[${msgCount}건 메일, ${senderCount}명 발신자] ${subject}`;
  }

  /**
   * Suggest next actions based on thread content.
   */
  private suggestNextActions(input: ThreadSummaryInput): string[] {
    const actions: string[] = [];
    const text = input.messages.map(m => `${m.subject} ${m.bodyPreview ?? ''}`).join(' ').toLowerCase();

    if (text.includes('견적') || text.includes('quote')) {
      actions.push('견적서 준비');
    }
    if (text.includes('데모') || text.includes('demo') || text.includes('poc')) {
      actions.push('데모 일정 조율');
    }
    if (text.includes('회의') || text.includes('meeting')) {
      actions.push('회의 일정 확인');
    }
    if (text.includes('승인') || text.includes('approval')) {
      actions.push('승인 처리');
    }
    if (text.includes('리뷰') || text.includes('review')) {
      actions.push('리뷰 완료');
    }
    if (actions.length === 0) {
      actions.push('메일 확인');
    }
    return actions;
  }

  // ── Derived Candidate Generation ───────────────────────────────

  /**
   * Generate candidates from thread messages.
   * ALL candidates are created with status='proposed'.
   * Auto-promotion is forbidden per replan constraints.
   */
  private generateCandidates(input: ThreadSummaryInput): ReturnType<WaveBStore['createCandidate']>[] {
    const candidates: ReturnType<WaveBStore['createCandidate']>[] = [];
    const text = input.messages.map(m => `${m.subject} ${m.bodyPreview ?? ''}`).join(' ').toLowerCase();

    // Customer candidate
    if (text.includes('고객') || text.includes('customer') || text.includes('@customer.com')) {
      candidates.push(this.store.createCandidate({
        candidateType: 'customer',
        title: `고객 후보: ${input.threadTitle}`,
        summary: `메일 스레드에서 고객 관련 패턴 탐지`,
        sourceTitle: input.threadTitle,
        sourceSender: input.messages[0]?.fromEmail,
        confidence: 70,
      }));
    }

    // Project candidate
    if (text.includes('프로젝트') || text.includes('project') || text.includes('poc')) {
      candidates.push(this.store.createCandidate({
        candidateType: 'project',
        title: `프로젝트 후보: ${input.threadTitle}`,
        summary: `메일 스레드에서 프로젝트 관련 패턴 탐지`,
        sourceTitle: input.threadTitle,
        sourceSender: input.messages[0]?.fromEmail,
        confidence: 65,
      }));
    }

    // Knowledge candidate
    if (text.includes('기술') || text.includes('solution') || text.includes('architecture') || text.includes('faq')) {
      candidates.push(this.store.createCandidate({
        candidateType: 'knowledge',
        title: `지식 문서 후보: ${input.threadTitle}`,
        summary: `메일 스레드에서 기술 지식 패턴 탐지`,
        sourceTitle: input.threadTitle,
        confidence: 60,
      }));
    }

    return candidates;
  }

  // ── Policy Management ──────────────────────────────────────────

  /**
   * Update a runtime policy. Records the change in PolicyDecisionLog.
   * Policy changes require approval — logged with approvedBy.
   */
  updatePolicy(update: PolicyUpdate): {
    policy: ReturnType<WaveBStore['setRuntimePolicy']>;
    decision: ReturnType<WaveBStore['logPolicyDecision']>;
  } {
    const policy = this.store.setRuntimePolicy(update.policyKey, update.config);

    const decision = this.store.logPolicyDecision({
      entityType: 'RuntimePolicy',
      entityId: policy.id,
      decisionType: 'config_change',
      inputJson: { reason: update.reason, previousVersion: policy.version - 1 },
      outputJson: { config: update.config, newVersion: policy.version },
      approvedBy: update.approvedBy,
    });

    return { policy, decision };
  }

  /**
   * Get the current runtime policy config (versioned read path).
   */
  getPolicyConfig(key: string): Record<string, unknown> | null {
    const policy = this.store.getRuntimePolicy(key);
    return policy?.configJson ?? null;
  }

  /**
   * Set a policy memory entry.
   */
  setMemory(params: {
    memoryType: 'classification' | 'routing' | 'threshold' | 'prompt';
    key: string;
    label: string;
    value: Record<string, unknown>;
    source?: 'seed' | 'learned' | 'manual';
  }): ReturnType<WaveBStore['setPolicyMemory']> {
    return this.store.setPolicyMemory({
      memoryType: params.memoryType,
      key: params.key,
      label: params.label,
      valueJson: params.value,
      source: params.source,
    });
  }

  // ── Notifications ──────────────────────────────────────────────

  /**
   * Send a notification. Routes to immediate or daily digest.
   */
  notify(params: {
    severity: NotificationSeverity;
    eventType: string;
    message: string;
    metadata?: Record<string, unknown>;
  }): ReturnType<WaveBStore['notify']> {
    // Critical notifications are always immediate
    const channel: NotificationChannel = params.severity === 'critical' ? 'immediate' : 'daily_digest';

    return this.store.notify({
      channel,
      severity: params.severity,
      eventType: params.eventType,
      message: params.message,
      metadata: params.metadata,
    });
  }

  /**
   * Flush pending daily digest notifications.
   */
  flushDigest(): number {
    return this.store.markDigestDelivered();
  }

  // ── Knowledge ──────────────────────────────────────────────────

  /**
   * Index a knowledge document with chunking.
   */
  indexDocument(params: { title: string; docType: 'sop' | 'faq' | 'brand_guide' | 'product_doc' | 'other'; content: string }) {
    return this.store.createKnowledgeDocument(params);
  }

  /**
   * Search knowledge chunks by keyword.
   */
  searchKnowledge(query: string): Array<{ document: string; chunkIndex: number; content: string }> {
    const lowerQuery = query.toLowerCase();
    const results: Array<{ document: string; chunkIndex: number; content: string }> = [];

    for (const chunk of this.store.knowledgeChunks) {
      if (chunk.content.toLowerCase().includes(lowerQuery)) {
        const doc = this.store.knowledgeDocuments.find(d => d.id === chunk.documentId);
        results.push({
          document: doc?.title ?? 'unknown',
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
        });
      }
    }
    return results;
  }

  // ── Summary ────────────────────────────────────────────────────

  summary(): Record<string, number> {
    return this.store.summary();
  }
}
