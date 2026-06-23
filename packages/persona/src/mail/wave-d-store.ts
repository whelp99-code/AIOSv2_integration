/**
 * Wave D Store — Phase 7: Code & CI Collaboration
 *
 * In-memory store for 17 Wave D models:
 * Repository, Branch, PullRequest, CodeChange, ChangedFile,
 * BuildRun, TestRun, CodexTask, CodexTaskLog, CursorSession,
 * GitHubIssue, ExecutionPolicy, WorkflowTemplate, SkillCatalogItem,
 * SkillRun, WorkBreakdownItem, AgentAssignmentRule
 *
 * Source: docs/54-llm-classifier-model-integration-replan.md Phase 7
 */

// ═══════════════════════════════════════════════════════════════════════
// Model Types
// ═══════════════════════════════════════════════════════════════════════

export interface RepositoryRecord {
  id: string; slug: string; remoteUrl: string | null; defaultBranch: string; createdAt: string;
}
export interface BranchRecord {
  id: string; repositoryId: string; name: string; sha: string | null; createdAt: string;
}
export type PRStatus = 'open' | 'merged' | 'closed' | 'draft';
export interface PullRequestRecord {
  id: string; repositoryId: string; branchId: string | null; number: number; title: string;
  body: string | null; status: PRStatus; url: string | null; ciStatus: string | null;
  sourceEntityType: string | null; sourceEntityId: string | null; createdAt: string;
}
export interface CodeChangeRecord {
  id: string; pullRequestId: string | null; commandRunId: string | null; summary: string; createdAt: string;
}
export type FileChangeType = 'added' | 'modified' | 'deleted' | 'renamed';
export interface ChangedFileRecord {
  id: string; codeChangeId: string; path: string; changeType: FileChangeType; additions: number; deletions: number; createdAt: string;
}
export type BuildStatus = 'pending' | 'running' | 'passed' | 'failed' | 'cancelled';
export interface BuildRunRecord {
  id: string; codeChangeId: string | null; commandRunId: string | null; status: BuildStatus; logSummary: string | null; durationMs: number | null; createdAt: string;
}
export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
export interface TestRunRecord {
  id: string; buildRunId: string | null; commandRunId: string | null; suiteName: string; status: TestStatus; passed: number; failed: number; skipped: number; durationMs: number | null; createdAt: string;
}
export type CodexTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export interface CodexTaskRecord {
  id: string; commandRunId: string | null; title: string; status: CodexTaskStatus; githubIssueId: string | null; pullRequestId: string | null; createdAt: string; updatedAt: string;
}
export interface CodexTaskLogRecord {
  id: string; taskId: string; level: 'info' | 'warn' | 'error'; message: string; metadata: Record<string, unknown> | null; createdAt: string;
}
export interface CursorSessionRecord {
  id: string; commandRunId: string | null; title: string; status: 'active' | 'completed' | 'abandoned'; fileCount: number; changeCount: number; createdAt: string;
}
export type IssueStatus = 'open' | 'in_progress' | 'closed' | 'wontfix';
export interface GitHubIssueRecord {
  id: string; commandRunId: string | null; codexTaskId: string | null; number: number; title: string;
  body: string | null; url: string | null; status: IssueStatus; labels: string[];
  sourceEntityType: string | null; sourceEntityId: string | null; createdAt: string;
}
export interface ExecutionPolicyRecord {
  id: string; policyKey: string; configJson: Record<string, unknown>; createdAt: string;
}
export interface WorkflowTemplateRecord {
  id: string; name: string; description: string | null; steps: Array<{ name: string; agentType: string; toolName?: string }>; createdAt: string;
}
export type SkillStatus = 'enabled' | 'disabled' | 'deprecated';
export interface SkillCatalogItemRecord {
  id: string; skillKey: string; source: string; description: string | null; phases: string[]; status: SkillStatus; usageCount: number; createdAt: string;
}
export interface SkillRunRecord {
  id: string; commandRunId: string | null; skillKey: string; status: 'completed' | 'failed' | 'skipped'; executionMode: string; output: Record<string, unknown> | null; createdAt: string;
}
export interface WorkBreakdownItemRecord {
  id: string; commandRunId: string | null; skillRunId: string | null; title: string; description: string | null;
  targetArea: string; agentType: string; riskLevel: string; estimatedHours: number; status: 'pending' | 'assigned' | 'completed'; createdAt: string;
}
export interface AgentAssignmentRuleRecord {
  id: string; ruleKey: string; pattern: string; agentType: string; priority: number; enabled: boolean; createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Wave D Store
// ═══════════════════════════════════════════════════════════════════════

let nextId = 1;
function genId(prefix: string = 'wd'): string { return `${prefix}-${String(nextId++).padStart(8, '0')}`; }

export class WaveDStore {
  readonly repositories: RepositoryRecord[] = [];
  readonly branches: BranchRecord[] = [];
  readonly pullRequests: PullRequestRecord[] = [];
  readonly codeChanges: CodeChangeRecord[] = [];
  readonly changedFiles: ChangedFileRecord[] = [];
  readonly buildRuns: BuildRunRecord[] = [];
  readonly testRuns: TestRunRecord[] = [];
  readonly codexTasks: CodexTaskRecord[] = [];
  readonly codexTaskLogs: CodexTaskLogRecord[] = [];
  readonly cursorSessions: CursorSessionRecord[] = [];
  readonly githubIssues: GitHubIssueRecord[] = [];
  readonly executionPolicies: ExecutionPolicyRecord[] = [];
  readonly workflowTemplates: WorkflowTemplateRecord[] = [];
  readonly skillCatalog: SkillCatalogItemRecord[] = [];
  readonly skillRuns: SkillRunRecord[] = [];
  readonly workBreakdownItems: WorkBreakdownItemRecord[] = [];
  readonly assignmentRules: AgentAssignmentRuleRecord[] = [];

  // ── Repository ─────────────────────────────────────────────────

  registerRepository(slug: string, remoteUrl?: string, defaultBranch: string = 'main'): RepositoryRecord {
    const r: RepositoryRecord = { id: genId('repo'), slug, remoteUrl: remoteUrl ?? null, defaultBranch, createdAt: new Date().toISOString() };
    this.repositories.push(r); return r;
  }
  getRepository(slug: string): RepositoryRecord | null { return this.repositories.find(r => r.slug === slug) ?? null; }

  // ── Branch ─────────────────────────────────────────────────────

  createBranch(repositoryId: string, name: string, sha?: string): BranchRecord {
    const r: BranchRecord = { id: genId('br'), repositoryId, name, sha: sha ?? null, createdAt: new Date().toISOString() };
    this.branches.push(r); return r;
  }

  // ── PullRequest ────────────────────────────────────────────────

  private nextPRNumber = 1;
  createPullRequest(params: { repositoryId: string; branchId?: string; title: string; body?: string; sourceEntityType?: string; sourceEntityId?: string }): PullRequestRecord {
    const r: PullRequestRecord = {
      id: genId('pr'), repositoryId: params.repositoryId, branchId: params.branchId ?? null, number: this.nextPRNumber++,
      title: params.title, body: params.body ?? null, status: 'open', url: null, ciStatus: null,
      sourceEntityType: params.sourceEntityType ?? null, sourceEntityId: params.sourceEntityId ?? null, createdAt: new Date().toISOString(),
    };
    this.pullRequests.push(r); return r;
  }
  updatePRStatus(prId: string, status: PRStatus, ciStatus?: string): PullRequestRecord | null {
    const pr = this.pullRequests.find(p => p.id === prId); if (!pr) return null;
    pr.status = status; if (ciStatus !== undefined) pr.ciStatus = ciStatus; return pr;
  }

  // ── CodeChange + ChangedFile ───────────────────────────────────

  recordCodeChange(params: { pullRequestId?: string; commandRunId?: string; summary: string; files?: Array<{ path: string; changeType: FileChangeType; additions?: number; deletions?: number }> }): { change: CodeChangeRecord; files: ChangedFileRecord[] } {
    const change: CodeChangeRecord = { id: genId('cc'), pullRequestId: params.pullRequestId ?? null, commandRunId: params.commandRunId ?? null, summary: params.summary, createdAt: new Date().toISOString() };
    this.codeChanges.push(change);
    const files: ChangedFileRecord[] = (params.files ?? []).map(f => {
      const rec: ChangedFileRecord = { id: genId('cf'), codeChangeId: change.id, path: f.path, changeType: f.changeType, additions: f.additions ?? 0, deletions: f.deletions ?? 0, createdAt: new Date().toISOString() };
      this.changedFiles.push(rec); return rec;
    });
    return { change, files };
  }

  // ── BuildRun + TestRun ─────────────────────────────────────────

  createBuildRun(params: { codeChangeId?: string; commandRunId?: string }): BuildRunRecord {
    const r: BuildRunRecord = { id: genId('build'), codeChangeId: params.codeChangeId ?? null, commandRunId: params.commandRunId ?? null, status: 'pending', logSummary: null, durationMs: null, createdAt: new Date().toISOString() };
    this.buildRuns.push(r); return r;
  }
  updateBuildStatus(buildId: string, status: BuildStatus, logSummary?: string, durationMs?: number): BuildRunRecord | null {
    const b = this.buildRuns.find(r => r.id === buildId); if (!b) return null;
    b.status = status; if (logSummary) b.logSummary = logSummary; if (durationMs) b.durationMs = durationMs; return b;
  }
  createTestRun(params: { buildRunId?: string; commandRunId?: string; suiteName: string }): TestRunRecord {
    const r: TestRunRecord = { id: genId('test'), buildRunId: params.buildRunId ?? null, commandRunId: params.commandRunId ?? null, suiteName: params.suiteName, status: 'pending', passed: 0, failed: 0, skipped: 0, durationMs: null, createdAt: new Date().toISOString() };
    this.testRuns.push(r); return r;
  }
  updateTestResult(testId: string, status: TestStatus, passed: number, failed: number, skipped: number = 0, durationMs?: number): TestRunRecord | null {
    const t = this.testRuns.find(r => r.id === testId); if (!t) return null;
    t.status = status; t.passed = passed; t.failed = failed; t.skipped = skipped; if (durationMs) t.durationMs = durationMs; return t;
  }

  // ── CodexTask + Log ────────────────────────────────────────────

  createCodexTask(params: { commandRunId?: string; title: string; githubIssueId?: string; pullRequestId?: string }): CodexTaskRecord {
    const r: CodexTaskRecord = { id: genId('codex'), commandRunId: params.commandRunId ?? null, title: params.title, status: 'pending', githubIssueId: params.githubIssueId ?? null, pullRequestId: params.pullRequestId ?? null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.codexTasks.push(r); return r;
  }
  logCodexTask(taskId: string, level: CodexTaskLogRecord['level'], message: string, metadata?: Record<string, unknown>): CodexTaskLogRecord {
    const r: CodexTaskLogRecord = { id: genId('cxlog'), taskId, level, message, metadata: metadata ?? null, createdAt: new Date().toISOString() };
    this.codexTaskLogs.push(r); return r;
  }

  // ── CursorSession ──────────────────────────────────────────────

  createCursorSession(params: { commandRunId?: string; title: string }): CursorSessionRecord {
    const r: CursorSessionRecord = { id: genId('cursor'), commandRunId: params.commandRunId ?? null, title: params.title, status: 'active', fileCount: 0, changeCount: 0, createdAt: new Date().toISOString() };
    this.cursorSessions.push(r); return r;
  }

  // ── GitHubIssue ────────────────────────────────────────────────

  private nextIssueNumber = 1;
  createGitHubIssue(params: { commandRunId?: string; codexTaskId?: string; title: string; body?: string; labels?: string[]; sourceEntityType?: string; sourceEntityId?: string }): GitHubIssueRecord {
    const r: GitHubIssueRecord = {
      id: genId('issue'), commandRunId: params.commandRunId ?? null, codexTaskId: params.codexTaskId ?? null,
      number: this.nextIssueNumber++, title: params.title, body: params.body ?? null, url: null,
      status: 'open', labels: params.labels ?? [], sourceEntityType: params.sourceEntityType ?? null,
      sourceEntityId: params.sourceEntityId ?? null, createdAt: new Date().toISOString(),
    };
    this.githubIssues.push(r); return r;
  }
  getOpenIssues(): GitHubIssueRecord[] { return this.githubIssues.filter(i => i.status === 'open'); }

  // ── ExecutionPolicy ────────────────────────────────────────────

  setExecutionPolicy(key: string, config: Record<string, unknown>): ExecutionPolicyRecord {
    const existing = this.executionPolicies.find(p => p.policyKey === key);
    if (existing) { existing.configJson = config; return existing; }
    const r: ExecutionPolicyRecord = { id: genId('epol'), policyKey: key, configJson: config, createdAt: new Date().toISOString() };
    this.executionPolicies.push(r); return r;
  }

  // ── WorkflowTemplate ───────────────────────────────────────────

  createWorkflowTemplate(name: string, steps: WorkflowTemplateRecord['steps'], description?: string): WorkflowTemplateRecord {
    const r: WorkflowTemplateRecord = { id: genId('wtpl'), name, description: description ?? null, steps, createdAt: new Date().toISOString() };
    this.workflowTemplates.push(r); return r;
  }

  // ── SkillCatalog ───────────────────────────────────────────────

  registerSkill(skillKey: string, source: string, phases: string[], description?: string): SkillCatalogItemRecord {
    const existing = this.skillCatalog.find(s => s.skillKey === skillKey);
    if (existing) return existing;
    const r: SkillCatalogItemRecord = { id: genId('skill'), skillKey, source, description: description ?? null, phases, status: 'enabled', usageCount: 0, createdAt: new Date().toISOString() };
    this.skillCatalog.push(r); return r;
  }
  recordSkillRun(params: { commandRunId?: string; skillKey: string; executionMode: string; status?: SkillRunRecord['status']; output?: Record<string, unknown> }): SkillRunRecord {
    const skill = this.skillCatalog.find(s => s.skillKey === params.skillKey);
    if (skill) skill.usageCount++;
    const r: SkillRunRecord = { id: genId('srun'), commandRunId: params.commandRunId ?? null, skillKey: params.skillKey, status: params.status ?? 'completed', executionMode: params.executionMode, output: params.output ?? null, createdAt: new Date().toISOString() };
    this.skillRuns.push(r); return r;
  }

  // ── WorkBreakdownItem ──────────────────────────────────────────

  createWorkItem(params: { commandRunId?: string; skillRunId?: string; title: string; targetArea: string; agentType: string; riskLevel?: string; estimatedHours?: number; description?: string }): WorkBreakdownItemRecord {
    const r: WorkBreakdownItemRecord = { id: genId('wbi'), commandRunId: params.commandRunId ?? null, skillRunId: params.skillRunId ?? null, title: params.title, description: params.description ?? null, targetArea: params.targetArea, agentType: params.agentType, riskLevel: params.riskLevel ?? 'low', estimatedHours: params.estimatedHours ?? 2, status: 'pending', createdAt: new Date().toISOString() };
    this.workBreakdownItems.push(r); return r;
  }

  // ── AgentAssignmentRule ────────────────────────────────────────

  setAssignmentRule(ruleKey: string, pattern: string, agentType: string, priority: number = 0): AgentAssignmentRuleRecord {
    const existing = this.assignmentRules.find(r => r.ruleKey === ruleKey);
    if (existing) { existing.pattern = pattern; existing.agentType = agentType; existing.priority = priority; return existing; }
    const r: AgentAssignmentRuleRecord = { id: genId('arule'), ruleKey, pattern, agentType, priority, enabled: true, createdAt: new Date().toISOString() };
    this.assignmentRules.push(r); return r;
  }
  matchAssignmentRule(text: string): AgentAssignmentRuleRecord | null {
    const sorted = [...this.assignmentRules].filter(r => r.enabled).sort((a, b) => b.priority - a.priority);
    for (const rule of sorted) {
      if (new RegExp(rule.pattern, 'i').test(text)) return rule;
    }
    return null;
  }

  // ── Summary ────────────────────────────────────────────────────

  summary(): Record<string, number> {
    return {
      repositories: this.repositories.length, branches: this.branches.length, pullRequests: this.pullRequests.length,
      codeChanges: this.codeChanges.length, changedFiles: this.changedFiles.length, buildRuns: this.buildRuns.length,
      testRuns: this.testRuns.length, codexTasks: this.codexTasks.length, codexTaskLogs: this.codexTaskLogs.length,
      cursorSessions: this.cursorSessions.length, githubIssues: this.githubIssues.length,
      executionPolicies: this.executionPolicies.length, workflowTemplates: this.workflowTemplates.length,
      skillCatalog: this.skillCatalog.length, skillRuns: this.skillRuns.length,
      workBreakdownItems: this.workBreakdownItems.length, assignmentRules: this.assignmentRules.length,
    };
  }

  clear(): void {
    for (const key of Object.keys(this) as Array<keyof WaveDStore>) {
      if (Array.isArray(this[key])) (this[key] as unknown[]).length = 0;
    }
    this.nextPRNumber = 1; this.nextIssueNumber = 1;
  }
}
