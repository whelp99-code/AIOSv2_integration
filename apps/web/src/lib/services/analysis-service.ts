import { NextResponse } from 'next/server';
import { getAiosV1ActionService, type ActionContext } from './aios-v1-action-service';
import { AnalyzeRequestSchema, AnalyzeResponseSchema, type AnalyzeRequest } from '../schemas/aios-v1.schema';
import { getAiosV1Url } from '../integrations/upstream-urls';

let analysisServiceInstance: AnalysisService | null = null;

export function getAnalysisService(): AnalysisService {
  if (!analysisServiceInstance) {
    analysisServiceInstance = new AnalysisService();
  }
  return analysisServiceInstance;
}

export function resetAnalysisService(): void {
  analysisServiceInstance = null;
}

export class AnalysisService {
  private readonly actionService = getAiosV1ActionService();

  async execute(body: AnalyzeRequest, ctx?: ActionContext): Promise<NextResponse> {
    return this.actionService.execute({
      path: '/api/analyze',
      method: 'POST',
      body,
      schema: AnalyzeRequestSchema,
      fallback: () => this.buildFallback(body),
      actionContext: ctx,
    });
  }

  async getResults(projectId: string): Promise<NextResponse> {
    const query = new URLSearchParams({ projectId });
    return this.actionService.execute({
      path: '/api/analyze',
      method: 'GET',
      query,
      fallback: () =>
        NextResponse.json({
          projectId,
          status: 'not_found',
          message: '분석 결과를 찾을 수 없습니다.',
        }),
    });
  }

  private buildFallback(body: AnalyzeRequest): NextResponse {
    const response = {
      projectId: body.projectId,
      type: body.type,
      status: 'completed',
      timestamp: new Date().toISOString(),
      results: {
        message: '분석을 위해 AIOS v1을 확인하세요.',
        aiosV1Url: getAiosV1Url(),
      },
    };
    const validated = AnalyzeResponseSchema.parse(response);
    return NextResponse.json(validated);
  }
}