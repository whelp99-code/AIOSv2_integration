/**
 * Kanban Board Domain Model
 * 칸반 보드 도메인 모델
 */

export interface KanbanBoard {
  id: string;
  name: string;
  description: string;
  columns: KanbanColumn[];
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export interface KanbanColumn {
  id: string;
  name: string;
  description: string;
  position: number;
  cards: KanbanCard[];
  limits?: ColumnLimits;
}

export interface ColumnLimits {
  min?: number;
  max?: number;
}

export interface KanbanCard {
  id: string;
  title: string;
  description: string;
  columnId: string;
  position: number;
  assignee?: string;
  labels: string[];
  priority: CardPriority;
  status: CardStatus;
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  metadata: Record<string, unknown>;
}

export type CardPriority = 'low' | 'medium' | 'high' | 'critical';

export type CardStatus = 
  | 'backlog'
  | 'ready'
  | 'in-progress'
  | 'done'
  | 'blocked'
  | 'deferred';

export interface KanbanBoardCreationRequest {
  name: string;
  description: string;
  columns?: ColumnDefinition[];
}

export interface ColumnDefinition {
  name: string;
  description: string;
  position: number;
  limits?: ColumnLimits;
}

export interface KanbanCardCreationRequest {
  title: string;
  description: string;
  columnId: string;
  assignee?: string;
  labels?: string[];
  priority?: CardPriority;
  dueDate?: Date;
}

export interface KanbanCardUpdateRequest {
  title?: string;
  description?: string;
  columnId?: string;
  position?: number;
  assignee?: string;
  labels?: string[];
  priority?: CardPriority;
  status?: CardStatus;
  dueDate?: Date;
}

/**
 * 기본 칸반 보드 컬럼 정의
 */
export const DEFAULT_COLUMNS: ColumnDefinition[] = [
  {
    name: 'Backlog',
    description: '아직 시작하지 않은 작업',
    position: 0
  },
  {
    name: 'Ready',
    description: '바로 개발 가능한 작업',
    position: 1
  },
  {
    name: 'In Progress',
    description: '현재 개발 중인 작업',
    position: 2
  },
  {
    name: 'Done',
    description: '개발 완료 및 커밋 완료',
    position: 3
  },
  {
    name: 'Blocked',
    description: '진행 중 문제 발생',
    position: 4
  },
  {
    name: 'Deferred',
    description: '외부 정보, secret, 운영 접근, 검증이 필요해 이번 개발 범위에서 제외된 작업',
    position: 5
  }
];
