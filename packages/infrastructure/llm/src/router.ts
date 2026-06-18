/**
 * Model Router
 * 작업별 최적 모델을 선택하는 라우터
 */

import type {
  LLMProvider,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  TaskType,
  RoutingStrategy,
  RoutingRule,
  RoutingResult,
} from './types';
import { providerRegistry } from './registry';

/**
 * 기본 라우팅 규칙
 */
const DEFAULT_ROUTING_RULES: RoutingRule[] = [
  {
    taskType: 'coding',
    preferredProviders: ['synterolink', 'openrouter', 'xiaomi'],
    preferredModels: ['claude-sonnet-4-6', 'claude-opus-4-7', 'deepseek-coder'],
  },
  {
    taskType: 'analysis',
    preferredProviders: ['openrouter', 'xiaomi', 'synterolink'],
    preferredModels: ['mimo-v2.5-pro', 'gpt-4o', 'claude-sonnet-4-6'],
  },
  {
    taskType: 'creative',
    preferredProviders: ['openrouter', 'synterolink'],
    preferredModels: ['claude-opus-4-7', 'gpt-4o', 'mimo-v2-omni'],
  },
  {
    taskType: 'quick',
    preferredProviders: ['xiaomi', 'groq', 'lm-studio'],
    preferredModels: ['mimo-v2-flash', 'llama-3.3-70b-versatile'],
    maxLatencyMs: 2000,
  },
  {
    taskType: 'deep-reasoning',
    preferredProviders: ['synterolink', 'openrouter'],
    preferredModels: ['claude-opus-4-7', 'o3', 'mimo-v2.5-pro'],
  },
  {
    taskType: 'general',
    preferredProviders: ['xiaomi', 'openrouter', 'synterolink'],
    preferredModels: ['mimo-v2-omni', 'gpt-4o-mini'],
  },
];

/**
 * Model Router
 * 
 * 기능:
 * 1. 작업 타입별 최적 모델 자동 선택
 * 2. 프로바이더 장애 시 자동 페일오버
 * 3. 라우팅 전략 지원 (비용 최적화, 품질 우선 등)
 * 4. 사용량 기반 학습
 */
export class ModelRouter {
  private static instance: ModelRouter | null = null;
  private routingRules: Map<TaskType, RoutingRule> = new Map();
  private strategy: RoutingStrategy = 'task-matched';
  private usageStats: Map<string, { count: number; totalLatencyMs: number; errors: number }> = new Map();

  private constructor() {
    // 기본 라우팅 규칙 등록
    for (const rule of DEFAULT_ROUTING_RULES) {
      this.routingRules.set(rule.taskType, rule);
    }
  }

  static getInstance(): ModelRouter {
    if (!ModelRouter.instance) {
      ModelRouter.instance = new ModelRouter();
    }
    return ModelRouter.instance;
  }

  // ========================================================================
  // Routing
  // ========================================================================

  /**
   * 최적 모델 선택
   */
  route(taskType: TaskType, options?: {
    strategy?: RoutingStrategy;
    excludeProviders?: LLMProvider[];
    maxCost?: number;
  }): RoutingResult | null {
    const strategy = options?.strategy ?? this.strategy;
    const rule = this.routingRules.get(taskType) ?? this.routingRules.get('general')!;

    // 사용 가능한 프로바이더 필터링
    let candidates = providerRegistry.listEnabled().filter((p) => {
      // 제외된 프로바이더 필터링
      if (options?.excludeProviders?.includes(p.type)) return false;

      // 지원 모델이 있어야 함
      if (p.supportedModels.length === 0) return false;

      // 비용 제한
      if (options?.maxCost && p.pricing) {
        if (p.pricing.input > options?.maxCost) return false;
      }

      return true;
    });

    if (candidates.length === 0) {
      return null;
    }

    // 전략에 따른 라우팅
    switch (strategy) {
      case 'task-matched':
        return this.routeByTask(candidates, rule);
      case 'least-latency':
        return this.routeByLatency(candidates);
      case 'cost-optimized':
        return this.routeByCost(candidates);
      case 'quality-first':
        return this.routeByQuality(candidates, rule);
      case 'round-robin':
        return this.routeRoundRobin(candidates);
      default:
        return this.routeByTask(candidates, rule);
    }
  }

  /**
   * 작업 타입 기반 라우팅
   */
  private routeByTask(
    candidates: Array<{ id: string; type: LLMProvider; supportedModels: string[] }>,
    rule: RoutingRule
  ): RoutingResult | null {
    // 선호 프로바이더 순서대로 시도
    for (const providerType of rule.preferredProviders) {
      const provider = candidates.find((p) => p.type === providerType);
      if (provider) {
        // 선호 모델이 있으면 선택
        const model = rule.preferredModels?.find((m) =>
          provider.supportedModels.some((pm) => pm.includes(m))
        ) ?? provider.supportedModels[0];

        return {
          provider: provider.type,
          providerId: provider.id,
          model,
          reason: `Task-matched: ${rule.taskType} → ${providerType}/${model}`,
        };
      }
    }

    // 선호 프로바이더가 없으면 첫 번째 사용 가능한 프로바이더
    const fallback = candidates[0];
    const model = rule.preferredModels?.[0] ?? fallback.supportedModels[0];

    return {
      provider: fallback.type,
      providerId: fallback.id,
      model,
      reason: `Fallback: ${fallback.type}/${model}`,
    };
  }

  /**
   * 지연시간 기반 라우팅
   */
  private routeByLatency(
    candidates: Array<{ id: string; type: LLMProvider; supportedModels: string[] }>
  ): RoutingResult | null {
    let bestProvider: { id: string; type: LLMProvider } | null = null;
    let bestLatency = Infinity;

    for (const provider of candidates) {
      const health = providerRegistry.getHealthStatus(provider.id);
      const latency = health?.latencyMs ?? Infinity;

      if (latency < bestLatency) {
        bestLatency = latency;
        bestProvider = provider;
      }
    }

    if (!bestProvider) return null;

    const config = providerRegistry.get(bestProvider.id);
    return {
      provider: bestProvider.type,
      providerId: bestProvider.id,
      model: config?.defaultModel ?? 'unknown',
      reason: `Least latency: ${bestProvider.type} (${bestLatency}ms)`,
    };
  }

  /**
   * 비용 기반 라우팅
   */
  private routeByCost(
    candidates: Array<{ id: string; type: LLMProvider; supportedModels: string[] }>
  ): RoutingResult | null {
    let bestProvider: { id: string; type: LLMProvider } | null = null;
    let bestCost = Infinity;

    for (const provider of candidates) {
      const config = providerRegistry.get(provider.id);
      const cost = config?.pricing?.input ?? 0;

      if (cost < bestCost) {
        bestCost = cost;
        bestProvider = provider;
      }
    }

    if (!bestProvider) return null;

    const config = providerRegistry.get(bestProvider.id);
    return {
      provider: bestProvider.type,
      providerId: bestProvider.id,
      model: config?.defaultModel ?? 'unknown',
      reason: `Cost-optimized: ${bestProvider.type} ($${bestCost}/1M tokens)`,
    };
  }

  /**
   * 품질 기반 라우팅
   */
  private routeByQuality(
    candidates: Array<{ id: string; type: LLMProvider; supportedModels: string[] }>,
    rule: RoutingRule
  ): RoutingResult | null {
    // 품질 우선: 선호 프로바이더의 첫 번째 모델 선택
    for (const providerType of rule.preferredProviders) {
      const provider = candidates.find((p) => p.type === providerType);
      if (provider) {
        const config = providerRegistry.get(provider.id);
        return {
          provider: provider.type,
          providerId: provider.id,
          model: config?.defaultModel ?? 'unknown',
          reason: `Quality-first: ${providerType}`,
        };
      }
    }

    return this.routeByTask(candidates, rule);
  }

  /**
   * 순환 라우팅
   */
  private routeRoundRobin(
    candidates: Array<{ id: string; type: LLMProvider; supportedModels: string[] }>
  ): RoutingResult | null {
    if (candidates.length === 0) return null;

    // 사용 횟수 기반 순환
    let minUsage = Infinity;
    let selectedProvider = candidates[0];

    for (const provider of candidates) {
      const stats = this.usageStats.get(provider.id);
      const usage = stats?.count ?? 0;

      if (usage < minUsage) {
        minUsage = usage;
        selectedProvider = provider;
      }
    }

    const config = providerRegistry.get(selectedProvider.id);
    return {
      provider: selectedProvider.type,
      providerId: selectedProvider.id,
      model: config?.defaultModel ?? 'unknown',
      reason: `Round-robin: ${selectedProvider.type} (used ${minUsage} times)`,
    };
  }

  // ========================================================================
  // Routing Rules
  // ========================================================================

  /**
   * 라우팅 규칙 추가/수정
   */
  setRoutingRule(taskType: TaskType, rule: RoutingRule): void {
    this.routingRules.set(taskType, rule);
  }

  /**
   * 라우팅 규칙 조회
   */
  getRoutingRule(taskType: TaskType): RoutingRule | undefined {
    return this.routingRules.get(taskType);
  }

  /**
   * 라우팅 전략 설정
   */
  setStrategy(strategy: RoutingStrategy): void {
    this.strategy = strategy;
  }

  // ========================================================================
  // Usage Tracking
  // ========================================================================

  /**
   * 사용 기록
   */
  recordUsage(providerId: string, latencyMs: number, isError: boolean = false): void {
    const stats = this.usageStats.get(providerId) ?? { count: 0, totalLatencyMs: 0, errors: 0 };
    stats.count++;
    stats.totalLatencyMs += latencyMs;
    if (isError) stats.errors++;
    this.usageStats.set(providerId, stats);
  }

  /**
   * 사용 통계 조회
   */
  getUsageStats(providerId: string) {
    const stats = this.usageStats.get(providerId);
    if (!stats) return undefined;

    return {
      ...stats,
      avgLatencyMs: stats.count > 0 ? Math.round(stats.totalLatencyMs / stats.count) : 0,
      errorRate: stats.count > 0 ? stats.errors / stats.count : 0,
    };
  }

  /**
   * 모든 사용 통계
   */
  getAllUsageStats() {
    return Array.from(this.usageStats.entries()).map(([providerId, stats]) => ({
      providerId,
      ...stats,
      avgLatencyMs: stats.count > 0 ? Math.round(stats.totalLatencyMs / stats.count) : 0,
      errorRate: stats.count > 0 ? stats.errors / stats.count : 0,
    }));
  }

  // ========================================================================
  // Utility
  // ========================================================================

  /**
   * 라우팅 통계
   */
  getStats() {
    return {
      totalProviders: providerRegistry.listEnabled().length,
      strategy: this.strategy,
      rules: Array.from(this.routingRules.entries()).map(([taskType, rule]) => ({
        taskType,
        providers: rule.preferredProviders,
      })),
      usage: this.getAllUsageStats(),
    };
  }
}

// 싱글톤 인스턴스
export const modelRouter = ModelRouter.getInstance();
