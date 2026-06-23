/**
 * Rollout Configuration — Hybrid Mail Classifier
 *
 * Defines the 5 operational modes and transition logic
 * controlled by HYBRID_CLASSIFIER_MODE environment variable.
 */

import { z } from 'zod';

// ── Schemas ────────────────────────────────────────────────────────────

export const ClassifierModeSchema = z.enum([
  'rules-only',
  'shadow',
  'canary',
  'hybrid',
  'kill-switch',
]);

export type ClassifierMode = z.infer<typeof ClassifierModeSchema>;

export const TransitionTriggersSchema = z.object({
  /** accuracy 이하로 떨어지면 rollback */
  accuracyBelow: z.number().min(0).max(1).default(0.95),
  /** high-risk false route 비율 초과 시 rollback */
  highRiskFalseRouteAbove: z.number().min(0).max(1).default(0.01),
  /** p95 latency(ms) 초과 시 경고/rollback */
  p95LatencyAboveMs: z.number().positive().default(2000),
  /** 월 예산 사용률 초과 시 provider 축소 */
  budgetPercentUsed: z.number().min(0).max(1).default(0.8),
  /** PII redaction 실패 시 즉시 rules-only */
  piiRedactionFailure: z.boolean().default(true),
  /** schema migration 오류 시 해당 Wave rollback */
  schemaMigrationError: z.boolean().default(true),
  /** approval bypass 발견 시 automation wave 중단 */
  approvalBypass: z.boolean().default(true),
});

export const RolloutConfigSchema = z.object({
  /** 현재 classifier 동작 모드 */
  mode: ClassifierModeSchema.default('rules-only'),
  /** canary mode에서 hybrid 라우팅할 트래픽 비율 (0~100) */
  canaryPercentage: z.number().min(0).max(100).default(10),
  /** shadow 로그 활성화 여부 */
  shadowLoggingEnabled: z.boolean().default(true),
  /** kill-switch 발동 여부 (true면 mode 무시하고 rules-only) */
  killSwitchTriggered: z.boolean().default(false),
  /** LLM 호출 최대 비율 (0~1) */
  maxLlmCallRatio: z.number().min(0).max(1).default(0.35),
  /** fallback 전환 대상 모드 */
  fallbackMode: ClassifierModeSchema.default('rules-only'),
  /** 자동 전환 트리거 조건 */
  transitionTriggers: TransitionTriggersSchema.default({}),
});

export type TransitionTriggers = z.infer<typeof TransitionTriggersSchema>;
export type RolloutConfig = z.infer<typeof RolloutConfigSchema>;

// ── Constants ──────────────────────────────────────────────────────────

/** Mode 순서 (높을수록 운영 수준이 높음) */
export const MODE_HIERARCHY: Record<ClassifierMode, number> = {
  'kill-switch': 0,
  'rules-only': 1,
  shadow: 2,
  canary: 3,
  hybrid: 4,
};

/** Mode별 LLM 호출 허용 여부 */
export const MODE_ALLOWS_LLM: Record<ClassifierMode, boolean> = {
  'rules-only': false,
  shadow: true,
  canary: true,
  hybrid: true,
  'kill-switch': false,
};

/** Mode별 라우팅 소스 */
export const MODE_ROUTING_SOURCE: Record<ClassifierMode, 'rule' | 'hybrid'> = {
  'rules-only': 'rule',
  shadow: 'rule',
  canary: 'hybrid',
  hybrid: 'hybrid',
  'kill-switch': 'rule',
};

// ── Config Loader ──────────────────────────────────────────────────────

/**
 * 환경변수에서 rollout config를 로드한다.
 * kill-switch가 발동된 경우 mode를 무시하고 rules-only를 반환한다.
 */
export function loadRolloutConfig(): RolloutConfig {
  const rawMode = process.env.HYBRID_CLASSIFIER_MODE ?? 'rules-only';
  const mode = ClassifierModeSchema.safeParse(rawMode).success
    ? (rawMode as ClassifierMode)
    : 'rules-only';

  const killSwitchTriggered = process.env.KILL_SWITCH === 'true' || mode === 'kill-switch';

  return RolloutConfigSchema.parse({
    mode: killSwitchTriggered ? 'rules-only' : mode,
    canaryPercentage: Number(process.env.CANARY_PERCENTAGE ?? 10),
    shadowLoggingEnabled: process.env.SHADOW_LOGGING_ENABLED !== 'false',
    killSwitchTriggered,
    maxLlmCallRatio: Number(process.env.MAX_LLM_CALL_RATIO ?? 0.35),
    fallbackMode: 'rules-only',
    transitionTriggers: {
      accuracyBelow: 0.95,
      highRiskFalseRouteAbove: 0.01,
      p95LatencyAboveMs: 2000,
      budgetPercentUsed: Number(process.env.LLM_BUDGET_PERCENT_THRESHOLD ?? 0.8),
      piiRedactionFailure: true,
      schemaMigrationError: true,
      approvalBypass: true,
    },
  });
}

// ── Decision Helpers ───────────────────────────────────────────────────

/**
 * 현재 config와 요청 인덱스 기준으로 hybrid를 사용할지 결정한다.
 *
 * - rules-only / kill-switch: 항상 false
 * - shadow: 항상 false (LLM은 호출하지만 라우팅에는 사용 안 함)
 * - canary: canaryPercentage에 따라 일부 true
 * - hybrid: 항상 true
 */
export function shouldUseHybrid(config: RolloutConfig, requestIndex: number): boolean {
  if (config.killSwitchTriggered) return false;
  switch (config.mode) {
    case 'rules-only':
    case 'kill-switch':
      return false;
    case 'shadow':
      return false; // shadow는 라우팅에 hybrid 사용 안 함
    case 'canary':
      return requestIndex % 100 < config.canaryPercentage;
    case 'hybrid':
      return true;
  }
}

/**
 * shadow 로그를 기록할지 결정한다.
 * shadow 또는 canary mode에서 활성화.
 */
export function shouldLogShadow(config: RolloutConfig): boolean {
  if (config.killSwitchTriggered) return false;
  return (
    config.shadowLoggingEnabled &&
    (config.mode === 'shadow' || config.mode === 'canary')
  );
}

/**
 * LLM 호출을 허용할지 결정한다.
 * shadow/canary/hybrid에서 허용.
 */
export function shouldCallLLM(config: RolloutConfig): boolean {
  if (config.killSwitchTriggered) return false;
  return MODE_ALLOWS_LLM[config.mode];
}

/**
 * 현재 config에서 effective mode를 반환한다.
 * kill-switch가 발동되면 무조건 rules-only.
 */
export function getEffectiveMode(config: RolloutConfig): ClassifierMode {
  if (config.killSwitchTriggered) return 'rules-only';
  return config.mode;
}

/**
 * 주어진 메트릭이 rollback 트리거 조건에 해당하는지 확인한다.
 * 트리거에 해당하면 rollback 대상 모드를 반환한다.
 */
export function checkRollbackTriggers(
  config: RolloutConfig,
  metrics: {
    accuracy?: number;
    highRiskFalseRouteRate?: number;
    p95LatencyMs?: number;
    budgetUsagePercent?: number;
    piiRedactionFailed?: boolean;
    schemaMigrationError?: boolean;
    approvalBypass?: boolean;
  },
): { shouldRollback: boolean; targetMode: ClassifierMode; reason?: string } {
  const triggers = config.transitionTriggers;

  if (metrics.piiRedactionFailed && triggers.piiRedactionFailure) {
    return { shouldRollback: true, targetMode: 'rules-only', reason: 'PII redaction failure' };
  }
  if (metrics.approvalBypass && triggers.approvalBypass) {
    return { shouldRollback: true, targetMode: 'rules-only', reason: 'Approval bypass detected' };
  }
  if (metrics.schemaMigrationError && triggers.schemaMigrationError) {
    return { shouldRollback: true, targetMode: 'rules-only', reason: 'Schema migration error' };
  }
  if (metrics.accuracy !== undefined && metrics.accuracy < triggers.accuracyBelow) {
    return { shouldRollback: true, targetMode: 'shadow', reason: `Accuracy ${metrics.accuracy} < ${triggers.accuracyBelow}` };
  }
  if (
    metrics.highRiskFalseRouteRate !== undefined &&
    metrics.highRiskFalseRouteRate > triggers.highRiskFalseRouteAbove
  ) {
    return {
      shouldRollback: true,
      targetMode: 'rules-only',
      reason: `High-risk false route ${metrics.highRiskFalseRouteRate} > ${triggers.highRiskFalseRouteAbove}`,
    };
  }
  if (metrics.p95LatencyMs !== undefined && metrics.p95LatencyMs > triggers.p95LatencyAboveMs) {
    return {
      shouldRollback: true,
      targetMode: 'canary',
      reason: `P95 latency ${metrics.p95LatencyMs}ms > ${triggers.p95LatencyAboveMs}ms`,
    };
  }
  if (metrics.budgetUsagePercent !== undefined && metrics.budgetUsagePercent > triggers.budgetPercentUsed) {
    return {
      shouldRollback: true,
      targetMode: 'canary',
      reason: `Budget usage ${metrics.budgetUsagePercent} > ${triggers.budgetPercentUsed}`,
    };
  }

  return { shouldRollback: false, targetMode: config.mode };
}

/**
 * config를 사람이 읽을 수 있는 요약 문자열로 변환한다.
 */
export function describeConfig(config: RolloutConfig): string {
  const effective = getEffectiveMode(config);
  const parts = [`mode=${effective}`];
  if (config.killSwitchTriggered) parts.push('KILL-SWITCH ACTIVE');
  if (effective === 'canary') parts.push(`canary=${config.canaryPercentage}%`);
  if (MODE_ALLOWS_LLM[effective]) parts.push(`max-llm-ratio=${config.maxLlmCallRatio}`);
  parts.push(`shadow-log=${config.shadowLoggingEnabled}`);
  return parts.join(', ');
}
