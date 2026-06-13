/**
 * @aios/proxy-core - AIOS v1 Proxy Adapter
 * Implements IUpstreamProxy for AIOS v1 (port 3101)
 * 19 mail API routes with approval gates
 */

import { BaseProxyAdapter } from './base-adapter';
import { IUpstreamProxy, UpstreamConfig, ProxyRequest, ProxyResponse, HealthCheckResult, HealthStatus, ApprovalGateType, GateRequirement, ApprovalContext, GateDecision } from './types';
import { getConfig } from '@aios/config';

/** AIOS v1 specific route to gate mapping */
const ROUTE_GATE_MAP: Record<string, ApprovalGateType> = {
  // Mail APIs - external-share (데이터 내보내기/가져오기)
  '/api/mail-import': 'external-share',
  '/api/mail-candidates': 'external-share',
  '/api/mail-insight-threads': 'external-share',

  // Customer/Partner CRUD - data-mutation (데이터 변경)
  '/api/customers': 'data-mutation',
  '/api/customers/[id]': 'data-mutation',
  '/api/partners': 'data-mutation',
  '/api/partners/[id]': 'data-mutation',

  // Workflow execution - deploy (배포/실행)
  '/api/workflows/[id]/execute': 'deploy',

  // Knowledge documents - external-share (문서 내보내기)
  '/api/knowledge/documents': 'external-share',

  // Automation workflows - deploy (자동화 배포)
  '/api/automation/workflows': 'deploy',
  '/api/automation/workflows/[id]': 'deploy',

  // GitHub - config-change (설정 변경)
  '/api/github/repos': 'config-change',
  '/api/github/webhooks': 'config-change',
};

/** 게이트 타입 결정 헬퍼 */
function getGateForRoute(path: string, method: string): GateRequirement {
  // GET은 게이트 없음 (읽기 전용)
  if (method === 'GET') return 'none';
  
  // POST/PUT/DELETE는 기본적으로 data-mutation
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    // 특정 라우트 매핑 확인
    for (const [pattern, gate] of Object.entries(ROUTE_GATE_MAP)) {
      const regex = new RegExp('^' + pattern.replace(/\[id\]/g, '[^/]+') + '$');
      if (regex.test(path)) return gate;
    }
    // 기본 게이트
    if (method === 'POST' && (path.includes('/workflows') || path.includes('/automation'))) return 'deploy';
    return 'data-mutation';
  }
  return 'none';
}

/** AIOS v1 Proxy Adapter 설정 생성 */
function createAiosV1Config(): UpstreamConfig {
  const cfg = getConfig();
  return {
    name: 'aios-v1',
    baseUrl: cfg.AIOS_V1_URL,
    timeoutMs: 30000,
    retryCount: 3,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeoutMs: 60000,
    healthPath: '/api/health',
    auth: {
      type: 'bearer',
      tokenHeader: 'Authorization',
    },
  };
}

export class AiosV1ProxyAdapter extends BaseProxyAdapter {
  private tokenManager: any = null;

  constructor() {
    super(createAiosV1Config());
  }

  protected async onInitialize(): Promise<void> {
    // 토큰 매니저 지연 로드 (순환 의존 방지)
    const { getTokenManager } = await import('@aios/auth');
    this.tokenManager = getTokenManager();
  }

  /** 인증 헤더 오버라이드 - 토큰 매니저에서 토큰 획득 */
  protected getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    
    // API Key 방식 (환경변수)
    const apiKey = process.env.AIOS_V1_API_KEY;
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
      return headers;
    }

    // JWT Bearer 토큰 (향후 확장)
    // const token = await this.tokenManager?.issueAccessToken('system', 'aios-v1');
    // if (token) headers['Authorization'] = `Bearer ${token}`;
    
    return headers;
  }

  /** 헬스 체크 - AIOS v1 전용 엔드포인트 */
  async checkHealth(): Promise<HealthCheckResult> {
    return super.checkHealth();
  }

  async checkReadiness(): Promise<HealthCheckResult> {
    const liveness = await this.checkHealth();
    if (liveness.status !== 'healthy') return liveness;

    // Readiness: 주요 API 엔드포인트 확인
    try {
      const response = await fetch(`${this.config.baseUrl}/api/customers`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
        headers: this.getAuthHeaders(),
      });
      return {
        status: response.ok ? 'healthy' : 'degraded',
        latencyMs: 0,
        lastChecked: Date.now(),
      };
    } catch {
      return { status: 'unreachable', lastChecked: Date.now(), error: 'Readiness check failed' };
    }
  }

  /** 프록시 요청 실행 - 승인 게이트 평가 포함 */
  async request<T>(req: ProxyRequest): Promise<ProxyResponse<T>> {
    // 승인 게이트 확인 (GET 외 메서드)
    const gateType = getGateForRoute(req.path, req.method);
    
    if (gateType !== 'none' && gateType !== undefined) {
      const approved = await this.evaluateApprovalGate(req, gateType);
      if (!approved.approved) {
        return {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
          data: { error: 'Approval required', gateType, reason: approved.reason } as T,
          latencyMs: 0,
          upstream: this.config.name,
        };
      }
    }

    return super.request<T>(req);
  }

  /** 승인 게이트 평가 (동기 버전 - 비동기 워크플로우는 별도 구현) */
  private async evaluateApprovalGate(req: ProxyRequest, gateType: ApprovalGateType): Promise<GateDecision> {
    // TODO: 실제 승인 큐 연동 (@aios/proxy-core IApprovalGate)
    // 현재는 경고 로그만 남기고 허용 (개발 단계)
    console.warn(`[ApprovalGate] ${gateType} check for ${req.method} ${req.path} - auto-approved in dev`);
    
    // 실제 구현 시:
    // 1. ApprovalContext 생성 (userId, product, action, resource, payload, riskLevel)
    // 2. IApprovalGate.evaluate() 호출
    // 3. 승인 대기 시 202 Accepted 반환, 폴링 URL 제공
    
    return { approved: true };
  }

  /** 19개 라우트 매핑 헬퍼 - Next.js route.ts에서 사용 */
  static getRouteMappings(): Array<{ portalPath: string; upstreamPath: string; methods: string[]; gate: GateRequirement }> {
    return [
      { portalPath: '/api/mail-import', upstreamPath: '/api/mail/import', methods: ['POST'], gate: 'external-share' },
      { portalPath: '/api/mail-candidates', upstreamPath: '/api/mail/candidates', methods: ['GET'], gate: 'none' },
      { portalPath: '/api/mail-insight-threads', upstreamPath: '/api/mail/insight-threads', methods: ['GET'], gate: 'none' },
      { portalPath: '/api/customers', upstreamPath: '/api/customers', methods: ['GET', 'POST'], gate: 'data-mutation' },
      { portalPath: '/api/customers/[id]', upstreamPath: '/api/customers/:id', methods: ['GET', 'PUT', 'DELETE'], gate: 'data-mutation' },
      { portalPath: '/api/partners', upstreamPath: '/api/partners', methods: ['GET', 'POST'], gate: 'data-mutation' },
      { portalPath: '/api/partners/[id]', upstreamPath: '/api/partners/:id', methods: ['GET', 'PUT', 'DELETE'], gate: 'data-mutation' },
      { portalPath: '/api/workflows/[id]/execute', upstreamPath: '/api/workflows/:id/execute', methods: ['POST'], gate: 'deploy' },
      { portalPath: '/api/knowledge/documents', upstreamPath: '/api/knowledge/documents', methods: ['GET', 'POST'], gate: 'external-share' },
      { portalPath: '/api/automation/workflows', upstreamPath: '/api/automation/workflows', methods: ['GET', 'POST'], gate: 'deploy' },
      { portalPath: '/api/automation/workflows/[id]', upstreamPath: '/api/automation/workflows/:id', methods: ['GET', 'PUT', 'DELETE'], gate: 'deploy' },
      { portalPath: '/api/github/repos', upstreamPath: '/api/connectors/github/repos', methods: ['GET', 'POST'], gate: 'config-change' },
      { portalPath: '/api/github/webhooks', upstreamPath: '/api/connectors/github/webhooks', methods: ['POST'], gate: 'config-change' },
    ];
  }
}

/** 싱글톤 인스턴스 */
let aiosV1Adapter: AiosV1ProxyAdapter | null = null;

export function getAiosV1Adapter(): AiosV1ProxyAdapter {
  if (!aiosV1Adapter) {
    aiosV1Adapter = new AiosV1ProxyAdapter();
  }
  return aiosV1Adapter;
}

export function resetAiosV1Adapter(): void {
  aiosV1Adapter = null;
}