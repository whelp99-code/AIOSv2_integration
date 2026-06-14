import { NextResponse } from 'next/server';
import { getAiosV1ActionService, type ActionContext } from './aios-v1-action-service';
import { PlanRequestSchema, PlanResponseSchema, type PlanRequest } from '../schemas/aios-v1.schema';
import { getAiosV1Url } from '../integrations/upstream-urls';

const FALLBACK_PHASES = [
  {
    id: 1,
    name: 'Foundation',
    duration: '1-2 weeks',
    tasks: ['Setup monorepo', 'Configure tools', 'Create base structure'],
  },
  {
    id: 2,
    name: 'Core Development',
    duration: '2-3 weeks',
    tasks: ['Implement domain models', 'Create services', 'Build API'],
  },
  {
    id: 3,
    name: 'Integration',
    duration: '1-2 weeks',
    tasks: ['Connect APIs', 'Test integration', 'Deploy'],
  },
];

export class PlanningService {
  private readonly actionService = getAiosV1ActionService();

  async execute(body: PlanRequest, ctx?: ActionContext): Promise<NextResponse> {
    return this.actionService.execute({
      path: '/api/plan',
      method: 'POST',
      body,
      schema: PlanRequestSchema,
      fallback: () => this.buildFallback(body),
      actionContext: ctx,
    });
  }

  async getResults(projectId: string): Promise<NextResponse> {
    const query = new URLSearchParams({ projectId });
    return this.actionService.execute({
      path: '/api/plan',
      method: 'GET',
      query,
      fallback: () =>
        NextResponse.json({
          projectId,
          status: 'not_found',
          message: '계획을 찾을 수 없습니다.',
        }),
    });
  }

  private buildFallback(body: PlanRequest): NextResponse {
    const response = {
      projectId: body.projectId,
      status: 'completed',
      timestamp: new Date().toISOString(),
      phases: FALLBACK_PHASES,
      message: '계획을 위해 AIOS v1을 확인하세요.',
      aiosV1Url: getAiosV1Url(),
    };
    const validated = PlanResponseSchema.parse(response);
    return NextResponse.json(validated);
  }
}

let _instance: PlanningService | null = null;
export function getPlanningService(): PlanningService {
  if (!_instance) _instance = new PlanningService();
  return _instance;
}
export function resetPlanningService(): void {
  _instance = null;
}
