import { NextResponse } from 'next/server';
import { getAiosV1ActionService, type ActionContext } from './aios-v1-action-service';
import { RiskRequestSchema, RiskResponseSchema, type RiskRequest } from '../schemas/aios-v1.schema';
import { getAiosV1Url } from '../integrations/upstream-urls';

const FALLBACK_RISKS = [
  {
    id: 'risk-1',
    category: 'technical',
    severity: 'medium',
    probability: 'low',
    description: '의존성 취약점',
    mitigation: '정기적인 의존성 업데이트',
  },
  {
    id: 'risk-2',
    category: 'schedule',
    severity: 'low',
    probability: 'medium',
    description: '일정 지연 가능성',
    mitigation: '정기적인 진행 상황 확인',
  },
];

export class RiskService {
  private readonly actionService = getAiosV1ActionService();

  async execute(body: RiskRequest, ctx?: ActionContext): Promise<NextResponse> {
    return this.actionService.execute({
      path: '/api/risk',
      method: 'POST',
      body,
      schema: RiskRequestSchema,
      fallback: () => this.buildFallback(body),
      actionContext: ctx,
    });
  }

  async getResults(projectId: string): Promise<NextResponse> {
    const query = new URLSearchParams({ projectId });
    return this.actionService.execute({
      path: '/api/risk',
      method: 'GET',
      query,
      fallback: () =>
        NextResponse.json({
          projectId,
          status: 'not_found',
          message: '리스크 평가를 찾을 수 없습니다.',
        }),
    });
  }

  private buildFallback(body: RiskRequest): NextResponse {
    const response = {
      projectId: body.projectId,
      scope: body.scope,
      status: 'completed',
      timestamp: new Date().toISOString(),
      risks: FALLBACK_RISKS,
      message: '리스크 평가를 위해 AIOS v1을 확인하세요.',
      aiosV1Url: getAiosV1Url(),
    };
    const validated = RiskResponseSchema.parse(response);
    return NextResponse.json(validated);
  }
}

let _instance: RiskService | null = null;
export function getRiskService(): RiskService {
  if (!_instance) _instance = new RiskService();
  return _instance;
}
export function resetRiskService(): void {
  _instance = null;
}
