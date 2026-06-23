/**
 * PMPersona - 프로젝트 관리 페르소나
 * 
 * 프로젝트 상태 관리, 일정 추적, 작업 관리를 담당한다.
 */

import { type MailItem, type ClassificationResult } from '../mail/classifier';

// 프로젝트 인터페이스
export interface Project {
  id: string;
  name: string;
  status: 'PLANNING' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  startDate: string;
  endDate: string | null;
  progress: number;
  createdAt: string;
}

// 작업(Task) 인터페이스
export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
  assignee: string;
  dueDate: string | null;
  createdAt: string;
}

// 프로젝트 상태 업데이트
export interface ProjectUpdate {
  projectId: string;
  field: string;
  oldValue: string;
  newValue: string;
  updatedAt: string;
}

// PM 처리 결과
export interface PMResult {
  mailId: string;
  project: Project | null;
  task: Task | null;
  updates: ProjectUpdate[];
  action: 'PROJECT_CREATED' | 'TASK_CREATED' | 'STATUS_UPDATED' | 'SCHEDULE_UPDATED' | 'NO_ACTION';
  timestamp: string;
}

/**
 * PM 페르소나
 */
export class PMPersona {
  private projects: Map<string, Project> = new Map();
  private tasks: Map<string, Task> = new Map();

  constructor() {
    this.initializeSampleData();
  }

  /**
   * 샘플 데이터 초기화
   */
  private initializeSampleData(): void {
    const sampleProject: Project = {
      id: 'proj-1',
      name: 'AIOS v2 구축',
      status: 'IN_PROGRESS',
      startDate: '2026-06-01',
      endDate: '2026-08-31',
      progress: 15,
      createdAt: new Date().toISOString(),
    };

    this.projects.set(sampleProject.id, sampleProject);
  }

  /**
   * 메일 처리
   */
  async processMail(mail: MailItem, classification: ClassificationResult): Promise<PMResult> {
    console.log(`[PM] Processing mail: ${mail.id} - ${mail.subject}`);

    // 메일 유형에 따른 처리
    if (this.isProjectStatusMail(mail)) {
      return this.processProjectStatusMail(mail);
    } else if (this.isScheduleMail(mail)) {
      return this.processScheduleMail(mail);
    } else if (this.isTaskMail(mail)) {
      return this.processTaskMail(mail);
    }

    return {
      mailId: mail.id,
      project: null,
      task: null,
      updates: [],
      action: 'NO_ACTION',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 프로젝트 상태 메일 처리
   */
  private async processProjectStatusMail(mail: MailItem): Promise<PMResult> {
    const project = this.findOrCreateProject(mail);
    const updates: ProjectUpdate[] = [];

    // 상태 업데이트 감지
    const newStatus = this.detectStatus(mail);
    if (newStatus && newStatus !== project.status) {
      const oldStatus = project.status;
      project.status = newStatus;
      updates.push({
        projectId: project.id,
        field: 'status',
        oldValue: oldStatus,
        newValue: newStatus,
        updatedAt: new Date().toISOString(),
      });
    }

    // 진행률 업데이트 감지
    const newProgress = this.detectProgress(mail);
    if (newProgress !== null && newProgress !== project.progress) {
      const oldProgress = project.progress.toString();
      project.progress = newProgress;
      updates.push({
        projectId: project.id,
        field: 'progress',
        oldValue: oldProgress,
        newValue: newProgress.toString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return {
      mailId: mail.id,
      project,
      task: null,
      updates,
      action: updates.length > 0 ? 'STATUS_UPDATED' : 'NO_ACTION',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 일정 메일 처리
   */
  private async processScheduleMail(mail: MailItem): Promise<PMResult> {
    const project = this.findOrCreateProject(mail);
    const updates: ProjectUpdate[] = [];

    // 마감일 업데이트
    const newEndDate = this.extractDate(mail);
    if (newEndDate) {
      const oldEndDate = project.endDate || '미정';
      project.endDate = newEndDate;
      updates.push({
        projectId: project.id,
        field: 'endDate',
        oldValue: oldEndDate,
        newValue: newEndDate,
        updatedAt: new Date().toISOString(),
      });
    }

    return {
      mailId: mail.id,
      project,
      task: null,
      updates,
      action: updates.length > 0 ? 'SCHEDULE_UPDATED' : 'NO_ACTION',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 작업 메일 처리
   */
  private async processTaskMail(mail: MailItem): Promise<PMResult> {
    const project = this.findOrCreateProject(mail);

    const task: Task = {
      id: `task-${Date.now()}`,
      projectId: project.id,
      title: this.extractTaskTitle(mail),
      description: mail.body,
      status: 'TODO',
      assignee: this.extractAssignee(mail),
      dueDate: this.extractDate(mail),
      createdAt: new Date().toISOString(),
    };

    this.tasks.set(task.id, task);
    console.log(`[PM] Task created: ${task.id}`);

    return {
      mailId: mail.id,
      project,
      task,
      updates: [],
      action: 'TASK_CREATED',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 프로젝트 검색 또는 생성
   */
  private findOrCreateProject(mail: MailItem): Project {
    // 기존 프로젝트 검색
    for (const [, project] of this.projects) {
      if (mail.subject.toLowerCase().includes(project.name.toLowerCase())) {
        return project;
      }
    }

    // 새 프로젝트 생성
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name: this.extractProjectName(mail),
      status: 'PLANNING',
      startDate: new Date().toISOString().split('T')[0],
      endDate: null,
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    this.projects.set(newProject.id, newProject);
    console.log(`[PM] Project created: ${newProject.id}`);

    return newProject;
  }

  /**
   * 프로젝트 상태 메일 여부 확인
   */
  private isProjectStatusMail(mail: MailItem): boolean {
    const statusKeywords = ['상태', 'status', '진행', 'progress', '완료', 'completed'];
    const text = `${mail.subject} ${mail.body}`.toLowerCase();
    return statusKeywords.some(kw => text.includes(kw));
  }

  /**
   * 일정 메일 여부 확인
   */
  private isScheduleMail(mail: MailItem): boolean {
    const scheduleKeywords = ['일정', 'schedule', '마감', 'deadline', '연기', 'postpone'];
    const text = `${mail.subject} ${mail.body}`.toLowerCase();
    return scheduleKeywords.some(kw => text.includes(kw));
  }

  /**
   * 작업 메일 여부 확인
   */
  private isTaskMail(mail: MailItem): boolean {
    const taskKeywords = ['작업', 'task', '할당', 'assign', '요청', 'request'];
    const text = `${mail.subject} ${mail.body}`.toLowerCase();
    return taskKeywords.some(kw => text.includes(kw));
  }

  /**
   * 상태 감지
   */
  private detectStatus(mail: MailItem): Project['status'] | null {
    const text = `${mail.subject} ${mail.body}`.toLowerCase();

    if (text.includes('완료') || text.includes('completed')) return 'COMPLETED';
    if (text.includes('보류') || text.includes('hold')) return 'ON_HOLD';
    if (text.includes('취소') || text.includes('cancelled')) return 'CANCELLED';
    if (text.includes('진행') || text.includes('progress')) return 'IN_PROGRESS';

    return null;
  }

  /**
   * 진행률 감지
   */
  private detectProgress(mail: MailItem): number | null {
    const progressMatch = mail.body.match(/(\d+)%/);
    if (progressMatch) {
      return parseInt(progressMatch[1], 10);
    }
    return null;
  }

  /**
   * 날짜 추출
   */
  private extractDate(mail: MailItem): string | null {
    const dateMatch = mail.body.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
    if (dateMatch) {
      return dateMatch[1].replace(/\//g, '-');
    }
    return null;
  }

  /**
   * 프로젝트 이름 추출
   */
  private extractProjectName(mail: MailItem): string {
    // "프로젝트: XXX" 패턴에서 추출
    const nameMatch = mail.subject.match(/프로젝트[:\s]+(.+)/i);
    if (nameMatch) {
      return nameMatch[1].trim();
    }
    return mail.subject.substring(0, 50);
  }

  /**
   * 작업 제목 추출
   */
  private extractTaskTitle(mail: MailItem): string {
    const titleMatch = mail.subject.match(/작업[:\s]+(.+)/i);
    if (titleMatch) {
      return titleMatch[1].trim();
    }
    return mail.subject.substring(0, 50);
  }

  /**
   * 담당자 추출
   */
  private extractAssignee(mail: MailItem): string {
    const assigneeMatch = mail.body.match(/담당자[:\s]+(\S+)/);
    if (assigneeMatch) {
      return assigneeMatch[1];
    }
    return mail.from.split('@')[0];
  }

  /**
   * 프로젝트 목록 조회
   */
  getProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  /**
   * 작업 목록 조회
   */
  getTasks(): Task[] {
    return Array.from(this.tasks.values());
  }
}
