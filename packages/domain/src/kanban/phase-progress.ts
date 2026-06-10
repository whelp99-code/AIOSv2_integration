/**
 * Phase Progress Summary
 * Phase 진행 요약 모델
 */

export interface PhaseProgressSummary {
  phase: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  deferredTasks: number;
  progress: number; // 0-100
  startDate?: Date;
  endDate?: Date;
  estimatedCompletion?: Date;
}

export interface PhaseProgressFilter {
  phase?: string;
  status?: string;
  assignee?: string;
}

export interface PhaseProgressEvent {
  type: 'task-moved' | 'task-created' | 'task-completed' | 'phase-started' | 'phase-completed';
  phase: string;
  taskId?: string;
  timestamp: Date;
  details: Record<string, unknown>;
}

export class PhaseProgressTracker {
  private progress: Map<string, PhaseProgressSummary> = new Map();
  
  /**
   * Phase 진행 상황 업데이트
   */
  updateProgress(phase: string, summary: PhaseProgressSummary): void {
    this.progress.set(phase, summary);
  }
  
  /**
   * Phase 진행 상황 조회
   */
  getProgress(phase: string): PhaseProgressSummary | undefined {
    return this.progress.get(phase);
  }
  
  /**
   * 전체 Phase 진행 상황 조회
   */
  getAllProgress(): PhaseProgressSummary[] {
    return Array.from(this.progress.values());
  }
  
  /**
   * 진행률 계산
   */
  calculateProgress(phase: string): number {
    const summary = this.progress.get(phase);
    if (!summary || summary.totalTasks === 0) {
      return 0;
    }
    
    return Math.round((summary.completedTasks / summary.totalTasks) * 100);
  }
  
  /**
   * Phase 완료 여부 확인
   */
  isPhaseCompleted(phase: string): boolean {
    const summary = this.progress.get(phase);
    if (!summary) {
      return false;
    }
    
    return summary.completedTasks === summary.totalTasks;
  }
  
  /**
   * 진행 이벤트 생성
   */
  createEvent(
    type: PhaseProgressEvent['type'],
    phase: string,
    taskId?: string,
    details?: Record<string, unknown>
  ): PhaseProgressEvent {
    return {
      type,
      phase,
      taskId,
      timestamp: new Date(),
      details: details || {}
    };
  }
}
