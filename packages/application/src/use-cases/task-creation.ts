/**
 * Task Creation Use Case
 * 작업 생성 유스케이스
 */

import type { 
  Task, 
  TaskCreationRequest,
  Project
} from '@aios/domain';

export interface ITaskCreationUseCase {
  /**
   * 프로젝트 기반 작업 생성
   */
  createTasksForProject(project: Project): Promise<Task[]>;
  
  /**
   * 단일 작업 생성
   */
  createTask(request: TaskCreationRequest): Promise<Task>;
  
  /**
   * 작업 의존성 검증
   */
  validateDependencies(taskId: string, dependencies: string[]): Promise<boolean>;
  
  /**
   * 작업 중복 검사
   */
  checkDuplicateTask(projectId: string, title: string): Promise<boolean>;
}

export class TaskCreationUseCase implements ITaskCreationUseCase {
  async createTasksForProject(project: Project): Promise<Task[]> {
    // 프로젝트 기반 작업 생성 로직
    const tasks: Task[] = [];
    
    // Phase별 작업 생성
    const phases = [
      'phase-1',
      'phase-2', 
      'phase-3',
      'phase-4',
      'phase-5',
      'phase-6',
      'phase-7'
    ];
    
    for (const phase of phases) {
      const task: Task = {
        id: `${project.id}-${phase}`,
        projectId: project.id,
        title: `${phase} 작업`,
        description: `${phase} 관련 작업`,
        status: 'backlog',
        priority: 'medium',
        assignee: 'hermes',
        createdAt: new Date(),
        updatedAt: new Date(),
        dependencies: [],
        metadata: { phase }
      };
      tasks.push(task);
    }
    
    return tasks;
  }
  
  async createTask(request: TaskCreationRequest): Promise<Task> {
    return {
      id: `task-${Date.now()}`,
      projectId: request.projectId,
      title: request.title,
      description: request.description,
      status: 'backlog',
      priority: request.priority,
      assignee: request.assignee,
      createdAt: new Date(),
      updatedAt: new Date(),
      dependencies: request.dependencies || [],
      metadata: {}
    };
  }
  
  async validateDependencies(taskId: string, dependencies: string[]): Promise<boolean> {
    // 의존성 검증 로직
    return true;
  }
  
  async checkDuplicateTask(projectId: string, title: string): Promise<boolean> {
    // 중복 검사 로직
    return false;
  }
}
