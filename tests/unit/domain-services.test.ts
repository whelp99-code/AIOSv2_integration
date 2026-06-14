import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let AnalysisService: typeof import('@/lib/services/analysis-service').AnalysisService;
let PlanningService: typeof import('@/lib/services/planning-service').PlanningService;
let RiskService: typeof import('@/lib/services/risk-service').RiskService;
let resetAnalysisService: typeof import('@/lib/services/analysis-service').resetAnalysisService;
let resetPlanningService: typeof import('@/lib/services/planning-service').resetPlanningService;
let resetRiskService: typeof import('@/lib/services/risk-service').resetRiskService;

beforeEach(async () => {
  vi.resetModules();
  process.env.NEXT_PUBLIC_AIOS_V1_REAL_LOGIC = 'false';
  const [analysis, planning, risk] = await Promise.all([
    import('@/lib/services/analysis-service'),
    import('@/lib/services/planning-service'),
    import('@/lib/services/risk-service'),
  ]);
  AnalysisService = analysis.AnalysisService;
  PlanningService = planning.PlanningService;
  RiskService = risk.RiskService;
  resetAnalysisService = analysis.resetAnalysisService;
  resetPlanningService = planning.resetPlanningService;
  resetRiskService = risk.resetRiskService;
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_AIOS_V1_REAL_LOGIC;
  resetAnalysisService();
  resetPlanningService();
  resetRiskService();
  vi.restoreAllMocks();
});

describe('AnalysisService', () => {
  it('인스턴스를 생성할 수 있다', () => {
    const service = new AnalysisService();
    expect(service).toBeDefined();
  });

  it('execute: flag=false이면 fallback 분석 결과를 반환한다', async () => {
    const service = new AnalysisService();
    const result = await service.execute({ projectId: 'p1', type: 'full' });
    expect(result.status).toBe(200);
  });

  it('execute: fallback 결과에 projectId가 포함된다', async () => {
    const service = new AnalysisService();
    const result = await service.execute({ projectId: 'test-proj', type: 'quick' });
    const body = await result.json();
    expect(body.projectId).toBe('test-proj');
  });

  it('execute: fallback 결과에 type이 포함된다', async () => {
    const service = new AnalysisService();
    const result = await service.execute({ projectId: 'p1', type: 'security' });
    const body = await result.json();
    expect(body.type).toBe('security');
  });

  it('execute: fallback 결과 status는 completed이다', async () => {
    const service = new AnalysisService();
    const result = await service.execute({ projectId: 'p1', type: 'full' });
    const body = await result.json();
    expect(body.status).toBe('completed');
  });

  it('execute: actionContext를 전달할 수 있다', async () => {
    const service = new AnalysisService();
    const ctx = { userId: 'u1', sessionId: 's1', resourceId: 'p1' };
    const result = await service.execute({ projectId: 'p1', type: 'full' }, ctx);
    expect(result.status).toBe(200);
  });

  it('getResults: projectId로 결과를 조회한다', async () => {
    const service = new AnalysisService();
    const result = await service.getResults('p1');
    expect(result.status).toBe(200);
  });

  it('getResults: fallback에서 not_found를 반환한다', async () => {
    const service = new AnalysisService();
    const result = await service.getResults('nonexistent');
    const body = await result.json();
    expect(body.status).toBe('not_found');
  });

  it('getResults: projectId가 응답에 포함된다', async () => {
    const service = new AnalysisService();
    const result = await service.getResults('proj-123');
    const body = await result.json();
    expect(body.projectId).toBe('proj-123');
  });
});

describe('PlanningService', () => {
  it('인스턴스를 생성할 수 있다', () => {
    const service = new PlanningService();
    expect(service).toBeDefined();
  });

  it('execute: flag=false이면 fallback 계획을 반환한다', async () => {
    const service = new PlanningService();
    const result = await service.execute({ projectId: 'p1' });
    expect(result.status).toBe(200);
  });

  it('execute: fallback에 3개 phases가 포함된다', async () => {
    const service = new PlanningService();
    const result = await service.execute({ projectId: 'p1' });
    const body = await result.json();
    expect(body.phases).toHaveLength(3);
  });

  it('execute: phases에 Foundation이 포함된다', async () => {
    const service = new PlanningService();
    const result = await service.execute({ projectId: 'p1' });
    const body = await result.json();
    expect(body.phases[0].name).toBe('Foundation');
  });

  it('execute: phases에 Core Development가 포함된다', async () => {
    const service = new PlanningService();
    const result = await service.execute({ projectId: 'p1' });
    const body = await result.json();
    expect(body.phases[1].name).toBe('Core Development');
  });

  it('execute: phases에 Integration이 포함된다', async () => {
    const service = new PlanningService();
    const result = await service.execute({ projectId: 'p1' });
    const body = await result.json();
    expect(body.phases[2].name).toBe('Integration');
  });

  it('execute: projectId가 응답에 포함된다', async () => {
    const service = new PlanningService();
    const result = await service.execute({ projectId: 'proj-abc' });
    const body = await result.json();
    expect(body.projectId).toBe('proj-abc');
  });

  it('execute: requirements를 포함할 수 있다', async () => {
    const service = new PlanningService();
    const result = await service.execute({
      projectId: 'p1',
      requirements: ['req1', 'req2'],
    });
    expect(result.status).toBe(200);
  });

  it('getResults: fallback에서 not_found를 반환한다', async () => {
    const service = new PlanningService();
    const result = await service.getResults('p1');
    const body = await result.json();
    expect(body.status).toBe('not_found');
  });

  it('getResults: projectId가 응답에 포함된다', async () => {
    const service = new PlanningService();
    const result = await service.getResults('proj-xyz');
    const body = await result.json();
    expect(body.projectId).toBe('proj-xyz');
  });
});

describe('RiskService', () => {
  it('인스턴스를 생성할 수 있다', () => {
    const service = new RiskService();
    expect(service).toBeDefined();
  });

  it('execute: flag=false이면 fallback 리스크 평가를 반환한다', async () => {
    const service = new RiskService();
    const result = await service.execute({ projectId: 'p1', scope: 'full' });
    expect(result.status).toBe(200);
  });

  it('execute: fallback에 2개 risks가 포함된다', async () => {
    const service = new RiskService();
    const result = await service.execute({ projectId: 'p1', scope: 'full' });
    const body = await result.json();
    expect(body.risks).toHaveLength(2);
  });

  it('execute: 첫 번째 risk는 technical 카테고리다', async () => {
    const service = new RiskService();
    const result = await service.execute({ projectId: 'p1', scope: 'full' });
    const body = await result.json();
    expect(body.risks[0].category).toBe('technical');
  });

  it('execute: 두 번째 risk는 schedule 카테고리다', async () => {
    const service = new RiskService();
    const result = await service.execute({ projectId: 'p1', scope: 'full' });
    const body = await result.json();
    expect(body.risks[1].category).toBe('schedule');
  });

  it('execute: scope가 응답에 포함된다', async () => {
    const service = new RiskService();
    const result = await service.execute({ projectId: 'p1', scope: 'security' });
    const body = await result.json();
    expect(body.scope).toBe('security');
  });

  it('execute: projectId가 응답에 포함된다', async () => {
    const service = new RiskService();
    const result = await service.execute({ projectId: 'proj-risk', scope: 'full' });
    const body = await result.json();
    expect(body.projectId).toBe('proj-risk');
  });

  it('execute: status는 completed이다', async () => {
    const service = new RiskService();
    const result = await service.execute({ projectId: 'p1', scope: 'full' });
    const body = await result.json();
    expect(body.status).toBe('completed');
  });

  it('getResults: fallback에서 not_found를 반환한다', async () => {
    const service = new RiskService();
    const result = await service.getResults('p1');
    const body = await result.json();
    expect(body.status).toBe('not_found');
  });

  it('getResults: projectId가 응답에 포함된다', async () => {
    const service = new RiskService();
    const result = await service.getResults('proj-456');
    const body = await result.json();
    expect(body.projectId).toBe('proj-456');
  });
});
