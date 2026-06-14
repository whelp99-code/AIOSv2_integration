import { describe, expect, it } from 'vitest';
import {
  AnalyzeRequestSchema,
  PlanRequestSchema,
  RiskRequestSchema,
  CommandExecuteRequestSchema,
  AnalyzeResultItemSchema,
  PlanPhaseSchema,
  RiskItemSchema,
} from '@/lib/schemas/aios-v1.schema';

describe('경계값 테스트', () => {
  describe('projectId 경계값', () => {
    it('1글자 projectId를 허용한다', () => {
      expect(AnalyzeRequestSchema.safeParse({ projectId: 'a' }).success).toBe(true);
    });

    it('매우 긴 projectId를 허용한다', () => {
      const longId = 'a'.repeat(1000);
      expect(AnalyzeRequestSchema.safeParse({ projectId: longId }).success).toBe(true);
    });

    it('공백만 있는 projectId를 거부한다', () => {
      expect(AnalyzeRequestSchema.safeParse({ projectId: '   ' }).success).toBe(false);
    });

    it('특수문자 projectId를 허용한다', () => {
      expect(AnalyzeRequestSchema.safeParse({ projectId: 'proj-123_abc' }).success).toBe(true);
    });

    it('한글 projectId를 허용한다', () => {
      expect(AnalyzeRequestSchema.safeParse({ projectId: '프로젝트-1' }).success).toBe(true);
    });
  });

  describe('AnalyzeRequest type 경계값', () => {
    it('4가지 유효한 type을 모두 허용한다', () => {
      const types = ['full', 'quick', 'security', 'performance'];
      for (const type of types) {
        expect(AnalyzeRequestSchema.safeParse({ projectId: 'p1', type }).success).toBe(true);
      }
    });

    it('대소문자를 구분한다', () => {
      expect(AnalyzeRequestSchema.safeParse({ projectId: 'p1', type: 'Full' }).success).toBe(false);
      expect(AnalyzeRequestSchema.safeParse({ projectId: 'p1', type: 'FULL' }).success).toBe(false);
    });

    it('null type을 거부한다', () => {
      expect(AnalyzeRequestSchema.safeParse({ projectId: 'p1', type: null }).success).toBe(false);
    });

    it('숫자 type을 거부한다', () => {
      expect(AnalyzeRequestSchema.safeParse({ projectId: 'p1', type: 1 }).success).toBe(false);
    });
  });

  describe('RiskRequest scope 경계값', () => {
    it('4가지 유효한 scope를 모두 허용한다', () => {
      const scopes = ['full', 'security', 'performance', 'compliance'];
      for (const scope of scopes) {
        expect(RiskRequestSchema.safeParse({ projectId: 'p1', scope }).success).toBe(true);
      }
    });

    it('대소문자를 구분한다', () => {
      expect(RiskRequestSchema.safeParse({ projectId: 'p1', scope: 'Full' }).success).toBe(false);
    });
  });

  describe('PlanPhase 경계값', () => {
    it('id=1을 허용한다', () => {
      expect(PlanPhaseSchema.safeParse({
        id: 1, name: 'P', duration: '1w', tasks: ['t'],
      }).success).toBe(true);
    });

    it('id=MAX_SAFE_INTEGER를 허용한다', () => {
      expect(PlanPhaseSchema.safeParse({
        id: Number.MAX_SAFE_INTEGER, name: 'P', duration: '1w', tasks: ['t'],
      }).success).toBe(true);
    });

    it('id=0을 거부한다', () => {
      expect(PlanPhaseSchema.safeParse({
        id: 0, name: 'P', duration: '1w', tasks: ['t'],
      }).success).toBe(false);
    });

    it('소수 id를 거부한다', () => {
      expect(PlanPhaseSchema.safeParse({
        id: 1.5, name: 'P', duration: '1w', tasks: ['t'],
      }).success).toBe(false);
    });

    it('빈 tasks 배열을 허용한다', () => {
      expect(PlanPhaseSchema.safeParse({
        id: 1, name: 'P', duration: '1w', tasks: [],
      }).success).toBe(true);
    });

    it('많은 tasks를 허용한다', () => {
      const tasks = Array.from({ length: 100 }, (_, i) => `task-${i}`);
      expect(PlanPhaseSchema.safeParse({
        id: 1, name: 'P', duration: '1w', tasks,
      }).success).toBe(true);
    });

    it('1글자 name을 허용한다', () => {
      expect(PlanPhaseSchema.safeParse({
        id: 1, name: 'A', duration: '1w', tasks: [],
      }).success).toBe(true);
    });

    it('1글자 duration을 허용한다', () => {
      expect(PlanPhaseSchema.safeParse({
        id: 1, name: 'P', duration: 'd', tasks: [],
      }).success).toBe(true);
    });
  });

  describe('RiskItem severity 경계값', () => {
    it('4가지 severity를 모두 허용한다', () => {
      for (const severity of ['low', 'medium', 'high', 'critical']) {
        expect(RiskItemSchema.safeParse({
          id: 'r1', category: 'c', severity, probability: 'low',
          description: 'd', mitigation: 'm',
        }).success).toBe(true);
      }
    });

    it('대소문자를 구분한다', () => {
      expect(RiskItemSchema.safeParse({
        id: 'r1', category: 'c', severity: 'Low', probability: 'low',
        description: 'd', mitigation: 'm',
      }).success).toBe(false);
    });
  });

  describe('RiskItem probability 경계값', () => {
    it('3가지 probability를 모두 허용한다', () => {
      for (const probability of ['low', 'medium', 'high']) {
        expect(RiskItemSchema.safeParse({
          id: 'r1', category: 'c', severity: 'low', probability,
          description: 'd', mitigation: 'm',
        }).success).toBe(true);
      }
    });
  });

  describe('AnalyzeResultItem score 경계값', () => {
    it('score=0을 허용한다', () => {
      expect(AnalyzeResultItemSchema.safeParse({
        category: 'c', score: 0, findings: [],
      }).success).toBe(true);
    });

    it('score=100을 허용한다', () => {
      expect(AnalyzeResultItemSchema.safeParse({
        category: 'c', score: 100, findings: [],
      }).success).toBe(true);
    });

    it('score=-0.01을 거부한다', () => {
      expect(AnalyzeResultItemSchema.safeParse({
        category: 'c', score: -0.01, findings: [],
      }).success).toBe(false);
    });

    it('score=100.01을 거부한다', () => {
      expect(AnalyzeResultItemSchema.safeParse({
        category: 'c', score: 100.01, findings: [],
      }).success).toBe(false);
    });

    it('score=50.5를 허용한다 (소수점)', () => {
      expect(AnalyzeResultItemSchema.safeParse({
        category: 'c', score: 50.5, findings: [],
      }).success).toBe(true);
    });

    it('NaN score를 거부한다', () => {
      expect(AnalyzeResultItemSchema.safeParse({
        category: 'c', score: NaN, findings: [],
      }).success).toBe(false);
    });

    it('Infinity score를 거부한다', () => {
      expect(AnalyzeResultItemSchema.safeParse({
        category: 'c', score: Infinity, findings: [],
      }).success).toBe(false);
    });
  });

  describe('CommandExecuteRequest 경계값', () => {
    it('1글자 command를 허용한다', () => {
      expect(CommandExecuteRequestSchema.safeParse({ command: 'a' }).success).toBe(true);
    });

    it('공백만 있는 command를 거부한다', () => {
      expect(CommandExecuteRequestSchema.safeParse({ command: '   ' }).success).toBe(false);
    });

    it('params에 중첩 객체를 허용한다', () => {
      expect(CommandExecuteRequestSchema.safeParse({
        command: 'c',
        params: { nested: { deep: { value: 1 } } },
      }).success).toBe(true);
    });

    it('params에 배열 값을 허용한다', () => {
      expect(CommandExecuteRequestSchema.safeParse({
        command: 'c',
        params: { items: [1, 2, 3] },
      }).success).toBe(true);
    });
  });

  describe('idempotencyKey 경계값', () => {
    it('UUID 형식 키를 허용한다', () => {
      expect(AnalyzeRequestSchema.safeParse({
        projectId: 'p1',
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
      }).success).toBe(true);
    });

    it('1글자 키를 허용한다', () => {
      expect(AnalyzeRequestSchema.safeParse({
        projectId: 'p1',
        idempotencyKey: 'x',
      }).success).toBe(true);
    });
  });

  describe('requirements 배열 경계값', () => {
    it('많은 requirements를 허용한다', () => {
      const reqs = Array.from({ length: 50 }, (_, i) => `req-${i}`);
      expect(PlanRequestSchema.safeParse({
        projectId: 'p1',
        requirements: reqs,
      }).success).toBe(true);
    });

    it('빈 문자열 requirement를 거부한다', () => {
      expect(PlanRequestSchema.safeParse({
        projectId: 'p1',
        requirements: [''],
      }).success).toBe(false);
    });
  });
});
