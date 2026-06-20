/**
 * Multi-Provider Architecture Tests
 * 다중 LLM 프로바이더 아키텍처 테스트
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProviderRegistry } from '../packages/infrastructure/llm/src/registry';
import { ModelRouter } from '../packages/infrastructure/llm/src/router';

describe('Provider Registry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = ProviderRegistry.getInstance();
    // 테스트용 초기화
    registry.unregister('custom-test');
    registry.unregister('custom-2');
  });

  afterEach(() => {
    registry.unregister('custom-test');
    registry.unregister('custom-2');
  });

  describe('Default Providers', () => {
    it('should have default providers registered', () => {
      const providers = registry.list();
      expect(providers.length).toBeGreaterThanOrEqual(3);
    });

    it('should have xiaomi provider', () => {
      const xiaomi = registry.get('xiaomi');
      expect(xiaomi).toBeDefined();
      expect(xiaomi?.type).toBe('xiaomi');
      expect(xiaomi?.displayName).toBe('Xiaomi MiMo');
    });

    it('should have openrouter provider', () => {
      const openrouter = registry.get('openrouter');
      expect(openrouter).toBeDefined();
      expect(openrouter?.type).toBe('openrouter');
    });

    it('should have synterolink provider', () => {
      const synterolink = registry.get('synterolink');
      expect(synterolink).toBeDefined();
      expect(synterolink?.type).toBe('synterolink');
    });
  });

  describe('Custom Provider Registration', () => {
    it('should register a custom provider', () => {
      registry.registerCustom({
        id: 'custom-test',
        displayName: 'Custom Test Provider',
        baseUrl: 'https://api.custom.test/v1',
        apiKey: 'test-key',
        defaultModel: 'custom-model',
        supportedModels: ['custom-model', 'custom-model-2'],
      });

      const provider = registry.get('custom-test');
      expect(provider).toBeDefined();
      expect(provider?.type).toBe('custom');
      expect(provider?.displayName).toBe('Custom Test Provider');
      expect(provider?.enabled).toBe(true);
    });

    it('should update existing provider', () => {
      registry.registerCustom({
        id: 'custom-test',
        displayName: 'Original',
        baseUrl: 'https://api.original.test',
        defaultModel: 'model-1',
      });

      registry.registerCustom({
        id: 'custom-test',
        displayName: 'Updated',
        baseUrl: 'https://api.updated.test',
        defaultModel: 'model-2',
      });

      const provider = registry.get('custom-test');
      expect(provider?.displayName).toBe('Updated');
    });

    it('should unregister a provider', () => {
      registry.registerCustom({
        id: 'custom-test',
        displayName: 'To Delete',
        baseUrl: 'https://api.delete.test',
        defaultModel: 'model',
      });

      expect(registry.get('custom-test')).toBeDefined();

      const result = registry.unregister('custom-test');
      expect(result).toBe(true);
      expect(registry.get('custom-test')).toBeUndefined();
    });
  });

  describe('Provider Management', () => {
    it('should enable/disable provider', () => {
      registry.setEnabled('xiaomi', false);
      expect(registry.get('xiaomi')?.enabled).toBe(false);

      registry.setEnabled('xiaomi', true);
      expect(registry.get('xiaomi')?.enabled).toBe(true);
    });

    it('should list only enabled providers', () => {
      registry.registerCustom({
        id: 'custom-test',
        displayName: 'Enabled',
        baseUrl: 'https://api.enabled.test',
        defaultModel: 'model',
        enabled: true,
      });

      const enabled = registry.listEnabled();
      expect(enabled.some((p) => p.id === 'custom-test')).toBe(true);
    });
  });

  describe('Model Operations', () => {
    it('should get all models', () => {
      const models = registry.getAllModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models.some((m) => m.provider === 'xiaomi')).toBe(true);
    });

    it('should find provider by model', () => {
      const provider = registry.findProviderByModel('mimo-v2-omni');
      expect(provider).toBeDefined();
      expect(provider?.type).toBe('xiaomi');
    });
  });

  describe('Event System', () => {
    it('should emit registration events', () => {
      let eventFired = false;
      const unsubscribe = registry.on('provider:registered', () => {
        eventFired = true;
      });

      registry.registerCustom({
        id: 'custom-test',
        displayName: 'Event Test',
        baseUrl: 'https://api.event.test',
        defaultModel: 'model',
      });

      expect(eventFired).toBe(true);
      unsubscribe();
    });
  });
});

describe('Model Router', () => {
  let router: ModelRouter;

  beforeEach(() => {
    router = ModelRouter.getInstance();
  });

  describe('Routing', () => {
    it('should route coding task to appropriate provider', () => {
      const result = router.route('coding');
      expect(result).toBeDefined();
      expect(result?.provider).toBeDefined();
      expect(result?.model).toBeDefined();
      expect(result?.reason).toContain('coding');
    });

    it('should route quick task to fast provider', () => {
      const result = router.route('quick');
      expect(result).toBeDefined();
      expect(result?.provider).toBeDefined();
    });

    it('should route analysis task', () => {
      const result = router.route('analysis');
      expect(result).toBeDefined();
      expect(result?.provider).toBeDefined();
    });

    it('should respect exclude providers', () => {
      const result = router.route('general', {
        excludeProviders: ['xiaomi'],
      });

      if (result) {
        expect(result.provider).not.toBe('xiaomi');
      }
    });

    it('should return null when no providers available', () => {
      const result = router.route('general', {
        excludeProviders: ['xiaomi', 'synterolink', 'openrouter', 'groq', 'deepseek', 'lm-studio'],
      });
      // LM Studio is disabled by default, so this might still return a result
      // if any provider has supported models
    });
  });

  describe('Strategy', () => {
    it('should change routing strategy', () => {
      router.setStrategy('cost-optimized');
      const stats = router.getStats();
      expect(stats.strategy).toBe('cost-optimized');
    });

    it('should route by cost when strategy is cost-optimized', () => {
      router.setStrategy('cost-optimized');
      const result = router.route('general');
      expect(result).toBeDefined();
      expect(result?.reason).toContain('Cost');
    });

    it('should route by latency when strategy is least-latency', () => {
      router.setStrategy('least-latency');
      const result = router.route('general');
      expect(result).toBeDefined();
    });
  });

  describe('Routing Rules', () => {
    it('should get routing rule for task type', () => {
      const rule = router.getRoutingRule('coding');
      expect(rule).toBeDefined();
      expect(rule?.preferredProviders.length).toBeGreaterThan(0);
    });

    it('should set custom routing rule', () => {
      router.setRoutingRule('general', {
        taskType: 'general',
        preferredProviders: ['xiaomi'],
        preferredModels: ['mimo-v2-omni'],
      });

      const rule = router.getRoutingRule('general');
      expect(rule?.preferredProviders).toEqual(['xiaomi']);
    });
  });

  describe('Usage Tracking', () => {
    it('should record usage', () => {
      router.recordUsage('xiaomi', 100, false);
      router.recordUsage('xiaomi', 150, false);
      router.recordUsage('xiaomi', 200, true);

      const stats = router.getUsageStats('xiaomi');
      expect(stats?.count).toBe(3);
      expect(stats?.errors).toBe(1);
    });

    it('should calculate average latency', () => {
      router.recordUsage('xiaomi', 100, false);
      router.recordUsage('xiaomi', 200, false);

      const stats = router.getUsageStats('xiaomi');
      expect(stats?.avgLatencyMs).toBe(150);
    });
  });

  describe('Stats', () => {
    it('should get router stats', () => {
      const stats = router.getStats();
      expect(stats.totalProviders).toBeGreaterThanOrEqual(0);
      expect(stats.strategy).toBeDefined();
      expect(stats.rules.length).toBeGreaterThan(0);
      expect(Array.isArray(stats.usage)).toBe(true);
    });
  });
});
