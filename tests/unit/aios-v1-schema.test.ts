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
  ProjectIdSchema,
  IdempotencyKeySchema,
  PlanPhaseSchema,
  RiskItemSchema,
  CommandSchema,
  AnalyzeResultItemSchema,
} from '@/lib/schemas/aios-v1.schema';

describe('ProjectIdSchema', () => {
  it('유효한 projectId를 통과시킨다', () => {
    const result = ProjectIdSchema.safeParse({ projectId: 'proj-1' });
    expect(result.success).toBe(true);
  });

  it('빈 projectId를 거부한다', () => {
    const result = ProjectIdSchema.safeParse({ projectId: '' });
    expect(result.success).toBe(false);
  });

  it('projectId 누락을 거부한다', () => {
    const result = ProjectIdSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('숫자 projectId도 허용한다', () => {
    const result = ProjectIdSchema.safeParse({ projectId: '123' });
    expect(result.success).toBe(true);
  });
});

describe('IdempotencyKeySchema', () => {
  it('유효한 키를 통과시킨다', () => {
    const result = IdempotencyKeySchema.safeParse({ idempotencyKey: 'key-123' });
    expect(result.success).toBe(true);
  });

  it('없어도 통과시킨다 (optional)', () => {
    const result = IdempotencyKeySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('빈 문자열을 거부한다', () => {
    const result = IdempotencyKeySchema.safeParse({ idempotencyKey: '' });
    expect(result.success).toBe(false);
  });
});

describe('AnalyzeRequestSchema', () => {
  it('최소 필수 필드로 통과시킨다', () => {
    const result = AnalyzeRequestSchema.safeParse({ projectId: 'p1' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.type).toBe('full');
  });

  it('type이 기본값 full로 설정된다', () => {
    const result = AnalyzeRequestSchema.parse({ projectId: 'p1' });
    expect(result.type).toBe('full');
  });

  it('유효한 type enum을 허용한다', () => {
    for (const t of ['full', 'quick', 'security', 'performance']) {
      const result = AnalyzeRequestSchema.safeParse({ projectId: 'p1', type: t });
      expect(result.success).toBe(true);
    }
  });

  it('유효하지 않은 type을 거부한다', () => {
    const result = AnalyzeRequestSchema.safeParse({ projectId: 'p1', type: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('idempotencyKey를 포함할 수 있다', () => {
    const result = AnalyzeRequestSchema.safeParse({
      projectId: 'p1',
      idempotencyKey: 'key-1',
    });
    expect(result.success).toBe(true);
  });

  it('빈 projectId를 거부한다', () => {
    const result = AnalyzeRequestSchema.safeParse({ projectId: '' });
    expect(result.success).toBe(false);
  });

  it('projectId 없이 거부한다', () => {
    const result = AnalyzeRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('AnalyzeResponseSchema', () => {
  it('유효한 응답을 검증한다', () => {
    const response = {
      projectId: 'p1',
      type: 'full',
      status: 'completed',
      timestamp: new Date().toISOString(),
      results: { summary: '분석 완료' },
    };
    const result = AnalyzeResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('status enum 외 값을 거부한다', () => {
    const response = {
      projectId: 'p1',
      type: 'full',
      status: 'unknown',
      timestamp: new Date().toISOString(),
      results: {},
    };
    const result = AnalyzeResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });

  it('message와 aiosV1Url을 포함할 수 있다', () => {
    const response = {
      projectId: 'p1',
      type: 'full',
      status: 'completed',
      timestamp: new Date().toISOString(),
      results: { message: 'msg', aiosV1Url: 'http://localhost:3200' },
    };
    expect(AnalyzeResponseSchema.safeParse(response).success).toBe(true);
  });
});

describe('PlanRequestSchema', () => {
  it('최소 필수 필드로 통과시킨다', () => {
    const result = PlanRequestSchema.safeParse({ projectId: 'p1' });
    expect(result.success).toBe(true);
  });

  it('requirements 배열을 허용한다', () => {
    const result = PlanRequestSchema.safeParse({
      projectId: 'p1',
      requirements: ['req1', 'req2'],
    });
    expect(result.success).toBe(true);
  });

  it('빈 requirements 배열을 허용한다', () => {
    const result = PlanRequestSchema.safeParse({ projectId: 'p1', requirements: [] });
    expect(result.success).toBe(true);
  });
});

describe('PlanPhaseSchema', () => {
  it('유효한 phase를 통과시킨다', () => {
    const phase = { id: 1, name: 'Foundation', duration: '1 week', tasks: ['task1'] };
    expect(PlanPhaseSchema.safeParse(phase).success).toBe(true);
  });

  it('id가 0 이하이면 거부한다', () => {
    const phase = { id: 0, name: 'Phase', duration: '1 week', tasks: [] };
    expect(PlanPhaseSchema.safeParse(phase).success).toBe(false);
  });

  it('음수 id를 거부한다', () => {
    const phase = { id: -1, name: 'Phase', duration: '1 week', tasks: [] };
    expect(PlanPhaseSchema.safeParse(phase).success).toBe(false);
  });

  it('빈 name을 거부한다', () => {
    const phase = { id: 1, name: '', duration: '1 week', tasks: [] };
    expect(PlanPhaseSchema.safeParse(phase).success).toBe(false);
  });

  it('빈 duration을 거부한다', () => {
    const phase = { id: 1, name: 'Phase', duration: '', tasks: [] };
    expect(PlanPhaseSchema.safeParse(phase).success).toBe(false);
  });

  it('tasks에 빈 문자열을 거부한다', () => {
    const phase = { id: 1, name: 'Phase', duration: '1 week', tasks: [''] };
    expect(PlanPhaseSchema.safeParse(phase).success).toBe(false);
  });
});

describe('PlanResponseSchema', () => {
  it('유효한 응답을 검증한다', () => {
    const response = {
      projectId: 'p1',
      status: 'completed',
      timestamp: new Date().toISOString(),
      phases: [{ id: 1, name: 'Phase', duration: '1 week', tasks: ['t1'] }],
    };
    expect(PlanResponseSchema.safeParse(response).success).toBe(true);
  });

  it('빈 phases 배열을 허용한다', () => {
    const response = {
      projectId: 'p1',
      status: 'completed',
      timestamp: new Date().toISOString(),
      phases: [],
    };
    expect(PlanResponseSchema.safeParse(response).success).toBe(true);
  });
});

describe('RiskRequestSchema', () => {
  it('최소 필수 필드로 통과시킨다', () => {
    const result = RiskRequestSchema.safeParse({ projectId: 'p1' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.scope).toBe('full');
  });

  it('scope가 기본값 full로 설정된다', () => {
    const result = RiskRequestSchema.parse({ projectId: 'p1' });
    expect(result.scope).toBe('full');
  });

  it('유효한 scope enum을 허용한다', () => {
    for (const s of ['full', 'security', 'performance', 'compliance']) {
      expect(RiskRequestSchema.safeParse({ projectId: 'p1', scope: s }).success).toBe(true);
    }
  });

  it('유효하지 않은 scope를 거부한다', () => {
    expect(RiskRequestSchema.safeParse({ projectId: 'p1', scope: 'invalid' }).success).toBe(false);
  });
});

describe('RiskItemSchema', () => {
  it('유효한 risk item을 통과시킨다', () => {
    const item = {
      id: 'r1',
      category: 'technical',
      severity: 'medium',
      probability: 'low',
      description: 'desc',
      mitigation: 'mit',
    };
    expect(RiskItemSchema.safeParse(item).success).toBe(true);
  });

  it('severity enum 외 값을 거부한다', () => {
    const item = {
      id: 'r1', category: 'c', severity: 'extreme',
      probability: 'low', description: 'd', mitigation: 'm',
    };
    expect(RiskItemSchema.safeParse(item).success).toBe(false);
  });

  it('probability enum 외 값을 거부한다', () => {
    const item = {
      id: 'r1', category: 'c', severity: 'low',
      probability: 'very-high', description: 'd', mitigation: 'm',
    };
    expect(RiskItemSchema.safeParse(item).success).toBe(false);
  });

  it('빈 id를 거부한다', () => {
    const item = {
      id: '', category: 'c', severity: 'low',
      probability: 'low', description: 'd', mitigation: 'm',
    };
    expect(RiskItemSchema.safeParse(item).success).toBe(false);
  });

  it('빈 description을 거부한다', () => {
    const item = {
      id: 'r1', category: 'c', severity: 'low',
      probability: 'low', description: '', mitigation: 'm',
    };
    expect(RiskItemSchema.safeParse(item).success).toBe(false);
  });

  it('빈 mitigation을 거부한다', () => {
    const item = {
      id: 'r1', category: 'c', severity: 'low',
      probability: 'low', description: 'd', mitigation: '',
    };
    expect(RiskItemSchema.safeParse(item).success).toBe(false);
  });
});

describe('RiskResponseSchema', () => {
  it('유효한 응답을 검증한다', () => {
    const response = {
      projectId: 'p1',
      scope: 'full',
      status: 'completed',
      timestamp: new Date().toISOString(),
      risks: [{
        id: 'r1', category: 'c', severity: 'low',
        probability: 'low', description: 'd', mitigation: 'm',
      }],
    };
    expect(RiskResponseSchema.safeParse(response).success).toBe(true);
  });

  it('빈 risks 배열을 허용한다', () => {
    const response = {
      projectId: 'p1', scope: 'full', status: 'completed',
      timestamp: new Date().toISOString(), risks: [],
    };
    expect(RiskResponseSchema.safeParse(response).success).toBe(true);
  });
});

describe('CommandSchema', () => {
  it('유효한 command를 통과시킨다', () => {
    const cmd = { id: 'c1', name: 'Cmd', description: 'desc', endpoint: '/api/cmd' };
    expect(CommandSchema.safeParse(cmd).success).toBe(true);
  });

  it('빈 id를 거부한다', () => {
    const cmd = { id: '', name: 'Cmd', description: 'desc', endpoint: '/api/cmd' };
    expect(CommandSchema.safeParse(cmd).success).toBe(false);
  });

  it('빈 endpoint를 거부한다', () => {
    const cmd = { id: 'c1', name: 'Cmd', description: 'desc', endpoint: '' };
    expect(CommandSchema.safeParse(cmd).success).toBe(false);
  });
});

describe('CommandExecuteRequestSchema', () => {
  it('최소 필수 필드로 통과시킨다', () => {
    const result = CommandExecuteRequestSchema.safeParse({ command: 'analyze' });
    expect(result.success).toBe(true);
  });

  it('빈 command를 거부한다', () => {
    const result = CommandExecuteRequestSchema.safeParse({ command: '' });
    expect(result.success).toBe(false);
  });

  it('command 없이 거부한다', () => {
    const result = CommandExecuteRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('params를 포함할 수 있다', () => {
    const result = CommandExecuteRequestSchema.safeParse({
      command: 'analyze',
      params: { projectId: 'p1' },
    });
    expect(result.success).toBe(true);
  });

  it('idempotencyKey를 포함할 수 있다', () => {
    const result = CommandExecuteRequestSchema.safeParse({
      command: 'analyze',
      idempotencyKey: 'key-1',
    });
    expect(result.success).toBe(true);
  });
});

describe('CommandExecuteResponseSchema', () => {
  it('유효한 응답을 검증한다', () => {
    const response = { status: 'queued', message: '실행됨' };
    expect(CommandExecuteResponseSchema.safeParse(response).success).toBe(true);
  });

  it('status enum 외 값을 거부한다', () => {
    const response = { status: 'unknown', message: 'msg' };
    expect(CommandExecuteResponseSchema.safeParse(response).success).toBe(false);
  });

  it('result를 포함할 수 있다', () => {
    const response = { status: 'completed', message: 'done', result: { data: 1 } };
    expect(CommandExecuteResponseSchema.safeParse(response).success).toBe(true);
  });
});

describe('CommandsListResponseSchema', () => {
  it('유효한 응답을 검증한다', () => {
    const response = {
      commands: [{ id: 'c1', name: 'Cmd', description: 'desc', endpoint: '/api/cmd' }],
    };
    expect(CommandsListResponseSchema.safeParse(response).success).toBe(true);
  });

  it('빈 commands 배열을 허용한다', () => {
    const response = { commands: [] };
    expect(CommandsListResponseSchema.safeParse(response).success).toBe(true);
  });

  it('commands 항목이 유효하지 않으면 거부한다', () => {
    const response = {
      commands: [{ id: '', name: 'Cmd', description: 'desc', endpoint: '/api/cmd' }],
    };
    expect(CommandsListResponseSchema.safeParse(response).success).toBe(false);
  });
});

describe('AnalyzeResultItemSchema', () => {
  it('유효한 item을 통과시킨다', () => {
    const item = { category: 'code', score: 85, findings: ['f1'] };
    expect(AnalyzeResultItemSchema.safeParse(item).success).toBe(true);
  });

  it('score가 0~100 범위 밖이면 거부한다', () => {
    expect(AnalyzeResultItemSchema.safeParse({ category: 'c', score: -1, findings: [] }).success).toBe(false);
    expect(AnalyzeResultItemSchema.safeParse({ category: 'c', score: 101, findings: [] }).success).toBe(false);
  });

  it('score 경계값 0과 100을 허용한다', () => {
    expect(AnalyzeResultItemSchema.safeParse({ category: 'c', score: 0, findings: [] }).success).toBe(true);
    expect(AnalyzeResultItemSchema.safeParse({ category: 'c', score: 100, findings: [] }).success).toBe(true);
  });

  it('recommendation을 포함할 수 있다', () => {
    const item = { category: 'code', score: 85, findings: [], recommendation: 'fix' };
    expect(AnalyzeResultItemSchema.safeParse(item).success).toBe(true);
  });
});
