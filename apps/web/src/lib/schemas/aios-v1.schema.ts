import { z } from 'zod';

// ── 공통 ──────────────────────────────────────────────
export const ProjectIdSchema = z.object({
  projectId: z.string().min(1, 'projectId는 필수입니다').refine(v => v.trim().length > 0, '공백만 있는 projectId는 허용되지 않습니다'),
});

export const ProjectIdQuerySchema = z.object({
  projectId: z.string().uuid('projectId는 유효한 UUID 형식이어야 합니다'),
});

export const IdempotencyKeySchema = z.object({
  idempotencyKey: z.string().min(1).optional().refine(v => !v || v.trim().length > 0, '공백만 있는 idempotencyKey는 허용되지 않습니다')
});

// ── Analyze ───────────────────────────────────────────
export const AnalyzeRequestSchema = ProjectIdSchema.merge(IdempotencyKeySchema).extend({
  type: z.enum(['full', 'quick', 'security', 'performance']).default('full'),
});

export const AnalyzeResultItemSchema = z.object({
  category: z.string(),
  score: z.number().min(0).max(100),
  findings: z.array(z.string()),
  recommendation: z.string().optional(),
});

export const AnalyzeResponseSchema = z.object({
  projectId: z.string(),
  type: z.string(),
  status: z.enum(['completed', 'failed', 'in-progress']),
  timestamp: z.string(),
  results: z.object({
    items: z.array(AnalyzeResultItemSchema).optional(),
    summary: z.string().optional(),
    message: z.string().optional(),
    aiosV1Url: z.string().optional(),
  }),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;

// ── Plan ──────────────────────────────────────────────
export const PlanPhaseSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  duration: z.string().min(1),
  tasks: z.array(z.string().min(1)),
});

export const PlanRequestSchema = ProjectIdSchema.merge(IdempotencyKeySchema).extend({
  requirements: z.array(z.string().min(1).refine(v => v.trim().length > 0, '빈 문자열 requirement는 허용되지 않습니다')).optional(),
});

export const PlanResponseSchema = z.object({
  projectId: z.string(),
  status: z.enum(['completed', 'failed', 'in-progress']),
  timestamp: z.string(),
  phases: z.array(PlanPhaseSchema),
  message: z.string().optional(),
  aiosV1Url: z.string().optional(),
});

export type PlanRequest = z.infer<typeof PlanRequestSchema>;
export type PlanResponse = z.infer<typeof PlanResponseSchema>;

// ── Risk ──────────────────────────────────────────────
export const RiskItemSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  probability: z.enum(['low', 'medium', 'high']),
  description: z.string().min(1),
  mitigation: z.string().min(1),
});

export const RiskRequestSchema = ProjectIdSchema.merge(IdempotencyKeySchema).extend({
  scope: z.enum(['full', 'security', 'performance', 'compliance']).default('full'),
});

export const RiskResponseSchema = z.object({
  projectId: z.string(),
  scope: z.string(),
  status: z.enum(['completed', 'failed', 'in-progress']),
  timestamp: z.string(),
  risks: z.array(RiskItemSchema),
  message: z.string().optional(),
  aiosV1Url: z.string().optional(),
});

export type RiskRequest = z.infer<typeof RiskRequestSchema>;
export type RiskResponse = z.infer<typeof RiskResponseSchema>;

// ── Commands ──────────────────────────────────────────
export const CommandSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  endpoint: z.string().min(1),
});

export const CommandExecuteRequestSchema = z.object({
  command: z.string().min(1, 'command는 필수입니다').refine(v => v.trim().length > 0, '공백만 있는 command는 허용되지 않습니다'),
  params: z.record(z.string(), z.unknown()).optional(),
}).merge(IdempotencyKeySchema);

export const CommandExecuteResponseSchema = z.object({
  status: z.enum(['queued', 'completed', 'failed']),
  message: z.string(),
  command: z.string().optional(),
  result: z.unknown().optional(),
});

export const CommandsListResponseSchema = z.object({
  commands: z.array(CommandSchema),
});

export type CommandExecuteRequest = z.infer<typeof CommandExecuteRequestSchema>;
export type CommandExecuteResponse = z.infer<typeof CommandExecuteResponseSchema>;
export type CommandsListResponse = z.infer<typeof CommandsListResponseSchema>;

// ── Prisma select/omit 상수 ───────────────────────────
export const PROJECT_SAFE_SELECT = {
  id: true,
  name: true,
  description: true,
  status: true,
  priority: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const USER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} as const;

export const TASK_SAFE_SELECT = {
  id: true,
  projectId: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  assignee: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
} as const;

export const RESULT_SAFE_SELECT = {
  id: true,
  taskId: true,
  projectId: true,
  phase: true,
  type: true,
  status: true,
  content: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const CUSTOMER_SAFE_OMIT = {
  userId: true,
} as const;

export const PARTNER_SAFE_OMIT = {
  userId: true,
} as const;
