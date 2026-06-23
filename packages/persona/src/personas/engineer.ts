/**
 * EngineerPersona - 엔지니어 페르소나
 * 
 * 코드 리뷰, 기술 작업 수행, 시스템 구축을 담당한다.
 */

import { type MailItem, type ClassificationResult } from '../mail/classifier';

// 코드 리뷰 결과
export interface CodeReview {
  id: string;
  mailId: string;
  repository: string;
  prNumber: number | null;
  status: 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
  comments: ReviewComment[];
  createdAt: string;
}

export interface ReviewComment {
  file: string;
  line: number;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
}

// 기술 작업
export interface TechTask {
  id: string;
  title: string;
  description: string;
  type: 'BUG_FIX' | 'FEATURE' | 'REFACTOR' | 'INFRA' | 'DOCUMENTATION';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
  assignee: string;
  estimatedHours: number;
  createdAt: string;
}

// 시스템 구축 결과
export interface SystemBuild {
  id: string;
  task: TechTask;
  buildStatus: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS';
  testResults: TestResult[];
  deploymentReady: boolean;
  createdAt: string;
}

export interface TestResult {
  name: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  duration: number;
}

// 엔지니어 처리 결과
export interface EngineerResult {
  mailId: string;
  codeReview: CodeReview | null;
  techTask: TechTask | null;
  systemBuild: SystemBuild | null;
  action: 'CODE_REVIEW_STARTED' | 'TASK_CREATED' | 'BUILD_INITIATED' | 'NO_ACTION';
  timestamp: string;
}

/**
 * 엔지니어 페르소나
 */
export class EngineerPersona {
  private tasks: Map<string, TechTask> = new Map();
  private reviews: Map<string, CodeReview> = new Map();

  /**
   * 메일 처리
   */
  async processMail(mail: MailItem, classification: ClassificationResult): Promise<EngineerResult> {
    console.log(`[Engineer] Processing mail: ${mail.id} - ${mail.subject}`);

    if (this.isCodeReviewMail(mail)) {
      return this.processCodeReviewMail(mail);
    } else if (this.isTaskMail(mail)) {
      return this.processTaskMail(mail);
    } else if (this.isBuildMail(mail)) {
      return this.processBuildMail(mail);
    }

    return {
      mailId: mail.id,
      codeReview: null,
      techTask: null,
      systemBuild: null,
      action: 'NO_ACTION',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 코드 리뷰 메일 처리
   */
  private async processCodeReviewMail(mail: MailItem): Promise<EngineerResult> {
    const prNumber = this.extractPRNumber(mail);
    const repository = this.extractRepository(mail);

    const review: CodeReview = {
      id: `review-${Date.now()}`,
      mailId: mail.id,
      repository,
      prNumber,
      status: 'PENDING',
      comments: this.generateReviewComments(mail),
      createdAt: new Date().toISOString(),
    };

    this.reviews.set(review.id, review);
    console.log(`[Engineer] Code review started: ${review.id}`);

    return {
      mailId: mail.id,
      codeReview: review,
      techTask: null,
      systemBuild: null,
      action: 'CODE_REVIEW_STARTED',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 작업 메일 처리
   */
  private async processTaskMail(mail: MailItem): Promise<EngineerResult> {
    const task: TechTask = {
      id: `task-${Date.now()}`,
      title: this.extractTaskTitle(mail),
      description: mail.body,
      type: this.detectTaskType(mail),
      priority: this.detectPriority(mail),
      status: 'TODO',
      assignee: this.extractAssignee(mail),
      estimatedHours: this.estimateHours(mail),
      createdAt: new Date().toISOString(),
    };

    this.tasks.set(task.id, task);
    console.log(`[Engineer] Task created: ${task.id} (${task.type})`);

    return {
      mailId: mail.id,
      codeReview: null,
      techTask: task,
      systemBuild: null,
      action: 'TASK_CREATED',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 빌드 메일 처리
   */
  private async processBuildMail(mail: MailItem): Promise<EngineerResult> {
    const task: TechTask = {
      id: `build-task-${Date.now()}`,
      title: `빌드: ${mail.subject}`,
      description: mail.body,
      type: 'INFRA',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assignee: 'engineer',
      estimatedHours: 2,
      createdAt: new Date().toISOString(),
    };

    const build: SystemBuild = {
      id: `build-${Date.now()}`,
      task,
      buildStatus: 'IN_PROGRESS',
      testResults: [],
      deploymentReady: false,
      createdAt: new Date().toISOString(),
    };

    console.log(`[Engineer] Build initiated: ${build.id}`);

    return {
      mailId: mail.id,
      codeReview: null,
      techTask: task,
      systemBuild: build,
      action: 'BUILD_INITIATED',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 코드 리뷰 메일 여부 확인
   */
  private isCodeReviewMail(mail: MailItem): boolean {
    const reviewKeywords = ['리뷰', 'review', 'PR', 'pull request', 'merge', '코드'];
    const text = `${mail.subject} ${mail.body}`.toLowerCase();
    return reviewKeywords.some(kw => text.includes(kw));
  }

  /**
   * 작업 메일 여부 확인
   */
  private isTaskMail(mail: MailItem): boolean {
    const taskKeywords = ['버그', 'bug', '기능', 'feature', '수정', 'fix', '작업', 'task'];
    const text = `${mail.subject} ${mail.body}`.toLowerCase();
    return taskKeywords.some(kw => text.includes(kw));
  }

  /**
   * 빌드 메일 여부 확인
   */
  private isBuildMail(mail: MailItem): boolean {
    const buildKeywords = ['빌드', 'build', '배포', 'deploy', 'CI/CD', 'pipeline'];
    const text = `${mail.subject} ${mail.body}`.toLowerCase();
    return buildKeywords.some(kw => text.includes(kw));
  }

  /**
   * PR 번호 추출
   */
  private extractPRNumber(mail: MailItem): number | null {
    const prMatch = mail.subject.match(/#(\d+)/);
    return prMatch ? parseInt(prMatch[1], 10) : null;
  }

  /**
   * 저장소 추출
   */
  private extractRepository(mail: MailItem): string {
    const repoMatch = mail.body.match(/repository[:\s]+(\S+)/i);
    return repoMatch ? repoMatch[1] : 'unknown';
  }

  /**
   * 리뷰 코멘트 생성
   */
  private generateReviewComments(mail: MailItem): ReviewComment[] {
    const comments: ReviewComment[] = [];

    // 기본 코멘트
    comments.push({
      file: 'src/main.ts',
      line: 1,
      severity: 'INFO',
      message: '코드 리뷰 시작',
    });

    return comments;
  }

  /**
   * 작업 제목 추출
   */
  private extractTaskTitle(mail: MailItem): string {
    return mail.subject.substring(0, 100);
  }

  /**
   * 작업 유형 감지
   */
  private detectTaskType(mail: MailItem): TechTask['type'] {
    const text = `${mail.subject} ${mail.body}`.toLowerCase();
    if (text.includes('버그') || text.includes('bug')) return 'BUG_FIX';
    if (text.includes('기능') || text.includes('feature')) return 'FEATURE';
    if (text.includes('리팩토링') || text.includes('refactor')) return 'REFACTOR';
    if (text.includes('인프라') || text.includes('infra')) return 'INFRA';
    return 'FEATURE';
  }

  /**
   * 우선순위 감지
   */
  private detectPriority(mail: MailItem): TechTask['priority'] {
    const text = `${mail.subject} ${mail.body}`.toLowerCase();
    if (text.includes('긴급') || text.includes('critical')) return 'CRITICAL';
    if (text.includes('중요') || text.includes('high')) return 'HIGH';
    if (text.includes('보통') || text.includes('medium')) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * 담당자 추출
   */
  private extractAssignee(mail: MailItem): string {
    const assigneeMatch = mail.body.match(/담당자[:\s]+(\S+)/);
    return assigneeMatch ? assigneeMatch[1] : mail.from.split('@')[0];
  }

  /**
   * 예상 시간 추정
   */
  private estimateHours(mail: MailItem): number {
    const text = `${mail.subject} ${mail.body}`.toLowerCase();
    if (text.includes('간단') || text.includes('simple')) return 1;
    if (text.includes('복잡') || text.includes('complex')) return 8;
    return 4;
  }

  /**
   * 작업 목록 조회
   */
  getTasks(): TechTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 리뷰 목록 조회
   */
  getReviews(): CodeReview[] {
    return Array.from(this.reviews.values());
  }
}
