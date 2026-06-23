/**
 * Wave B Store — Phase 5: Mail Insight, Knowledge & Policy
 *
 * In-memory store for the 10 Wave B models:
 * AutomationMailAccount, AutomationMailMessage, MailInsightThread,
 * MailDerivedCandidate, AutomationKnowledgeDocument, KnowledgeChunk,
 * PolicyMemory, PolicyDecisionLog, RuntimePolicy, NotificationEvent
 *
 * Key constraints from replan:
 * - 후보는 MailDerivedCandidate.status = 'proposed'로만 생성
 * - policy 변경은 approval 후 적용
 * - prompt/threshold config는 versioned read path
 * - notification은 즉시 알림과 daily digest 구분
 *
 * Source: docs/54-llm-classifier-model-integration-replan.md Phase 5
 */

// ═══════════════════════════════════════════════════════════════════════
// Model Types
// ═══════════════════════════════════════════════════════════════════════

export interface AutomationMailAccountRecord {
  id: string;
  provider: 'outlook' | 'gmail';
  email: string;
  status: 'active' | 'mock' | 'disconnected';
  createdAt: string;
}

export interface AutomationMailMessageRecord {
  id: string;
  accountId: string;
  subject: string;
  fromEmail: string;
  bodyPreview: string | null;
  /** Thread grouping key (e.g., conversationId or subject normalized) */
  groupKey: string | null;
  createdAt: string;
}

export interface MailInsightThreadRecord {
  id: string;
  threadKey: string;
  threadTitle: string;
  accountEmail: string | null;
  messageCount: number;
  messageIds: string[];
  latestReceivedAt: string | null;
  summary: string;
  nextActions: string[];
  aiEnhanced: boolean;
  status: 'reference' | 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export type CandidateType = 'customer' | 'project' | 'knowledge' | 'task' | 'contact';

export interface MailDerivedCandidateRecord {
  id: string;
  candidateType: CandidateType;
  title: string;
  summary: string;
  sourceTitle: string | null;
  sourceSender: string | null;
  sourceReceivedAt: string | null;
  confidence: number;
  /** Always 'proposed' on creation — never auto-promoted */
  status: 'proposed' | 'approved' | 'rejected' | 'superseded';
  createdEntityType: string | null;
  createdEntityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationKnowledgeDocumentRecord {
  id: string;
  title: string;
  docType: 'sop' | 'faq' | 'brand_guide' | 'product_doc' | 'other';
  content: string;
  chunkCount: number;
  createdAt: string;
}

export interface KnowledgeChunkRecord {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  createdAt: string;
}

export interface PolicyMemoryRecord {
  id: string;
  memoryType: 'classification' | 'routing' | 'threshold' | 'prompt';
  key: string;
  label: string;
  valueJson: Record<string, unknown>;
  source: 'seed' | 'learned' | 'manual';
  confidence: number;
  status: 'active' | 'deprecated' | 'proposed';
  createdAt: string;
  updatedAt: string;
}

export interface PolicyDecisionLogRecord {
  id: string;
  entityType: string;
  entityId: string | null;
  decisionType: 'threshold_change' | 'rule_promotion' | 'policy_update' | 'prompt_update' | 'config_change';
  inputJson: Record<string, unknown> | null;
  outputJson: Record<string, unknown> | null;
  policyVersion: string;
  approvedBy: string | null;
  createdAt: string;
}

export interface RuntimePolicyRecord {
  id: string;
  policyKey: string;
  configJson: Record<string, unknown>;
  version: number;
  createdAt: string;
}

export type NotificationChannel = 'immediate' | 'daily_digest';
export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface NotificationEventRecord {
  id: string;
  channel: NotificationChannel;
  severity: NotificationSeverity;
  eventType: string;
  message: string;
  metadata: Record<string, unknown> | null;
  delivered: boolean;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Wave B Store
// ═══════════════════════════════════════════════════════════════════════

let nextId = 1;
function genId(prefix: string = 'wb'): string {
  return `${prefix}-${String(nextId++).padStart(8, '0')}`;
}

export class WaveBStore {
  readonly mailAccounts: AutomationMailAccountRecord[] = [];
  readonly mailMessages: AutomationMailMessageRecord[] = [];
  readonly insightThreads: MailInsightThreadRecord[] = [];
  readonly derivedCandidates: MailDerivedCandidateRecord[] = [];
  readonly knowledgeDocuments: AutomationKnowledgeDocumentRecord[] = [];
  readonly knowledgeChunks: KnowledgeChunkRecord[] = [];
  readonly policyMemories: PolicyMemoryRecord[] = [];
  readonly policyDecisionLogs: PolicyDecisionLogRecord[] = [];
  readonly runtimePolicies: RuntimePolicyRecord[] = [];
  readonly notifications: NotificationEventRecord[] = [];

  // ── AutomationMailAccount ──────────────────────────────────────

  registerAccount(params: { provider: 'outlook' | 'gmail'; email: string; status?: string }): AutomationMailAccountRecord {
    const record: AutomationMailAccountRecord = {
      id: genId('acct'),
      provider: params.provider,
      email: params.email,
      status: (params.status as any) ?? 'active',
      createdAt: new Date().toISOString(),
    };
    this.mailAccounts.push(record);
    return record;
  }

  // ── AutomationMailMessage ──────────────────────────────────────

  recordMessage(params: {
    accountId: string;
    subject: string;
    fromEmail: string;
    bodyPreview?: string;
    groupKey?: string;
  }): AutomationMailMessageRecord {
    const record: AutomationMailMessageRecord = {
      id: genId('msg'),
      accountId: params.accountId,
      subject: params.subject,
      fromEmail: params.fromEmail,
      bodyPreview: params.bodyPreview ?? null,
      groupKey: params.groupKey ?? null,
      createdAt: new Date().toISOString(),
    };
    this.mailMessages.push(record);
    return record;
  }

  getMessagesByGroupKey(groupKey: string): AutomationMailMessageRecord[] {
    return this.mailMessages.filter(m => m.groupKey === groupKey);
  }

  // ── MailInsightThread ──────────────────────────────────────────

  createInsightThread(params: {
    threadKey: string;
    threadTitle: string;
    accountEmail?: string;
    messageIds?: string[];
    summary: string;
    nextActions?: string[];
    aiEnhanced?: boolean;
  }): MailInsightThreadRecord {
    const record: MailInsightThreadRecord = {
      id: genId('thread'),
      threadKey: params.threadKey,
      threadTitle: params.threadTitle,
      accountEmail: params.accountEmail ?? null,
      messageCount: params.messageIds?.length ?? 0,
      messageIds: params.messageIds ?? [],
      latestReceivedAt: new Date().toISOString(),
      summary: params.summary,
      nextActions: params.nextActions ?? [],
      aiEnhanced: params.aiEnhanced ?? false,
      status: 'reference',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.insightThreads.push(record);
    return record;
  }

  updateThreadSummary(threadId: string, summary: string, nextActions?: string[]): MailInsightThreadRecord | null {
    const thread = this.insightThreads.find(t => t.id === threadId);
    if (!thread) return null;
    thread.summary = summary;
    if (nextActions) thread.nextActions = nextActions;
    thread.updatedAt = new Date().toISOString();
    return thread;
  }

  getThreadByThreadKey(threadKey: string): MailInsightThreadRecord | null {
    return this.insightThreads.find(t => t.threadKey === threadKey) ?? null;
  }

  // ── MailDerivedCandidate ───────────────────────────────────────

  /**
   * Create a derived candidate. ALWAYS status = 'proposed'.
   * Auto-promotion is forbidden per replan constraints.
   */
  createCandidate(params: {
    candidateType: CandidateType;
    title: string;
    summary: string;
    sourceTitle?: string;
    sourceSender?: string;
    sourceReceivedAt?: string;
    confidence?: number;
    metadata?: Record<string, unknown>;
  }): MailDerivedCandidateRecord {
    const record: MailDerivedCandidateRecord = {
      id: genId('cand'),
      candidateType: params.candidateType,
      title: params.title,
      summary: params.summary,
      sourceTitle: params.sourceTitle ?? null,
      sourceSender: params.sourceSender ?? null,
      sourceReceivedAt: params.sourceReceivedAt ?? null,
      confidence: params.confidence ?? 60,
      status: 'proposed', // ALWAYS proposed — never auto-promoted
      createdEntityType: null,
      createdEntityId: null,
      metadata: params.metadata ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.derivedCandidates.push(record);
    return record;
  }

  approveCandidate(candidateId: string, entityType: string, entityId: string): MailDerivedCandidateRecord | null {
    const candidate = this.derivedCandidates.find(c => c.id === candidateId);
    if (!candidate || candidate.status !== 'proposed') return null;
    candidate.status = 'approved';
    candidate.createdEntityType = entityType;
    candidate.createdEntityId = entityId;
    candidate.updatedAt = new Date().toISOString();
    return candidate;
  }

  rejectCandidate(candidateId: string): MailDerivedCandidateRecord | null {
    const candidate = this.derivedCandidates.find(c => c.id === candidateId);
    if (!candidate || candidate.status !== 'proposed') return null;
    candidate.status = 'rejected';
    candidate.updatedAt = new Date().toISOString();
    return candidate;
  }

  getProposedCandidates(): MailDerivedCandidateRecord[] {
    return this.derivedCandidates.filter(c => c.status === 'proposed');
  }

  // ── AutomationKnowledgeDocument + KnowledgeChunk ──────────────

  createKnowledgeDocument(params: {
    title: string;
    docType: AutomationKnowledgeDocumentRecord['docType'];
    content: string;
  }): { document: AutomationKnowledgeDocumentRecord; chunks: KnowledgeChunkRecord[] } {
    // Split content into chunks (~500 chars each)
    const chunkSize = 500;
    const chunks: KnowledgeChunkRecord[] = [];
    const docId = genId('kdoc');

    for (let i = 0; i < params.content.length; i += chunkSize) {
      chunks.push({
        id: genId('kchk'),
        documentId: docId,
        chunkIndex: chunks.length,
        content: params.content.slice(i, i + chunkSize),
        createdAt: new Date().toISOString(),
      });
    }

    const document: AutomationKnowledgeDocumentRecord = {
      id: docId,
      title: params.title,
      docType: params.docType,
      content: params.content,
      chunkCount: chunks.length,
      createdAt: new Date().toISOString(),
    };

    this.knowledgeDocuments.push(document);
    this.knowledgeChunks.push(...chunks);
    return { document, chunks };
  }

  getChunksByDocumentId(documentId: string): KnowledgeChunkRecord[] {
    return this.knowledgeChunks.filter(c => c.documentId === documentId);
  }

  // ── PolicyMemory ──────────────────────────────────────────────

  setPolicyMemory(params: {
    memoryType: PolicyMemoryRecord['memoryType'];
    key: string;
    label: string;
    valueJson: Record<string, unknown>;
    source?: PolicyMemoryRecord['source'];
    confidence?: number;
  }): PolicyMemoryRecord {
    const existing = this.policyMemories.find(
      p => p.memoryType === params.memoryType && p.key === params.key,
    );
    if (existing) {
      existing.valueJson = params.valueJson;
      existing.label = params.label;
      existing.confidence = params.confidence ?? existing.confidence;
      existing.updatedAt = new Date().toISOString();
      return existing;
    }
    const record: PolicyMemoryRecord = {
      id: genId('pmem'),
      memoryType: params.memoryType,
      key: params.key,
      label: params.label,
      valueJson: params.valueJson,
      source: params.source ?? 'seed',
      confidence: params.confidence ?? 100,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.policyMemories.push(record);
    return record;
  }

  getPolicyMemory(memoryType: string, key: string): PolicyMemoryRecord | null {
    return this.policyMemories.find(p => p.memoryType === memoryType && p.key === key && p.status === 'active') ?? null;
  }

  // ── PolicyDecisionLog ─────────────────────────────────────────

  logPolicyDecision(params: {
    entityType: string;
    entityId?: string;
    decisionType: PolicyDecisionLogRecord['decisionType'];
    inputJson?: Record<string, unknown>;
    outputJson?: Record<string, unknown>;
    policyVersion?: string;
    approvedBy?: string;
  }): PolicyDecisionLogRecord {
    const record: PolicyDecisionLogRecord = {
      id: genId('plog'),
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      decisionType: params.decisionType,
      inputJson: params.inputJson ?? null,
      outputJson: params.outputJson ?? null,
      policyVersion: params.policyVersion ?? 'mail-policy-v1',
      approvedBy: params.approvedBy ?? null,
      createdAt: new Date().toISOString(),
    };
    this.policyDecisionLogs.push(record);
    return record;
  }

  // ── RuntimePolicy ─────────────────────────────────────────────

  setRuntimePolicy(key: string, config: Record<string, unknown>): RuntimePolicyRecord {
    const existing = this.runtimePolicies.find(p => p.policyKey === key);
    if (existing) {
      existing.configJson = config;
      existing.version++;
      return existing;
    }
    const record: RuntimePolicyRecord = {
      id: genId('rpol'),
      policyKey: key,
      configJson: config,
      version: 1,
      createdAt: new Date().toISOString(),
    };
    this.runtimePolicies.push(record);
    return record;
  }

  getRuntimePolicy(key: string): RuntimePolicyRecord | null {
    return this.runtimePolicies.find(p => p.policyKey === key) ?? null;
  }

  // ── NotificationEvent ─────────────────────────────────────────

  notify(params: {
    channel: NotificationChannel;
    severity: NotificationSeverity;
    eventType: string;
    message: string;
    metadata?: Record<string, unknown>;
  }): NotificationEventRecord {
    const record: NotificationEventRecord = {
      id: genId('notif'),
      channel: params.channel,
      severity: params.severity,
      eventType: params.eventType,
      message: params.message,
      metadata: params.metadata ?? null,
      delivered: params.channel === 'immediate',
      createdAt: new Date().toISOString(),
    };
    this.notifications.push(record);
    return record;
  }

  getPendingDigestNotifications(): NotificationEventRecord[] {
    return this.notifications.filter(n => n.channel === 'daily_digest' && !n.delivered);
  }

  markDigestDelivered(): number {
    const pending = this.getPendingDigestNotifications();
    for (const n of pending) n.delivered = true;
    return pending.length;
  }

  // ── Summary ───────────────────────────────────────────────────

  summary(): Record<string, number> {
    return {
      mailAccounts: this.mailAccounts.length,
      mailMessages: this.mailMessages.length,
      insightThreads: this.insightThreads.length,
      derivedCandidates: this.derivedCandidates.length,
      knowledgeDocuments: this.knowledgeDocuments.length,
      knowledgeChunks: this.knowledgeChunks.length,
      policyMemories: this.policyMemories.length,
      policyDecisionLogs: this.policyDecisionLogs.length,
      runtimePolicies: this.runtimePolicies.length,
      notifications: this.notifications.length,
    };
  }

  clear(): void {
    this.mailAccounts.length = 0;
    this.mailMessages.length = 0;
    this.insightThreads.length = 0;
    this.derivedCandidates.length = 0;
    this.knowledgeDocuments.length = 0;
    this.knowledgeChunks.length = 0;
    this.policyMemories.length = 0;
    this.policyDecisionLogs.length = 0;
    this.runtimePolicies.length = 0;
    this.notifications.length = 0;
  }
}
