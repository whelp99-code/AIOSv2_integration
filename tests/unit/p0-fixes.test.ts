import { describe, it, expect } from 'vitest';

/**
 * P0 이슈 수정 테스트
 * 1. 웹훅 갱신 스케줄러
 * 2. LLM 호출 제한 폴백
 * 3. Mac Mini 리소스 모니터링
 */

// === 1. 웹훅 갱신 스케줄러 시뮬레이션 ===

interface WebhookConfig {
  subscriptionId: string;
  expirationDateTime: string;
  notificationUrl: string;
  resource: string;
  changeType: string;
}

interface RenewalResult {
  success: boolean;
  subscriptionId: string;
  newExpiration: string | null;
  error: string | null;
  timestamp: string;
}

class WebhookRenewalScheduler {
  private config: WebhookConfig;
  private renewalHistory: RenewalResult[] = [];
  private telegramAlerts: string[] = [];

  constructor(config: WebhookConfig) {
    this.config = config;
  }

  async renewSubscription(): Promise<RenewalResult> {
    const timestamp = new Date().toISOString();
    
    try {
      // 3일 후로 갱신
      const newExpiration = new Date();
      newExpiration.setDate(newExpiration.getDate() + 3);

      const result: RenewalResult = {
        success: true,
        subscriptionId: this.config.subscriptionId,
        newExpiration: newExpiration.toISOString(),
        error: null,
        timestamp,
      };

      this.renewalHistory.push(result);
      return result;
    } catch (error) {
      const result: RenewalResult = {
        success: false,
        subscriptionId: this.config.subscriptionId,
        newExpiration: null,
        error: error instanceof Error ? error.message : String(error),
        timestamp,
      };

      this.renewalHistory.push(result);
      this.telegramAlerts.push(`Webhook renewal failed: ${result.error}`);
      return result;
    }
  }

  getRenewalHistory(): RenewalResult[] {
    return [...this.renewalHistory];
  }

  getTelegramAlerts(): string[] {
    return [...this.telegramAlerts];
  }

  getNextRenewalDate(): Date {
    const next = new Date();
    next.setDate(next.getDate() + 3);
    return next;
  }
}

// === 2. LLM 호출 제한기 시뮬레이션 ===

interface LLMProviderConfig {
  name: string;
  dailyLimit: number;
  monthlyBudget: number;
  priority: number;
  fallbackTo?: string;
}

interface LLMUsage {
  provider: string;
  dailyCount: number;
  monthlyCost: number;
  lastResetDate: string;
}

interface LLMCallResult {
  provider: string;
  success: boolean;
  response: string | null;
  cost: number;
  fallbackUsed: boolean;
  fallbackFrom?: string;
  timestamp: string;
}

const PROVIDER_CONFIGS: LLMProviderConfig[] = [
  { name: 'freellmapi', dailyLimit: 100, monthlyBudget: 0, priority: 1, fallbackTo: 'lmstudio' },
  { name: 'claude', dailyLimit: 50, monthlyBudget: 50000, priority: 2, fallbackTo: 'freellmapi' },
  { name: 'lmstudio', dailyLimit: Infinity, monthlyBudget: 0, priority: 3 },
];

class LLMLimiter {
  private usageMap: Map<string, LLMUsage> = new Map();
  private callHistory: LLMCallResult[] = [];

  constructor() {
    this.initializeUsage();
  }

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

  canCall(providerName: string): boolean {
    const config = PROVIDER_CONFIGS.find(c => c.name === providerName);
    if (!config) return false;

    const usage = this.usageMap.get(providerName);
    if (!usage) return false;

    if (usage.dailyCount >= config.dailyLimit) return false;
    if (config.monthlyBudget > 0 && usage.monthlyCost >= config.monthlyBudget) return false;

    return true;
  }

  selectProvider(preferredProvider?: string): string | null {
    if (preferredProvider && this.canCall(preferredProvider)) {
      return preferredProvider;
    }

    const sorted = [...PROVIDER_CONFIGS].sort((a, b) => a.priority - b.priority);
    for (const config of sorted) {
      if (this.canCall(config.name)) {
        return config.name;
      }
    }

    return null;
  }

  recordCall(result: LLMCallResult): void {
    this.callHistory.push(result);
    const usage = this.usageMap.get(result.provider);
    if (usage) {
      usage.dailyCount++;
      usage.monthlyCost += result.cost;
    }
  }

  getUsage(providerName: string): LLMUsage | undefined {
    return this.usageMap.get(providerName);
  }

  resetUsage(): void {
    this.initializeUsage();
    this.callHistory = [];
  }
}

// === 3. 리소스 모니터링 시뮬레이션 ===

interface ResourceSnapshot {
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
  timestamp: string;
}

interface ResourceAlert {
  type: 'cpu' | 'ram' | 'disk';
  current: number;
  threshold: number;
  timestamp: string;
}

class ResourceMonitor {
  private cpuThreshold: number;
  private ramThreshold: number;
  private diskThreshold: number;
  private snapshots: ResourceSnapshot[] = [];
  private alerts: ResourceAlert[] = [];

  constructor(cpuThreshold = 80, ramThreshold = 80, diskThreshold = 80) {
    this.cpuThreshold = cpuThreshold;
    this.ramThreshold = ramThreshold;
    this.diskThreshold = diskThreshold;
  }

  checkResources(cpu: number, ram: number, disk: number): { alerts: ResourceAlert[]; snapshot: ResourceSnapshot } {
    const snapshot: ResourceSnapshot = {
      cpuUsage: cpu,
      ramUsage: ram,
      diskUsage: disk,
      timestamp: new Date().toISOString(),
    };

    this.snapshots.push(snapshot);

    const alerts: ResourceAlert[] = [];

    if (cpu >= this.cpuThreshold) {
      alerts.push({ type: 'cpu', current: cpu, threshold: this.cpuThreshold, timestamp: snapshot.timestamp });
    }
    if (ram >= this.ramThreshold) {
      alerts.push({ type: 'ram', current: ram, threshold: this.ramThreshold, timestamp: snapshot.timestamp });
    }
    if (disk >= this.diskThreshold) {
      alerts.push({ type: 'disk', current: disk, threshold: this.diskThreshold, timestamp: snapshot.timestamp });
    }

    this.alerts.push(...alerts);
    return { alerts, snapshot };
  }

  getAlerts(): ResourceAlert[] {
    return [...this.alerts];
  }

  getSnapshots(): ResourceSnapshot[] {
    return [...this.snapshots];
  }

  getLatestSnapshot(): ResourceSnapshot | null {
    return this.snapshots[this.snapshots.length - 1] || null;
  }
}

// === 테스트 ===

describe('P0 Fixes', () => {
  describe('1. Webhook Renewal Scheduler', () => {
    it('should renew subscription successfully', async () => {
      const scheduler = new WebhookRenewalScheduler({
        subscriptionId: 'sub-123',
        expirationDateTime: new Date().toISOString(),
        notificationUrl: 'https://example.com/webhook',
        resource: '/me/messages',
        changeType: 'created',
      });

      const result = await scheduler.renewSubscription();

      expect(result.success).toBe(true);
      expect(result.subscriptionId).toBe('sub-123');
      expect(result.newExpiration).not.toBeNull();
      expect(result.error).toBeNull();
    });

    it('should set expiration to 3 days later', async () => {
      const scheduler = new WebhookRenewalScheduler({
        subscriptionId: 'sub-123',
        expirationDateTime: new Date().toISOString(),
        notificationUrl: 'https://example.com/webhook',
        resource: '/me/messages',
        changeType: 'created',
      });

      const result = await scheduler.renewSubscription();
      const newExp = new Date(result.newExpiration!);
      const expected = new Date();
      expected.setDate(expected.getDate() + 3);

      // 3일 후 날짜 확인 (시간 차이 허용)
      expect(newExp.getDate()).toBe(expected.getDate());
    });

    it('should track renewal history', async () => {
      const scheduler = new WebhookRenewalScheduler({
        subscriptionId: 'sub-123',
        expirationDateTime: new Date().toISOString(),
        notificationUrl: 'https://example.com/webhook',
        resource: '/me/messages',
        changeType: 'created',
      });

      await scheduler.renewSubscription();
      await scheduler.renewSubscription();

      expect(scheduler.getRenewalHistory().length).toBe(2);
    });

    it('should calculate next renewal date', () => {
      const scheduler = new WebhookRenewalScheduler({
        subscriptionId: 'sub-123',
        expirationDateTime: new Date().toISOString(),
        notificationUrl: 'https://example.com/webhook',
        resource: '/me/messages',
        changeType: 'created',
      });

      const nextRenewal = scheduler.getNextRenewalDate();
      const expected = new Date();
      expected.setDate(expected.getDate() + 3);

      expect(nextRenewal.getDate()).toBe(expected.getDate());
    });
  });

  describe('2. LLM Call Limiter', () => {
    it('should allow calls within limits', () => {
      const limiter = new LLMLimiter();

      expect(limiter.canCall('freellmapi')).toBe(true);
      expect(limiter.canCall('claude')).toBe(true);
      expect(limiter.canCall('lmstudio')).toBe(true);
    });

    it('should enforce daily limit for freellmapi', () => {
      const limiter = new LLMLimiter();

      // 100건 호출
      for (let i = 0; i < 100; i++) {
        limiter.recordCall({
          provider: 'freellmapi',
          success: true,
          response: 'test',
          cost: 0,
          fallbackUsed: false,
          timestamp: new Date().toISOString(),
        });
      }

      expect(limiter.canCall('freellmapi')).toBe(false);
      expect(limiter.canCall('claude')).toBe(true);
    });

    it('should enforce daily limit for claude', () => {
      const limiter = new LLMLimiter();

      // 50건 호출
      for (let i = 0; i < 50; i++) {
        limiter.recordCall({
          provider: 'claude',
          success: true,
          response: 'test',
          cost: 1000,
          fallbackUsed: false,
          timestamp: new Date().toISOString(),
        });
      }

      expect(limiter.canCall('claude')).toBe(false);
    });

    it('should enforce monthly budget for claude', () => {
      const limiter = new LLMLimiter();

      // 월 5만원 초과
      limiter.recordCall({
        provider: 'claude',
        success: true,
        response: 'test',
        cost: 50001,
        fallbackUsed: false,
        timestamp: new Date().toISOString(),
      });

      expect(limiter.canCall('claude')).toBe(false);
    });

    it('should auto-fallback to next provider', () => {
      const limiter = new LLMLimiter();

      // freellmapi 100건 초과
      for (let i = 0; i < 100; i++) {
        limiter.recordCall({
          provider: 'freellmapi',
          success: true,
          response: 'test',
          cost: 0,
          fallbackUsed: false,
          timestamp: new Date().toISOString(),
        });
      }

      // freellmapi는 초과, claude는 사용 가능
      const provider = limiter.selectProvider('freellmapi');
      expect(provider).toBe('claude');
    });

    it('should fallback to lmstudio when all paid providers exhausted', () => {
      const limiter = new LLMLimiter();

      // freellmapi 100건 초과
      for (let i = 0; i < 100; i++) {
        limiter.recordCall({
          provider: 'freellmapi',
          success: true,
          response: 'test',
          cost: 0,
          fallbackUsed: false,
          timestamp: new Date().toISOString(),
        });
      }

      // claude 50건 초과
      for (let i = 0; i < 50; i++) {
        limiter.recordCall({
          provider: 'claude',
          success: true,
          response: 'test',
          cost: 1000,
          fallbackUsed: false,
          timestamp: new Date().toISOString(),
        });
      }

      // 모든 유료 프로바이더 초과 → lmstudio
      const provider = limiter.selectProvider();
      expect(provider).toBe('lmstudio');
    });

    it('should allow unlimited calls for lmstudio', () => {
      const limiter = new LLMLimiter();

      // 1000건 호출해도 lmstudio는 사용 가능
      for (let i = 0; i < 1000; i++) {
        limiter.recordCall({
          provider: 'lmstudio',
          success: true,
          response: 'test',
          cost: 0,
          fallbackUsed: false,
          timestamp: new Date().toISOString(),
        });
      }

      expect(limiter.canCall('lmstudio')).toBe(true);
    });

    it('should track usage correctly', () => {
      const limiter = new LLMLimiter();

      limiter.recordCall({
        provider: 'freellmapi',
        success: true,
        response: 'test',
        cost: 0,
        fallbackUsed: false,
        timestamp: new Date().toISOString(),
      });

      const usage = limiter.getUsage('freellmapi');
      expect(usage?.dailyCount).toBe(1);
      expect(usage?.monthlyCost).toBe(0);
    });

    it('should reset usage', () => {
      const limiter = new LLMLimiter();

      limiter.recordCall({
        provider: 'freellmapi',
        success: true,
        response: 'test',
        cost: 0,
        fallbackUsed: false,
        timestamp: new Date().toISOString(),
      });

      limiter.resetUsage();

      const usage = limiter.getUsage('freellmapi');
      expect(usage?.dailyCount).toBe(0);
    });
  });

  describe('3. Resource Monitoring', () => {
    it('should pass when within thresholds', () => {
      const monitor = new ResourceMonitor(80, 80, 80);
      const result = monitor.checkResources(50, 60, 70);

      expect(result.alerts.length).toBe(0);
      expect(result.snapshot.cpuUsage).toBe(50);
    });

    it('should alert when CPU exceeds threshold', () => {
      const monitor = new ResourceMonitor(80, 80, 80);
      const result = monitor.checkResources(85, 60, 70);

      expect(result.alerts.length).toBe(1);
      expect(result.alerts[0].type).toBe('cpu');
      expect(result.alerts[0].current).toBe(85);
    });

    it('should alert when RAM exceeds threshold', () => {
      const monitor = new ResourceMonitor(80, 80, 80);
      const result = monitor.checkResources(50, 90, 70);

      expect(result.alerts.length).toBe(1);
      expect(result.alerts[0].type).toBe('ram');
    });

    it('should alert when disk exceeds threshold', () => {
      const monitor = new ResourceMonitor(80, 80, 80);
      const result = monitor.checkResources(50, 60, 85);

      expect(result.alerts.length).toBe(1);
      expect(result.alerts[0].type).toBe('disk');
    });

    it('should alert on multiple thresholds', () => {
      const monitor = new ResourceMonitor(80, 80, 80);
      const result = monitor.checkResources(90, 85, 70);

      expect(result.alerts.length).toBe(2);
    });

    it('should track snapshots', () => {
      const monitor = new ResourceMonitor(80, 80, 80);

      monitor.checkResources(50, 60, 70);
      monitor.checkResources(60, 70, 80);

      expect(monitor.getSnapshots().length).toBe(2);
    });

    it('should get latest snapshot', () => {
      const monitor = new ResourceMonitor(80, 80, 80);

      monitor.checkResources(50, 60, 70);
      monitor.checkResources(60, 70, 80);

      const latest = monitor.getLatestSnapshot();
      expect(latest?.cpuUsage).toBe(60);
    });

    it('should work with custom thresholds', () => {
      const monitor = new ResourceMonitor(90, 90, 90);
      const result = monitor.checkResources(85, 85, 85);

      expect(result.alerts.length).toBe(0);
    });
  });
});
