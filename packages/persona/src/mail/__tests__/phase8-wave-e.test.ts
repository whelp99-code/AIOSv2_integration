/**
 * Phase 8 Tests — Wave E: Portal Registry & Config UX
 *
 * Tests for:
 * - WaveEStore (12 models)
 * - PortalEngine (registry composition, config rollback, connector health, backlog)
 * - Config profile snapshot rollback
 * - Connector registry with health status
 * - Portal task / review thread as operational backlog
 */

import { describe, it, expect } from 'vitest';
import { WaveEStore } from '../wave-e-store';
import { PortalEngine } from '../portal-engine';

// ── WaveEStore ────────────────────────────────────────────────────────

describe('WaveEStore', () => {
  it('registers modules with blocks and nodes', () => {
    const store = new WaveEStore();
    store.registerModule('mail-intelligence', 'Mail Intelligence', '1.0.0');
    store.registerBlock('mail-classifier', 'mail-intelligence', 'Mail Classifier Block');
    store.registerNode('classifier-node', 'mail-intelligence', 'classifier', { threshold: 0.7 });
    expect(store.modules).toHaveLength(1);
    expect(store.blocks).toHaveLength(1);
    expect(store.nodes).toHaveLength(1);
  });

  it('manages layout slots per page', () => {
    const store = new WaveEStore();
    const block = store.registerBlock('b1', 'm1', 'Block 1');
    store.setLayoutSlot('dashboard', 'header', 0, block.id);
    store.setLayoutSlot('dashboard', 'main', 1, block.id);
    store.setLayoutSlot('dashboard', 'sidebar', 2);
    const slots = store.getLayoutSlots('dashboard');
    expect(slots).toHaveLength(3);
    expect(slots[0].slotKey).toBe('header');
  });

  it('registers queries', () => {
    const store = new WaveEStore();
    store.registerQuery('recent-classifications', 'prisma', { model: 'MailClassification', orderBy: 'createdAt:desc', limit: 50 });
    expect(store.queries).toHaveLength(1);
  });

  it('registers connectors with health tracking', () => {
    const store = new WaveEStore();
    store.registerConnector('outlook', 'Microsoft Outlook', 'mail');
    store.registerConnector('github', 'GitHub', 'code');
    store.updateConnectorHealth('outlook', 'healthy');
    store.updateConnectorHealth('github', 'degraded');
    expect(store.getConnectorsByHealth('healthy')).toHaveLength(1);
    expect(store.getConnectorsByHealth('degraded')).toHaveLength(1);
  });

  it('creates canvas with widgets', () => {
    const store = new WaveEStore();
    store.createCanvas('Main Dashboard', [
      { slotKey: 'header', blockKey: 'nav-bar' },
      { slotKey: 'main', blockKey: 'mail-classifier' },
    ]);
    expect(store.canvases).toHaveLength(1);
    expect(store.canvases[0].widgets).toHaveLength(2);
  });

  it('adds and searches memory items', () => {
    const store = new WaveEStore();
    store.addMemoryItem('HCI 설치 가이드', 'HCI 솔루션 설치 방법', ['hci', 'install']);
    store.addMemoryItem('보안 정책', 'PII redaction 규칙', ['security', 'pii']);
    expect(store.searchMemory('hci')).toHaveLength(1);
    expect(store.searchMemory('redaction')).toHaveLength(1);
    expect(store.searchMemory('security')).toHaveLength(1);
  });

  it('manages review threads with messages', () => {
    const store = new WaveEStore();
    const thread = store.createReviewThread('분류 결과 검토', { author: 'admin', content: 'CEO 분류 확인 필요' });
    store.addReviewMessage(thread.id, 'reviewer', '확인 완료, CEO가 맞습니다');
    store.resolveReviewThread(thread.id);
    expect(thread.messages).toHaveLength(2);
    expect(thread.status).toBe('resolved');
    expect(store.getOpenReviewThreads()).toHaveLength(0);
  });

  it('manages portal tasks as backlog', () => {
    const store = new WaveEStore();
    store.createPortalTask('proj-1', '메일 분류 검토', 'CEO 분류 확인 필요', 'mail');
    store.createPortalTask('proj-1', '정책 업데이트', '새 threshold 적용', 'policy');
    store.createPortalTask('proj-2', '다른 프로젝트 작업');
    expect(store.getBacklogTasks()).toHaveLength(3);
    expect(store.getBacklogTasks('proj-1')).toHaveLength(2);
    store.updatePortalTaskStatus(store.portalTasks[0].id, 'completed');
    expect(store.getBacklogTasks()).toHaveLength(2);
  });

  it('manages config profiles with values', () => {
    const store = new WaveEStore();
    store.createConfigProfile('classifier-config', '분류기 설정');
    store.setConfigValue('classifier-config', 'threshold', 0.7);
    store.setConfigValue('classifier-config', 'mode', 'hybrid');
    expect(store.getConfigValue('classifier-config', 'threshold')).toBe(0.7);
    expect(store.getConfigSnapshot('classifier-config')).toEqual({ threshold: 0.7, mode: 'hybrid' });
  });

  it('snapshots and rolls back config', () => {
    const store = new WaveEStore();
    store.createConfigProfile('app-config');
    store.setConfigValue('app-config', 'theme', 'light');
    store.setConfigValue('app-config', 'lang', 'ko');

    // Snapshot before changes
    store.snapshotConfig('app-config');

    // Make changes
    store.setConfigValue('app-config', 'theme', 'dark');
    store.setConfigValue('app-config', 'lang', 'en');
    store.setConfigValue('app-config', 'newKey', 'newVal');
    expect(store.getConfigValue('app-config', 'theme')).toBe('dark');

    // Rollback
    const rolled = store.rollbackConfig('app-config');
    expect(rolled).toBe(true);
    expect(store.getConfigValue('app-config', 'theme')).toBe('light');
    expect(store.getConfigValue('app-config', 'lang')).toBe('ko');
    expect(store.getConfigValue('app-config', 'newKey')).toBeNull();
  });
});

// ── PortalEngine ──────────────────────────────────────────────────────

describe('PortalEngine', () => {
  it('registers module with blocks and nodes via engine', () => {
    const store = new WaveEStore();
    const engine = new PortalEngine(store);

    const result = engine.registerModule({
      moduleKey: 'mail-intelligence',
      displayName: 'Mail Intelligence',
      version: '1.0.0',
      blocks: [
        { blockKey: 'classifier-block', displayName: 'Mail Classifier' },
        { blockKey: 'insight-block', displayName: 'Mail Insights' },
      ],
      nodes: [
        { nodeKey: 'classifier-node', nodeType: 'classifier' },
      ],
    });

    expect(result.module.version).toBe('1.0.0');
    expect(result.blocks).toHaveLength(2);
    expect(result.nodes).toHaveLength(1);
  });

  it('composes portal page and reads resolved blocks', () => {
    const store = new WaveEStore();
    const engine = new PortalEngine(store);

    engine.registerModule({
      moduleKey: 'dashboard',
      displayName: 'Dashboard',
      blocks: [
        { blockKey: 'nav', displayName: 'Navigation' },
        { blockKey: 'mail-list', displayName: 'Mail List' },
      ],
    });

    engine.composePage({
      pageKey: 'main-dashboard',
      title: 'Main Dashboard',
      slots: [
        { slotKey: 'header', blockKey: 'nav', sortOrder: 0 },
        { slotKey: 'content', blockKey: 'mail-list', sortOrder: 1 },
      ],
    });

    const page = engine.readPage('main-dashboard');
    expect(page).toHaveLength(2);
    expect(page[0].blockKey).toBe('nav');
    expect(page[0].displayName).toBe('Navigation');
    expect(page[1].blockKey).toBe('mail-list');
  });

  it('config snapshot and rollback via engine', () => {
    const store = new WaveEStore();
    const engine = new PortalEngine(store);

    store.createConfigProfile('classifier');
    engine.applyConfigChange({ profileKey: 'classifier', key: 'threshold', value: 0.7, reason: 'initial' });
    engine.snapshotConfig('classifier');

    engine.applyConfigChange({ profileKey: 'classifier', key: 'threshold', value: 0.9, reason: 'tuning' });
    expect(engine.getConfig('classifier')).toEqual({ threshold: 0.9 });

    engine.rollbackConfig('classifier');
    expect(engine.getConfig('classifier')).toEqual({ threshold: 0.7 });
  });

  it('connector health summary', () => {
    const store = new WaveEStore();
    const engine = new PortalEngine(store);

    engine.registerConnector('outlook', 'Outlook', 'mail');
    engine.registerConnector('github', 'GitHub', 'code');
    engine.registerConnector('slack', 'Slack', 'messaging');

    engine.updateConnectorHealth('outlook', 'healthy');
    engine.updateConnectorHealth('github', 'healthy');
    engine.updateConnectorHealth('slack', 'down');

    const summary = engine.getConnectorHealthSummary();
    expect(summary.healthy).toBe(2);
    expect(summary.down).toBe(1);
    expect(summary.total).toBe(3);
  });

  it('portal tasks serve as operational backlog', () => {
    const store = new WaveEStore();
    const engine = new PortalEngine(store);

    engine.createTask('proj-1', 'CEO 분류 검토', '분류 결과 확인 필요', 'mail');
    engine.createTask('proj-1', '정책 업데이트', '새 threshold 적용');
    engine.createTask('proj-2', '다른 작업');

    const backlog = engine.getBacklog('proj-1');
    expect(backlog).toHaveLength(2);
    expect(backlog.every(t => t.status === 'open')).toBe(true);
  });

  it('review threads for operational review', () => {
    const store = new WaveEStore();
    const engine = new PortalEngine(store);

    const thread = engine.createReview('분류 정확도 검토', 'admin', '최근 accuracy가 85%에서 하락했습니다');
    engine.addReviewMessage(thread.id, 'qa', 'ambiguous 케이스 증가가 원인입니다');

    expect(engine.getOpenReviews()).toHaveLength(1);
    store.resolveReviewThread(thread.id);
    expect(engine.getOpenReviews()).toHaveLength(0);
  });

  it('read path returns empty slots when no blocks linked', () => {
    const store = new WaveEStore();
    const engine = new PortalEngine(store);

    store.setLayoutSlot('empty-page', 'slot1', 0);
    const page = engine.readPage('empty-page');
    expect(page).toHaveLength(1);
    expect(page[0].blockKey).toBe('empty');
  });

  it('summary() returns all collection counts', () => {
    const store = new WaveEStore();
    const engine = new PortalEngine(store);

    engine.registerModule({ moduleKey: 'test', displayName: 'Test', blocks: [{ blockKey: 'b1', displayName: 'B1' }] });
    store.createConfigProfile('cfg');
    store.setConfigValue('cfg', 'k', 'v');

    const s = engine.summary();
    expect(s.modules).toBe(1);
    expect(s.blocks).toBe(1);
    expect(s.configProfiles).toBe(1);
    expect(s.configValues).toBe(1);
  });
});
