/**
 * DataPlane Hooks - Routing Hook Pattern
 * 
 * 페르소나 라우팅을 data-plane 파이프라인과 분리하기 위한 훅 패턴.
 * onGoldComplete 훅에서 페르소나 라우팅이 실행된다.
 */

export interface DataPlaneHooks {
  /** Gold 레이어 처리 완료 후 호출되는 훅 */
  onGoldComplete?: (item: GoldCompleteItem) => Promise<void>;
}

export interface GoldCompleteItem {
  entity: string;
  record: Record<string, unknown>;
  layer: 'gold';
  timestamp: string;
}

/**
 * 훅 레지스트리 - 전역 훅 관리
 */
class HookRegistry {
  private hooks: DataPlaneHooks = {};

  register(hooks: DataPlaneHooks): void {
    this.hooks = { ...this.hooks, ...hooks };
  }

  async executeOnGoldComplete(item: GoldCompleteItem): Promise<void> {
    if (this.hooks.onGoldComplete) {
      await this.hooks.onGoldComplete(item);
    }
  }

  getRegisteredHooks(): DataPlaneHooks {
    return { ...this.hooks };
  }
}

// 싱글톤 인스턴스
export const hookRegistry = new HookRegistry();
