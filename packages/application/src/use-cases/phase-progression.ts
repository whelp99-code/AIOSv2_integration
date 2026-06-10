/**
 * Phase Progression Use Case
 * Phase 진행 유스케이스
 */

import type { 
  WorkflowState, 
  WorkflowPhase,
  WorkflowProgress,
  TaskStatus
} from '@aios/domain';

export interface IPhaseProgressionUseCase {
  /**
   * Phase 시작
   */
  startPhase(projectId: string, phase: WorkflowPhase): Promise<WorkflowState>;
  
  /**
   * Phase 완료
   */
  completePhase(projectId: string, phase: WorkflowPhase): Promise<WorkflowState>;
  
  /**
   * 다음 Phase로 진행
   */
  advanceToNextPhase(projectId: string): Promise<WorkflowState>;
  
  /**
   * Phase 진행률 조회
   */
  getPhaseProgress(projectId: string, phase: WorkflowPhase): Promise<WorkflowProgress>;
  
  /**
   * 전체 진행률 조회
   */
  getOverallProgress(projectId: string): Promise<WorkflowProgress>;
  
  /**
   * Phase 상태 검증
   */
  validatePhaseCompletion(projectId: string, phase: WorkflowPhase): Promise<boolean>;
}

export class PhaseProgressionUseCase implements IPhaseProgressionUseCase {
  private readonly PHASE_ORDER: WorkflowPhase[] = [
    'phase-1',
    'phase-2',
    'phase-3',
    'phase-4',
    'phase-5',
    'phase-6',
    'phase-7'
  ];
  
  async startPhase(projectId: string, phase: WorkflowPhase): Promise<WorkflowState> {
    return {
      id: `workflow-${projectId}-${phase}`,
      projectId,
      phase,
      status: 'in-progress',
      startedAt: new Date(),
      updatedAt: new Date(),
      tasks: [],
      metadata: {}
    };
  }
  
  async completePhase(projectId: string, phase: WorkflowPhase): Promise<WorkflowState> {
    return {
      id: `workflow-${projectId}-${phase}`,
      projectId,
      phase,
      status: 'completed',
      startedAt: new Date(),
      updatedAt: new Date(),
      completedAt: new Date(),
      tasks: [],
      metadata: {}
    };
  }
  
  async advanceToNextPhase(projectId: string): Promise<WorkflowState> {
    // 현재 Phase 조회 후 다음 Phase로 진행
    const currentPhase = await this.getCurrentPhase(projectId);
    const nextPhase = this.getNextPhase(currentPhase);
    
    if (!nextPhase) {
      throw new Error('No next phase available');
    }
    
    return this.startPhase(projectId, nextPhase);
  }
  
  async getPhaseProgress(projectId: string, phase: WorkflowPhase): Promise<WorkflowProgress> {
    return {
      phase,
      totalTasks: 0,
      completedTasks: 0,
      blockedTasks: 0,
      deferredTasks: 0,
      progress: 0
    };
  }
  
  async getOverallProgress(projectId: string): Promise<WorkflowProgress> {
    return {
      phase: 'phase-1',
      totalTasks: 0,
      completedTasks: 0,
      blockedTasks: 0,
      deferredTasks: 0,
      progress: 0
    };
  }
  
  async validatePhaseCompletion(projectId: string, phase: WorkflowPhase): Promise<boolean> {
    // Phase 완료 검증 로직
    return true;
  }
  
  private async getCurrentPhase(projectId: string): Promise<WorkflowPhase> {
    // 현재 Phase 조회 로직
    return 'phase-1';
  }
  
  private getNextPhase(currentPhase: WorkflowPhase): WorkflowPhase | null {
    const currentIndex = this.PHASE_ORDER.indexOf(currentPhase);
    if (currentIndex < this.PHASE_ORDER.length - 1) {
      return this.PHASE_ORDER[currentIndex + 1];
    }
    return null;
  }
}
