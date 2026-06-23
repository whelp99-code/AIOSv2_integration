/**
 * LLM 호출 제한기 + 폴백 로직
 * 
 * FreeLLMAPI: 100건/일, 무료
 * Claude (SynteroLink): 50건/일, 월 5만원
 * LM Studio: 무제한, 무료 (로컬)
 * 
 * 초과 시 자동 폴백: FreeLLMAPI → LM Studio
 */

import Redis from 'ioredis';

// LLM 프로바이더 설정
export interface LLMProviderConfig {
  name: string;
  dailyLimit: number;
  monthlyBudget: number; // 원 단위, 0이면 무료
  priority: number; // 낮을수록 우선
  fallbackTo?: string; // 폴백 대상 프로바이더
}

// 사용량 추적
export interface LLMUsage {
  provider: string;
  dailyCount: number;
  monthlyCost: number;
  lastResetDate: string;
}

// LLM 호출 결과
export interface LLMCallResult {
  provider: string;
  success: boolean;
  response: string | null;
  cost: number;
  fallbackUsed: boolean;
  fallbackFrom?: string;
  timestamp: string;
}

// 프로바이더 설정
const PROVIDER_CONFIGS: LLMProviderConfig[] = [
  {
    name: 'freellmapi',
    dailyLimit: 100,
    monthlyBudget: 0,
    priority: 1,
    fallbackTo: 'lmstudio',
  },
  {
    name: 'claude',
    dailyLimit: 50,
    monthlyBudget: 50000,
    priority: 2,
    fallbackTo: 'freellmapi',
  },
  {
    name: 'lmstudio',
    dailyLimit: Infinity,
    monthlyBudget: 0,
    priority: 3,
  },
];

/**
 * LLM 호출 제한기
 */
export class LLMLimiter {
  private redis: Redis | null;
  private usageMap: Map<string, LLMUsage> = new Map();
  private callHistory: LLMCallResult[] = [];

  constructor(redisUrl?: string) {
    if (redisUrl) {
      this.redis = new Redis(redisUrl);
    } else {
      this.redis = null;
      // 메모리 기반 사용량 추적
      this.initializeUsage();
    }
  }

  /**
   * 초기 사용량 설정
   */
  private initializeUsage(): void {
    for (const config of PROVIDER_CONFIGS) {
      this.usageMap.set(config.name, {
        provider: config.name,
        dailyCount: 0,
        monthlyCost: 0,
        lastResetDate: new Date().toISOString().split('T')[0],
      });
    }
  }

  /**
   * LLM 호출 가능 여부 확인
   */
  canCall(providerName: string): boolean {
    const config = PROVIDER_CONFIGS.find(c => c.name === providerName);
    if (!config) return false;

    const usage = this.getUsage(providerName);
    if (!usage) return false;

    // 일일 제한 확인
    if (usage.dailyCount >= config.dailyLimit) {
      return false;
    }

    // 월 예산 확인 (무료가 아닌 경우)
    if (config.monthlyBudget > 0 && usage.monthlyCost >= config.monthlyBudget) {
      return false;
    }

    return true;
  }

  /**
   * 사용 가능한 프로바이더 선택 (자동 폴백)
   */
  selectProvider(preferredProvider?: string): string | null {
    // 선호 프로바이더가 있으면 먼저 시도
    if (preferredProvider && this.canCall(preferredProvider)) {
      return preferredProvider;
    }

    // 우선순위 순으로 사용 가능한 프로바이더 검색
    const sorted = [...PROVIDER_CONFIGS].sort((a, b) => a.priority - b.priority);
    
    for (const config of sorted) {
      if (this.canCall(config.name)) {
        return config.name;
      }
    }

    return null;
  }

  /**
   * LLM 호출 기록
   */
  recordCall(result: LLMCallResult): void {
    this.callHistory.push(result);

    const usage = this.getUsage(result.provider);
    if (usage) {
      usage.dailyCount++;
      usage.monthlyCost += result.cost;
    }

    // 폴백 사용된 경우, 원래 프로바이더도 기록
    if (result.fallbackUsed && result.fallbackFrom) {
      const fallbackUsage = this.getUsage(result.fallbackFrom);
      if (fallbackUsage) {
        fallbackUsage.dailyCount++;
      }
    }
  }

  /**
   * 사용량 조회
   */
  getUsage(providerName: string): LLMUsage | null {
    // 날짜 변경 시 일일 카운트 리셋
    const usage = this.usageMap.get(providerName);
    if (usage) {
      const today = new Date().toISOString().split('T')[0];
      if (usage.lastResetDate !== today) {
        usage.dailyCount = 0;
        usage.lastResetDate = today;
      }
    }
    return usage || null;
  }

  /**
   * 전체 사용량 조회
   */
  getAllUsage(): LLMUsage[] {
    return Array.from(this.usageMap.values());
  }

  /**
   * 호출 이력 조회
   */
  getCallHistory(): LLMCallResult[] {
    return [...this.callHistory];
  }

  /**
   * 프로바이더 설정 조회
   */
  getProviderConfigs(): LLMProviderConfig[] {
    return [...PROVIDER_CONFIGS];
  }

  /**
   * 월 예산 초과 여부 확인
   */
  isMonthlyBudgetExceeded(): boolean {
    for (const config of PROVIDER_CONFIGS) {
      if (config.monthlyBudget > 0) {
        const usage = this.getUsage(config.name);
        if (usage && usage.monthlyCost >= config.monthlyBudget) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 사용량 리셋 (테스트용)
   */
  resetUsage(): void {
    this.initializeUsage();
    this.callHistory = [];
  }

  /**
   * 연결 종료
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

/**
 * LLM 호출 래퍼 (자동 폴백 포함)
 */
export async function callLLMWithFallback(
  limiter: LLMLimiter,
  prompt: string,
  preferredProvider?: string,
): Promise<LLMCallResult> {
  const provider = limiter.selectProvider(preferredProvider);

  if (!provider) {
    return {
      provider: 'none',
      success: false,
      response: null,
      cost: 0,
      fallbackUsed: false,
      timestamp: new Date().toISOString(),
    };
  }

  // 실제 LLM 호출 시뮬레이션
  const result: LLMCallResult = {
    provider,
    success: true,
    response: `[${provider}] Response to: ${prompt.substring(0, 50)}...`,
    cost: provider === 'claude' ? 100 : 0,
    fallbackUsed: provider !== (preferredProvider || 'freellmapi'),
    fallbackFrom: provider !== (preferredProvider || 'freellmapi') ? preferredProvider : undefined,
    timestamp: new Date().toISOString(),
  };

  limiter.recordCall(result);
  return result;
}
