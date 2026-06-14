import { describe, expect, it } from 'vitest';
import {
  AnalyzeRequestSchema,
  AnalyzeResponseSchema,
  PlanRequestSchema,
  PlanResponseSchema,
  RiskRequestSchema,
  RiskResponseSchema,
  CommandExecuteRequestSchema,
  CommandExecuteResponseSchema,
  CommandsListResponseSchema,
  PROJECT_SAFE_SELECT,
  USER_SAFE_SELECT,
  TASK_SAFE_SELECT,
  RESULT_SAFE_SELECT,
  CUSTOMER_SAFE_OMIT,
  PARTNER_SAFE_OMIT,
} from '@/lib/schemas/aios-v1.schema';

describe('계약 테스트: API 스키마 호환성', () => {
  describe('Analyze API 계약', () => {
    it('요청: projectId + type(full) 형태를 수용한다', () => {
      const input = { projectId: 'proj-001', type: 'full' as const };
      expect(AnalyzeRequestSchema.parse(input)).toMatchObject(input);
    });

    it('요청: idempotencyKey를 포함할 수 있다', () => {
      const input = { projectId: 'p1', idempotencyKey: 'req-001' };
      const parsed = AnalyzeRequestSchema.parse(input);
      expect(parsed.idempotencyKey).toBe('req-001');
    });

    it('응답: 최소 응답 구조를 보장한다', () => {
      const response = {
        projectId: 'p1',
        type: 'full',
        status: 'completed',
        timestamp: '2025-01-01T00:00:00Z',
        results: {},
      };
      const parsed = AnalyzeResponseSchema.parse(response);
      expect(parsed.projectId).toBeDefined();
      expect(parsed.status).toBeDefined();
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.results).toBeDefined();
    });

    it('응답: status는 completed|failed|in-progress만 허용한다', () => {
      for (const status of ['completed', 'failed', 'in-progress']) {
        expect(AnalyzeResponseSchema.safeParse({
          projectId: 'p1', type: 'full', status, timestamp: '', results: {},
        }).success).toBe(true);
      }
    });
  });

  describe('Plan API 계약', () => {
    it('요청: 최소 projectId만으로 동작한다', () => {
      const parsed = PlanRequestSchema.parse({ projectId: 'p1' });
      expect(parsed.projectId).toBe('p1');
      expect(parsed.requirements).toBeUndefined();
    });

    it('요청: requirements 배열을 포함할 수 있다', () => {
      const parsed = PlanRequestSchema.parse({
        projectId: 'p1',
        requirements: ['req1', 'req2'],
      });
      expect(parsed.requirements).toEqual(['req1', 'req2']);
    });

    it('응답: phases 배열을 포함한다', () => {
      const response = {
        projectId: 'p1',
        status: 'completed',
        timestamp: '2025-01-01T00:00:00Z',
        phases: [{ id: 1, name: 'Phase', duration: '1w', tasks: ['t1'] }],
      };
      const parsed = PlanResponseSchema.parse(response);
      expect(parsed.phases).toHaveLength(1);
      expect(parsed.phases[0].id).toBe(1);
    });
  });

  describe('Risk API 계약', () => {
    it('요청: 최소 projectId만으로 동작한다', () => {
      const parsed = RiskRequestSchema.parse({ projectId: 'p1' });
      expect(parsed.projectId).toBe('p1');
      expect(parsed.scope).toBe('full');
    });

    it('요청: scope를 지정할 수 있다', () => {
      const parsed = RiskRequestSchema.parse({ projectId: 'p1', scope: 'security' });
      expect(parsed.scope).toBe('security');
    });

    it('응답: risks 배열을 포함한다', () => {
      const response = {
        projectId: 'p1',
        scope: 'full',
        status: 'completed',
        timestamp: '2025-01-01T00:00:00Z',
        risks: [{
          id: 'r1', category: 'c', severity: 'low',
          probability: 'low', description: 'd', mitigation: 'm',
        }],
      };
      const parsed = RiskResponseSchema.parse(response);
      expect(parsed.risks).toHaveLength(1);
      expect(parsed.risks[0].id).toBe('r1');
    });
  });

  describe('Commands API 계약', () => {
    it('요청: command 필수, params 선택', () => {
      const parsed = CommandExecuteRequestSchema.parse({ command: 'analyze' });
      expect(parsed.command).toBe('analyze');
      expect(parsed.params).toBeUndefined();
    });

    it('요청: params를 포함할 수 있다', () => {
      const parsed = CommandExecuteRequestSchema.parse({
        command: 'analyze',
        params: { projectId: 'p1' },
      });
      expect(parsed.params).toEqual({ projectId: 'p1' });
    });

    it('응답: status + message 필수', () => {
      const parsed = CommandExecuteResponseSchema.parse({
        status: 'queued',
        message: '실행됨',
      });
      expect(parsed.status).toBe('queued');
      expect(parsed.message).toBe('실행됨');
    });

    it('목록 응답: commands 배열을 포함한다', () => {
      const parsed = CommandsListResponseSchema.parse({
        commands: [{ id: 'c1', name: 'C', description: 'd', endpoint: '/e' }],
      });
      expect(parsed.commands).toHaveLength(1);
    });
  });
});

describe('계약 테스트: Prisma select/omit 상수', () => {
  describe('PROJECT_SAFE_SELECT', () => {
    it('민감 필드(userId 등)를 포함하지 않는다', () => {
      const keys = Object.keys(PROJECT_SAFE_SELECT);
      expect(keys).not.toContain('userId');
    });

    it('필수 안전 필드를 포함한다', () => {
      const keys = Object.keys(PROJECT_SAFE_SELECT);
      expect(keys).toContain('id');
      expect(keys).toContain('name');
      expect(keys).toContain('status');
      expect(keys).toContain('createdAt');
    });
  });

  describe('USER_SAFE_SELECT', () => {
    it('민감 필드(password 등)를 포함하지 않는다', () => {
      const keys = Object.keys(USER_SAFE_SELECT);
      expect(keys).not.toContain('password');
      expect(keys).not.toContain('image');
    });

    it('필수 안전 필드를 포함한다', () => {
      const keys = Object.keys(USER_SAFE_SELECT);
      expect(keys).toContain('id');
      expect(keys).toContain('name');
      expect(keys).toContain('email');
      expect(keys).toContain('role');
    });
  });

  describe('TASK_SAFE_SELECT', () => {
    it('필수 필드를 포함한다', () => {
      const keys = Object.keys(TASK_SAFE_SELECT);
      expect(keys).toContain('id');
      expect(keys).toContain('projectId');
      expect(keys).toContain('title');
      expect(keys).toContain('status');
    });
  });

  describe('RESULT_SAFE_SELECT', () => {
    it('필수 필드를 포함한다', () => {
      const keys = Object.keys(RESULT_SAFE_SELECT);
      expect(keys).toContain('id');
      expect(keys).toContain('taskId');
      expect(keys).toContain('projectId');
      expect(keys).toContain('content');
    });
  });

  describe('CUSTOMER_SAFE_OMIT', () => {
    it('userId를 제외한다', () => {
      expect(CUSTOMER_SAFE_OMIT).toHaveProperty('userId');
    });
  });

  describe('PARTNER_SAFE_OMIT', () => {
    it('userId를 제외한다', () => {
      expect(PARTNER_SAFE_OMIT).toHaveProperty('userId');
    });
  });
});
