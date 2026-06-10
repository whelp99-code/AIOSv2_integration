/**
 * Kanban Board Service
 * 칸반 보드 서비스 인터페이스
 */

import type { 
  KanbanBoard, 
  KanbanCard, 
  KanbanBoardCreationRequest,
  KanbanCardCreationRequest,
  KanbanCardUpdateRequest,
  PhaseProgressSummary
} from '@aios/domain';

export interface IKanbanBoardService {
  /**
   * 칸반 보드 생성
   */
  createBoard(request: KanbanBoardCreationRequest): Promise<KanbanBoard>;
  
  /**
   * 칸반 보드 조회
   */
  getBoard(boardId: string): Promise<KanbanBoard>;
  
  /**
   * 카드 생성
   */
  createCard(request: KanbanCardCreationRequest): Promise<KanbanCard>;
  
  /**
   * 카드 업데이트
   */
  updateCard(cardId: string, request: KanbanCardUpdateRequest): Promise<KanbanCard>;
  
  /**
   * 카드 이동
   */
  moveCard(cardId: string, targetColumnId: string, position?: number): Promise<KanbanCard>;
  
  /**
   * Phase 진행 상황 조회
   */
  getPhaseProgress(phase: string): Promise<PhaseProgressSummary>;
  
  /**
   * 전체 진행 상황 조회
   */
  getAllProgress(): Promise<PhaseProgressSummary[]>;
  
  /**
   * 카드 목록 조회
   */
  getCardsByColumn(columnId: string): Promise<KanbanCard[]>;
  
  /**
   * 카드 검색
   */
  searchCards(query: string): Promise<KanbanCard[]>;
}

export class KanbanBoardService implements IKanbanBoardService {
  private boards: Map<string, KanbanBoard> = new Map();
  private cards: Map<string, KanbanCard> = new Map();
  
  async createBoard(request: KanbanBoardCreationRequest): Promise<KanbanBoard> {
    const board: KanbanBoard = {
      id: `board-${Date.now()}`,
      name: request.name,
      description: request.description,
      columns: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {}
    };
    
    this.boards.set(board.id, board);
    return board;
  }
  
  async getBoard(boardId: string): Promise<KanbanBoard> {
    const board = this.boards.get(boardId);
    if (!board) {
      throw new Error(`Board ${boardId} not found`);
    }
    return board;
  }
  
  async createCard(request: KanbanCardCreationRequest): Promise<KanbanCard> {
    const card: KanbanCard = {
      id: `card-${Date.now()}`,
      title: request.title,
      description: request.description,
      columnId: request.columnId,
      position: 0,
      assignee: request.assignee,
      labels: request.labels || [],
      priority: request.priority || 'medium',
      status: 'backlog',
      createdAt: new Date(),
      updatedAt: new Date(),
      dueDate: request.dueDate,
      metadata: {}
    };
    
    this.cards.set(card.id, card);
    return card;
  }
  
  async updateCard(cardId: string, request: KanbanCardUpdateRequest): Promise<KanbanCard> {
    const card = this.cards.get(cardId);
    if (!card) {
      throw new Error(`Card ${cardId} not found`);
    }
    
    const updatedCard: KanbanCard = {
      ...card,
      ...request,
      updatedAt: new Date()
    };
    
    this.cards.set(cardId, updatedCard);
    return updatedCard;
  }
  
  async moveCard(cardId: string, targetColumnId: string, position?: number): Promise<KanbanCard> {
    const card = this.cards.get(cardId);
    if (!card) {
      throw new Error(`Card ${cardId} not found`);
    }
    
    return this.updateCard(cardId, {
      columnId: targetColumnId,
      position: position || 0
    });
  }
  
  async getPhaseProgress(phase: string): Promise<PhaseProgressSummary> {
    // Phase 진행 상황 계산 로직
    return {
      phase,
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      blockedTasks: 0,
      deferredTasks: 0,
      progress: 0
    };
  }
  
  async getAllProgress(): Promise<PhaseProgressSummary[]> {
    // 전체 Phase 진행 상황 계산 로직
    return [];
  }
  
  async getCardsByColumn(columnId: string): Promise<KanbanCard[]> {
    return Array.from(this.cards.values()).filter(card => card.columnId === columnId);
  }
  
  async searchCards(query: string): Promise<KanbanCard[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.cards.values()).filter(card =>
      card.title.toLowerCase().includes(lowerQuery) ||
      card.description.toLowerCase().includes(lowerQuery)
    );
  }
}
