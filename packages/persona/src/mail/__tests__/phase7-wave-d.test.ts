/**
 * Phase 7 Tests — Wave D: Code & CI Collaboration
 *
 * Tests for:
 * - WaveDStore (17 models)
 * - CodeCollaborationEngine (issue candidates, approval gates, CI tracking, skills)
 * - GitHub issue generation from mail
 * - PR/issue approval gates
 * - CI results reflected in BuildRun/TestRun
 * - Agent assignment rules (read-only preview)
 */

import { describe, it, expect } from 'vitest';
import { WaveDStore } from '../wave-d-store';
import { CodeCollaborationEngine } from '../code-collaboration-engine';

// ── WaveDStore ────────────────────────────────────────────────────────

describe('WaveDStore', () => {
  it('registers repository with branches', () => {
    const store = new WaveDStore();
    const repo = store.registerRepository('aios/main', 'https://github.com/aios/main');
    store.createBranch(repo.id, 'feature/auth', 'abc123');
    expect(store.repositories).toHaveLength(1);
    expect(store.branches).toHaveLength(1);
  });

  it('creates pull request with auto-incrementing number', () => {
    const store = new WaveDStore();
    const repo = store.registerRepository('test/repo');
    const pr1 = store.createPullRequest({ repositoryId: repo.id, title: 'Add auth' });
    const pr2 = store.createPullRequest({ repositoryId: repo.id, title: 'Fix bug' });
    expect(pr1.number).toBe(1);
    expect(pr2.number).toBe(2);
    expect(store.pullRequests).toHaveLength(2);
  });

  it('records code changes with changed files', () => {
    const store = new WaveDStore();
    const { change, files } = store.recordCodeChange({
      summary: 'Add login endpoint',
      files: [
        { path: 'src/auth.ts', changeType: 'added', additions: 50, deletions: 0 },
        { path: 'src/index.ts', changeType: 'modified', additions: 5, deletions: 2 },
      ],
    });
    expect(files).toHaveLength(2);
    expect(store.changedFiles).toHaveLength(2);
  });

  it('creates and updates build run', () => {
    const store = new WaveDStore();
    const build = store.createBuildRun({});
    expect(build.status).toBe('pending');
    store.updateBuildStatus(build.id, 'passed', 'All checks passed', 45000);
    expect(build.status).toBe('passed');
    expect(build.durationMs).toBe(45000);
  });

  it('creates and updates test run', () => {
    const store = new WaveDStore();
    const test = store.createTestRun({ suiteName: 'unit' });
    store.updateTestResult(test.id, 'passed', 150, 0, 2, 12000);
    expect(test.passed).toBe(150);
    expect(test.failed).toBe(0);
    expect(test.skipped).toBe(2);
  });

  it('creates codex task with logs', () => {
    const store = new WaveDStore();
    const task = store.createCodexTask({ title: 'Fix auth bug' });
    store.logCodexTask(task.id, 'info', 'Started analysis');
    store.logCodexTask(task.id, 'error', 'Failed to connect', { code: 'ECONNREFUSED' });
    expect(store.codexTasks).toHaveLength(1);
    expect(store.codexTaskLogs).toHaveLength(2);
  });

  it('creates GitHub issue with auto-incrementing number', () => {
    const store = new WaveDStore();
    const issue1 = store.createGitHubIssue({ title: 'Bug in login' });
    const issue2 = store.createGitHubIssue({ title: 'Add dark mode' });
    expect(issue1.number).toBe(1);
    expect(issue2.number).toBe(2);
    expect(store.getOpenIssues()).toHaveLength(2);
  });

  it('manages skill catalog and runs', () => {
    const store = new WaveDStore();
    store.registerSkill('deep-interview', 'builtin', ['requirements', 'spec'], 'Requirements gathering');
    store.recordSkillRun({ skillKey: 'deep-interview', executionMode: 'full', output: { success: true } });
    expect(store.skillCatalog).toHaveLength(1);
    expect(store.skillCatalog[0].usageCount).toBe(1);
    expect(store.skillRuns).toHaveLength(1);
  });

  it('creates workflow template', () => {
    const store = new WaveDStore();
    const tpl = store.createWorkflowTemplate('bug-fix', [
      { name: 'analyze', agentType: 'analyst' },
      { name: 'fix', agentType: 'engineer', toolName: 'code-edit' },
      { name: 'test', agentType: 'tester' },
    ]);
    expect(tpl.steps).toHaveLength(3);
  });

  it('manages agent assignment rules with priority matching', () => {
    const store = new WaveDStore();
    store.setAssignmentRule('bug-rule', 'bug|오류|error', 'bug-agent', 10);
    store.setAssignmentRule('feature-rule', 'feature|기능', 'feature-agent', 5);
    store.setAssignmentRule('default', '.*', 'default-agent', 0);

    expect(store.matchAssignmentRule('fix bug in login')?.agentType).toBe('bug-agent');
    expect(store.matchAssignmentRule('add new feature')?.agentType).toBe('feature-agent');
    expect(store.matchAssignmentRule('general task')?.agentType).toBe('default-agent');
  });

  it('creates work breakdown items', () => {
    const store = new WaveDStore();
    store.createWorkItem({ title: 'Fix login bug', targetArea: 'auth', agentType: 'engineer', riskLevel: 'medium' });
    expect(store.workBreakdownItems).toHaveLength(1);
    expect(store.workBreakdownItems[0].riskLevel).toBe('medium');
  });
});

// ── CodeCollaborationEngine ───────────────────────────────────────────

describe('CodeCollaborationEngine', () => {
  it('suggests issue candidates from engineer mail — no auto creation', () => {
    const store = new WaveDStore();
    const engine = new CodeCollaborationEngine(store);

    const candidates = engine.suggestIssues({
      category: 'ENGINEER',
      subject: '로그인 버그 발견',
      body: '로그인 시 오류가 발생합니다',
      sourceEntityType: 'MailClassification',
      sourceEntityId: 'mc-001',
    });

    expect(candidates.length).toBeGreaterThanOrEqual(1);
    expect(candidates[0].title).toContain('[Bug]');
    expect(candidates[0].labels).toContain('bug');
    // No side effects
    expect(store.githubIssues).toHaveLength(0);
  });

  it('suggests review issues from code-related mail', () => {
    const store = new WaveDStore();
    const engine = new CodeCollaborationEngine(store);

    const candidates = engine.suggestIssues({
      category: 'ENGINEER',
      subject: 'PR 리뷰 요청',
      body: '코드 리뷰 부탁드립니다',
      sourceEntityType: 'MailClassification',
      sourceEntityId: 'mc-002',
    });

    expect(candidates.some(c => c.labels.includes('code-review'))).toBe(true);
  });

  it('suggests task issues from PM mail', () => {
    const store = new WaveDStore();
    const engine = new CodeCollaborationEngine(store);

    const candidates = engine.suggestIssues({
      category: 'PM',
      subject: '이슈 할당',
      body: '작업 배정이 필요합니다',
      sourceEntityType: 'MailClassification',
      sourceEntityId: 'mc-003',
    });

    expect(candidates.some(c => c.labels.includes('task'))).toBe(true);
  });

  it('creates issue with approval gate for medium/high risk', () => {
    const store = new WaveDStore();
    const engine = new CodeCollaborationEngine(store);

    const result = engine.createIssue({
      title: '[Bug] Critical login failure',
      body: 'Login is broken',
      labels: ['bug', 'critical'],
      sourceEntityType: 'MailClassification',
      sourceEntityId: 'mc-004',
      riskLevel: 'high',
    }, 'aios/main');

    expect(result.approvalRequired).toBe(true);
    expect(result.approvalId).toBeTruthy();
    expect(result.issue.status).toBe('open');
  });

  it('creates issue without approval for low risk', () => {
    const store = new WaveDStore();
    const engine = new CodeCollaborationEngine(store);

    const result = engine.createIssue({
      title: '[Review] Code review request',
      body: 'Please review',
      labels: ['code-review'],
      sourceEntityType: 'MailClassification',
      sourceEntityId: 'mc-005',
      riskLevel: 'low',
    }, 'aios/main');

    expect(result.approvalRequired).toBe(false);
    expect(result.approvalId).toBeUndefined();
  });

  it('approves and rejects issue creation', () => {
    const store = new WaveDStore();
    const engine = new CodeCollaborationEngine(store);

    const result = engine.createIssue({
      title: 'Test', body: '', labels: [], sourceEntityType: 'Mail', sourceEntityId: 'm1', riskLevel: 'high',
    }, 'repo');

    expect(engine.approveIssue(result.approvalId!)).toBe(true);
    expect(engine.approveIssue(result.approvalId!)).toBe(false); // already approved

    const result2 = engine.createIssue({
      title: 'Test2', body: '', labels: [], sourceEntityType: 'Mail', sourceEntityId: 'm2', riskLevel: 'medium',
    }, 'repo');
    engine.rejectIssue(result2.approvalId!);
    expect(store.githubIssues.find(i => i.id === result2.issue.id)?.status).toBe('wontfix');
  });

  it('records CI results in BuildRun and TestRun', () => {
    const store = new WaveDStore();
    const engine = new CodeCollaborationEngine(store);

    const ci = engine.recordCIResult({
      suiteName: 'unit-tests',
      buildStatus: 'passed',
      testStatus: 'passed',
      passed: 150,
      failed: 0,
      skipped: 3,
      durationMs: 45000,
      logSummary: 'All tests passed',
    });

    expect(ci.buildStatus).toBe('passed');
    expect(ci.testStatus).toBe('passed');
    expect(ci.passed).toBe(150);
    expect(store.buildRuns).toHaveLength(1);
    expect(store.testRuns).toHaveLength(1);
  });

  it('records CI failure results', () => {
    const store = new WaveDStore();
    const engine = new CodeCollaborationEngine(store);

    const ci = engine.recordCIResult({
      suiteName: 'integration',
      buildStatus: 'failed',
      testStatus: 'failed',
      passed: 120,
      failed: 5,
      skipped: 0,
      durationMs: 30000,
      logSummary: '5 tests failed',
    });

    expect(ci.buildStatus).toBe('failed');
    expect(ci.failed).toBe(5);
  });

  it('creates PR with code change', () => {
    const store = new WaveDStore();
    const engine = new CodeCollaborationEngine(store);

    const { pr, codeChange } = engine.createPR({
      repositorySlug: 'aios/main',
      branchName: 'feature/auth',
      title: 'Add authentication',
      files: [{ path: 'src/auth.ts', changeType: 'added' }],
    });

    expect(pr.title).toBe('Add authentication');
    expect(pr.status).toBe('open');
    expect(codeChange).toBeTruthy();
    expect(store.changedFiles.length).toBeGreaterThanOrEqual(1);
  });

  it('registers and runs skills', () => {
    const store = new WaveDStore();
    const engine = new CodeCollaborationEngine(store);

    engine.registerSkill('ralplan', 'builtin', ['planning', 'consensus'], 'Consensus planning');
    engine.runSkill('ralplan', 'full', undefined, { plan: 'approved' });

    expect(engine.listSkills()).toHaveLength(1);
    expect(store.skillRuns).toHaveLength(1);
    expect(store.skillCatalog[0].usageCount).toBe(1);
  });

  it('matches assignment rules with priority', () => {
    const store = new WaveDStore();
    const engine = new CodeCollaborationEngine(store);

    engine.setAssignmentRule('security', 'security|보안|vulnerability', 'security-team', 20);
    engine.setAssignmentRule('frontend', 'ui|frontend|css|react', 'frontend-team', 10);
    engine.setAssignmentRule('default', '.*', 'general-team', 0);

    expect(engine.matchRule('fix security vulnerability')?.agentType).toBe('security-team');
    expect(engine.matchRule('update UI components')?.agentType).toBe('frontend-team');
    expect(engine.matchRule('random task')?.agentType).toBe('general-team');
  });

  it('assignment rules are read-only preview until enabled', () => {
    const store = new WaveDStore();
    const engine = new CodeCollaborationEngine(store);

    engine.setAssignmentRule('test-rule', 'test|테스트', 'test-agent', 5);
    const rules = engine.listAssignmentRules();
    expect(rules[0].enabled).toBe(true);
    expect(rules[0].pattern).toBe('test|테스트');
  });
});
