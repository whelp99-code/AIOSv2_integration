/**
 * Phase 5 Tests — Wave B: Mail Insight, Knowledge & Policy
 *
 * Tests for:
 * - WaveBStore (all 10 models)
 * - MailInsightEngine (thread processing, candidates, policy, notifications)
 * - Candidate always 'proposed' constraint
 * - Policy decision logging
 * - Notification channel routing
 */

import { describe, it, expect } from 'vitest';
import { WaveBStore } from '../wave-b-store';
import { MailInsightEngine } from '../mail-insight-engine';

// ── WaveBStore ────────────────────────────────────────────────────────

describe('WaveBStore', () => {
  it('registers mail account', () => {
    const store = new WaveBStore();
    const acct = store.registerAccount({ provider: 'outlook', email: 'sales@company.co.kr' });
    expect(acct.provider).toBe('outlook');
    expect(acct.status).toBe('active');
    expect(store.mailAccounts).toHaveLength(1);
  });

  it('records mail messages with group key', () => {
    const store = new WaveBStore();
    store.recordMessage({ accountId: 'a1', subject: 'Re: 견적', fromEmail: 'a@b.com', groupKey: 'thread-1' });
    store.recordMessage({ accountId: 'a1', subject: 'Re: 견적', fromEmail: 'c@d.com', groupKey: 'thread-1' });
    expect(store.getMessagesByGroupKey('thread-1')).toHaveLength(2);
  });

  it('creates insight thread', () => {
    const store = new WaveBStore();
    const thread = store.createInsightThread({
      threadKey: 't1',
      threadTitle: 'HCI 견적 문의',
      summary: '3건 메일, 2명 발신자',
      messageIds: ['m1', 'm2', 'm3'],
    });
    expect(thread.messageCount).toBe(3);
    expect(thread.status).toBe('reference');
  });

  it('creates derived candidate with status=proposed', () => {
    const store = new WaveBStore();
    const candidate = store.createCandidate({
      candidateType: 'customer',
      title: '고객 후보',
      summary: '메일에서 고객 패턴 탐지',
    });
    expect(candidate.status).toBe('proposed');
    expect(store.getProposedCandidates()).toHaveLength(1);
  });

  it('approves a proposed candidate', () => {
    const store = new WaveBStore();
    const candidate = store.createCandidate({ candidateType: 'project', title: 'P', summary: 'S' });
    const approved = store.approveCandidate(candidate.id, 'Project', 'proj-001');
    expect(approved!.status).toBe('approved');
    expect(approved!.createdEntityType).toBe('Project');
  });

  it('rejects a proposed candidate', () => {
    const store = new WaveBStore();
    const candidate = store.createCandidate({ candidateType: 'knowledge', title: 'K', summary: 'S' });
    store.rejectCandidate(candidate.id);
    expect(store.getProposedCandidates()).toHaveLength(0);
  });

  it('creates knowledge document with chunks', () => {
    const store = new WaveBStore();
    const content = 'A'.repeat(1200);
    const { document, chunks } = store.createKnowledgeDocument({
      title: 'SOP 문서',
      docType: 'sop',
      content,
    });
    expect(chunks.length).toBe(3); // 1200 / 500 = 3 chunks
    expect(document.chunkCount).toBe(3);
    expect(store.getChunksByDocumentId(document.id)).toHaveLength(3);
  });

  it('sets and gets policy memory', () => {
    const store = new WaveBStore();
    store.setPolicyMemory({
      memoryType: 'classification',
      key: 'ceo-threshold',
      label: 'CEO 분류 임계값',
      valueJson: { confidence: 0.9 },
    });
    const mem = store.getPolicyMemory('classification', 'ceo-threshold');
    expect(mem).not.toBeNull();
    expect(mem!.valueJson).toEqual({ confidence: 0.9 });
  });

  it('sets runtime policy with versioning', () => {
    const store = new WaveBStore();
    store.setRuntimePolicy('classifier-config', { threshold: 0.7 });
    store.setRuntimePolicy('classifier-config', { threshold: 0.8 });
    const policy = store.getRuntimePolicy('classifier-config');
    expect(policy!.version).toBe(2);
    expect(policy!.configJson).toEqual({ threshold: 0.8 });
  });

  it('logs policy decision', () => {
    const store = new WaveBStore();
    store.logPolicyDecision({
      entityType: 'RuntimePolicy',
      decisionType: 'config_change',
      inputJson: { reason: 'accuracy improvement' },
      outputJson: { threshold: 0.8 },
      approvedBy: 'admin',
    });
    expect(store.policyDecisionLogs).toHaveLength(1);
    expect(store.policyDecisionLogs[0].approvedBy).toBe('admin');
  });

  it('routes notifications to correct channel', () => {
    const store = new WaveBStore();
    store.notify({ channel: 'immediate', severity: 'critical', eventType: 'security', message: 'PII leak' });
    store.notify({ channel: 'daily_digest', severity: 'info', eventType: 'summary', message: 'Daily report' });
    expect(store.notifications).toHaveLength(2);
    expect(store.notifications[0].delivered).toBe(true);  // immediate
    expect(store.notifications[1].delivered).toBe(false); // digest
  });

  it('marks digest notifications as delivered', () => {
    const store = new WaveBStore();
    store.notify({ channel: 'daily_digest', severity: 'info', eventType: 'a', message: 'msg1' });
    store.notify({ channel: 'daily_digest', severity: 'warning', eventType: 'b', message: 'msg2' });
    store.notify({ channel: 'immediate', severity: 'critical', eventType: 'c', message: 'msg3' });
    const count = store.markDigestDelivered();
    expect(count).toBe(2);
    expect(store.getPendingDigestNotifications()).toHaveLength(0);
  });

  it('summary() returns all counts', () => {
    const store = new WaveBStore();
    store.registerAccount({ provider: 'gmail', email: 'a@b.com' });
    store.createCandidate({ candidateType: 'customer', title: 'C', summary: 'S' });
    const s = store.summary();
    expect(s.mailAccounts).toBe(1);
    expect(s.derivedCandidates).toBe(1);
  });
});

// ── MailInsightEngine ─────────────────────────────────────────────────

describe('MailInsightEngine', () => {
  it('processes a thread with messages and generates summary', () => {
    const store = new WaveBStore();
    const engine = new MailInsightEngine(store);

    const result = engine.processThread({
      threadKey: 'thread-001',
      threadTitle: 'HCI 견적 문의',
      messages: [
        { id: 'm1', subject: 'HCI 견적 요청', fromEmail: 'buyer@customer.com', bodyPreview: '10노드 견적 부탁', receivedAt: '2026-06-23T10:00:00Z' },
        { id: 'm2', subject: 'Re: HCI 견적 요청', fromEmail: 'sales@company.co.kr', bodyPreview: '견적서 첨부합니다', receivedAt: '2026-06-23T11:00:00Z' },
      ],
    });

    expect(result.isNew).toBe(true);
    expect(result.thread.messageCount).toBe(2);
    expect(result.thread.summary).toContain('2건 메일');
    expect(store.insightThreads).toHaveLength(1);
    expect(store.mailMessages).toHaveLength(2);
  });

  it('updates existing thread on second call', () => {
    const store = new WaveBStore();
    const engine = new MailInsightEngine(store);

    engine.processThread({
      threadKey: 'thread-001',
      threadTitle: 'Test',
      messages: [{ id: 'm1', subject: 'S', fromEmail: 'a@b.com', receivedAt: '2026-06-23T10:00:00Z' }],
    });

    const result2 = engine.processThread({
      threadKey: 'thread-001',
      threadTitle: 'Test',
      messages: [{ id: 'm2', subject: 'Re: S', fromEmail: 'c@d.com', receivedAt: '2026-06-23T11:00:00Z' }],
    });

    expect(result2.isNew).toBe(false);
    expect(result2.thread.messageCount).toBe(2);
  });

  it('generates candidates with status=proposed from thread content', () => {
    const store = new WaveBStore();
    const engine = new MailInsightEngine(store);

    const result = engine.processThread({
      threadKey: 'thread-002',
      threadTitle: '고객 프로젝트 문의',
      messages: [
        { id: 'm1', subject: '고객 프로젝트 견적', fromEmail: 'client@customer.com', bodyPreview: '프로젝트 POC 요청', receivedAt: '2026-06-23T10:00:00Z' },
      ],
    });

    // Should generate customer + project candidates
    expect(result.candidates.length).toBeGreaterThanOrEqual(1);
    for (const c of result.candidates) {
      expect(c.status).toBe('proposed'); // ALWAYS proposed
    }
    expect(store.getProposedCandidates().length).toBeGreaterThanOrEqual(1);
  });

  it('does not auto-promote candidates', () => {
    const store = new WaveBStore();
    const engine = new MailInsightEngine(store);

    engine.processThread({
      threadKey: 't1',
      threadTitle: '고객 문의',
      messages: [
        { id: 'm1', subject: '고객 기술 문의', fromEmail: 'a@customer.com', bodyPreview: '기술 검토 요청', receivedAt: '2026-06-23T10:00:00Z' },
      ],
    });

    // All candidates should be proposed
    const proposed = store.getProposedCandidates();
    expect(proposed.length).toBeGreaterThanOrEqual(1);
    for (const c of proposed) {
      expect(c.status).toBe('proposed');
      expect(c.createdEntityType).toBeNull();
      expect(c.createdEntityId).toBeNull();
    }
  });

  it('suggests next actions from thread content', () => {
    const store = new WaveBStore();
    const engine = new MailInsightEngine(store);

    const result = engine.processThread({
      threadKey: 't-actions',
      threadTitle: '데모 일정',
      messages: [
        { id: 'm1', subject: 'POC 데모 일정 협의', fromEmail: 'a@b.com', bodyPreview: 'demo presentation 요청', receivedAt: '2026-06-23T10:00:00Z' },
      ],
    });

    expect(result.thread.nextActions).toContain('데모 일정 조율');
  });

  it('updates policy and logs decision', () => {
    const store = new WaveBStore();
    const engine = new MailInsightEngine(store);

    engine.updatePolicy({
      policyKey: 'classifier-threshold',
      config: { confidence: 0.75 },
      reason: 'Phase 3 benchmark improvement',
      approvedBy: 'admin',
    });

    expect(store.runtimePolicies).toHaveLength(1);
    expect(store.policyDecisionLogs).toHaveLength(1);
    expect(store.policyDecisionLogs[0].approvedBy).toBe('admin');
    expect(store.policyDecisionLogs[0].decisionType).toBe('config_change');
  });

  it('reads policy config via versioned read path', () => {
    const store = new WaveBStore();
    const engine = new MailInsightEngine(store);

    engine.updatePolicy({ policyKey: 'p1', config: { v: 1 }, reason: 'init' });
    engine.updatePolicy({ policyKey: 'p1', config: { v: 2 }, reason: 'update' });

    const config = engine.getPolicyConfig('p1');
    expect(config).toEqual({ v: 2 });
  });

  it('routes critical notifications as immediate', () => {
    const store = new WaveBStore();
    const engine = new MailInsightEngine(store);

    engine.notify({ severity: 'critical', eventType: 'security', message: 'PII redaction failure' });
    engine.notify({ severity: 'info', eventType: 'report', message: 'Daily summary' });

    expect(store.notifications[0].channel).toBe('immediate');
    expect(store.notifications[0].delivered).toBe(true);
    expect(store.notifications[1].channel).toBe('daily_digest');
    expect(store.notifications[1].delivered).toBe(false);
  });

  it('flushes daily digest', () => {
    const store = new WaveBStore();
    const engine = new MailInsightEngine(store);

    engine.notify({ severity: 'info', eventType: 'a', message: 'msg1' });
    engine.notify({ severity: 'warning', eventType: 'b', message: 'msg2' });
    engine.notify({ severity: 'critical', eventType: 'c', message: 'msg3' });

    const flushed = engine.flushDigest();
    expect(flushed).toBe(2); // info + warning
    expect(store.getPendingDigestNotifications()).toHaveLength(0);
  });

  it('indexes and searches knowledge documents', () => {
    const store = new WaveBStore();
    const engine = new MailInsightEngine(store);

    engine.indexDocument({
      title: 'HCI 설치 가이드',
      docType: 'product_doc',
      content: 'HCI 솔루션 설치 방법을 설명합니다. 네트워크 설정이 필요합니다.',
    });

    const results = engine.searchKnowledge('네트워크');
    expect(results).toHaveLength(1);
    expect(results[0].document).toBe('HCI 설치 가이드');
  });
});
