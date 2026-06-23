/**
 * Code Collaboration Engine — Phase 7
 *
 * Orchestrates code/CI collaboration flows:
 * - GitHub issue candidate generation from mail/command
 * - PR/issue creation with approval gate
 * - CI result tracking (BuildRun/TestRun)
 * - Skill catalog and run management
 * - Agent assignment rule matching
 *
 * Source: docs/54-llm-classifier-model-integration-replan.md Phase 7
 */

import type { WaveDStore, PRStatus, IssueStatus, BuildStatus, TestStatus } from './wave-d-store';

// ── Types ─────────────────────────────────────────────────────────────

export interface IssueCandidate {
  title: string;
  body: string;
  labels: string[];
  sourceEntityType: string;
  sourceEntityId: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface IssueCreationResult {
  issue: ReturnType<WaveDStore['createGitHubIssue']>;
  approvalRequired: boolean;
  approvalId?: string;
}

export interface CIResult {
  buildRunId: string;
  testRunId: string;
  buildStatus: BuildStatus;
  testStatus: TestStatus;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
}

// ── Code Collaboration Engine ─────────────────────────────────────────

export class CodeCollaborationEngine {
  private store: WaveDStore;
  private approvalStore: Map<string, { issueId: string; status: 'pending' | 'approved' | 'rejected' }> = new Map();
  private nextApprovalId = 1;

  constructor(store: WaveDStore) {
    this.store = store;
  }

  // ── Issue Candidate Generation ─────────────────────────────────

  /**
   * Generate GitHub issue candidates from a mail classification.
   * Does NOT create the issue — only suggests. Approval required.
   */
  suggestIssues(params: {
    category: string;
    subject: string;
    body: string;
    sourceEntityType: string;
    sourceEntityId: string;
  }): IssueCandidate[] {
    const candidates: IssueCandidate[] = [];
    const text = `${params.subject} ${params.body}`.toLowerCase();

    if (params.category === 'ENGINEER') {
      if (text.includes('버그') || text.includes('bug') || text.includes('오류')) {
        candidates.push({
          title: `[Bug] ${params.subject}`,
          body: params.body,
          labels: ['bug', 'from-mail'],
          sourceEntityType: params.sourceEntityType,
          sourceEntityId: params.sourceEntityId,
          riskLevel: 'medium',
        });
      }
      if (text.includes('리뷰') || text.includes('review') || text.includes('pr')) {
        candidates.push({
          title: `[Review] ${params.subject}`,
          body: params.body,
          labels: ['code-review', 'from-mail'],
          sourceEntityType: params.sourceEntityType,
          sourceEntityId: params.sourceEntityId,
          riskLevel: 'low',
        });
      }
    }

    if (params.category === 'PM' && (text.includes('이슈') || text.includes('task') || text.includes('작업'))) {
      candidates.push({
        title: `[Task] ${params.subject}`,
        body: params.body,
        labels: ['task', 'from-mail'],
        sourceEntityType: params.sourceEntityType,
        sourceEntityId: params.sourceEntityId,
        riskLevel: 'low',
      });
    }

    return candidates;
  }

  // ── Issue Creation (with approval gate) ────────────────────────

  /**
   * Create a GitHub issue candidate. For medium/high risk, requires approval.
   * Returns the issue and whether approval is needed.
   */
  createIssue(candidate: IssueCandidate, repoSlug: string): IssueCreationResult {
    const issue = this.store.createGitHubIssue({
      title: candidate.title,
      body: candidate.body,
      labels: candidate.labels,
      sourceEntityType: candidate.sourceEntityType,
      sourceEntityId: candidate.sourceEntityId,
    });

    if (candidate.riskLevel === 'medium' || candidate.riskLevel === 'high') {
      const approvalId = `appr-${this.nextApprovalId++}`;
      this.approvalStore.set(approvalId, { issueId: issue.id, status: 'pending' });
      return { issue, approvalRequired: true, approvalId };
    }

    return { issue, approvalRequired: false };
  }

  /**
   * Approve a pending issue creation.
   */
  approveIssue(approvalId: string): boolean {
    const approval = this.approvalStore.get(approvalId);
    if (!approval || approval.status !== 'pending') return false;
    approval.status = 'approved';
    return true;
  }

  /**
   * Reject a pending issue creation.
   */
  rejectIssue(approvalId: string): boolean {
    const approval = this.approvalStore.get(approvalId);
    if (!approval || approval.status !== 'pending') return false;
    approval.status = 'rejected';
    // Close the issue
    const issue = this.store.githubIssues.find(i => i.id === approval.issueId);
    if (issue) issue.status = 'wontfix';
    return true;
  }

  // ── CI Result Tracking ─────────────────────────────────────────

  /**
   * Record CI results for a code change.
   * Creates BuildRun and TestRun with results.
   */
  recordCIResult(params: {
    codeChangeId?: string;
    commandRunId?: string;
    suiteName: string;
    buildStatus: BuildStatus;
    testStatus: TestStatus;
    passed: number;
    failed: number;
    skipped: number;
    durationMs: number;
    logSummary?: string;
  }): CIResult {
    const buildRun = this.store.createBuildRun({
      codeChangeId: params.codeChangeId,
      commandRunId: params.commandRunId,
    });
    this.store.updateBuildStatus(buildRun.id, params.buildStatus, params.logSummary, params.durationMs);

    const testRun = this.store.createTestRun({
      buildRunId: buildRun.id,
      commandRunId: params.commandRunId,
      suiteName: params.suiteName,
    });
    this.store.updateTestResult(testRun.id, params.testStatus, params.passed, params.failed, params.skipped, params.durationMs);

    return {
      buildRunId: buildRun.id,
      testRunId: testRun.id,
      buildStatus: params.buildStatus,
      testStatus: params.testStatus,
      passed: params.passed,
      failed: params.failed,
      skipped: params.skipped,
      durationMs: params.durationMs,
    };
  }

  // ── PR Creation ────────────────────────────────────────────────

  /**
   * Create a PR linked to a code change.
   */
  createPR(params: {
    repositorySlug: string;
    branchName: string;
    title: string;
    body?: string;
    files?: Array<{ path: string; changeType: 'added' | 'modified' | 'deleted' }>;
    sourceEntityType?: string;
    sourceEntityId?: string;
  }): { pr: ReturnType<WaveDStore['createPullRequest']>; codeChange: ReturnType<WaveDStore['recordCodeChange']> } {
    let repo = this.store.getRepository(params.repositorySlug);
    if (!repo) repo = this.store.registerRepository(params.repositorySlug);

    const branch = this.store.createBranch(repo.id, params.branchName);

    const pr = this.store.createPullRequest({
      repositoryId: repo.id,
      branchId: branch.id,
      title: params.title,
      body: params.body,
      sourceEntityType: params.sourceEntityType,
      sourceEntityId: params.sourceEntityId,
    });

    const { change } = this.store.recordCodeChange({
      pullRequestId: pr.id,
      summary: params.title,
      files: params.files?.map(f => ({ ...f, additions: 10, deletions: 5 })),
    });

    return { pr, codeChange: change };
  }

  // ── Skill Catalog ──────────────────────────────────────────────

  /**
   * Register a skill in the catalog.
   */
  registerSkill(skillKey: string, source: string, phases: string[], description?: string) {
    return this.store.registerSkill(skillKey, source, phases, description);
  }

  /**
   * Run a skill and record the result.
   */
  runSkill(skillKey: string, executionMode: string, commandRunId?: string, output?: Record<string, unknown>) {
    return this.store.recordSkillRun({ commandRunId, skillKey, executionMode, output });
  }

  /**
   * List enabled skills.
   */
  listSkills() {
    return this.store.skillCatalog.filter(s => s.status === 'enabled');
  }

  // ── Agent Assignment Rules ─────────────────────────────────────

  /**
   * Set an agent assignment rule.
   */
  setAssignmentRule(ruleKey: string, pattern: string, agentType: string, priority: number = 0) {
    return this.store.setAssignmentRule(ruleKey, pattern, agentType, priority);
  }

  /**
   * Match a text against enabled assignment rules (read-only preview).
   */
  matchRule(text: string) {
    return this.store.matchAssignmentRule(text);
  }

  /**
   * List all assignment rules.
   */
  listAssignmentRules() {
    return [...this.store.assignmentRules].sort((a, b) => b.priority - a.priority);
  }

  // ── Summary ────────────────────────────────────────────────────

  summary() {
    return this.store.summary();
  }
}
