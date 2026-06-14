# Secondary Red Team Review — Track A (Full)

**Date**: 2026-06-14
**Reviewer**: Secondary Red Team (Codex/Claude Code-style Deep Audit)
**Scope**: `apps/web/src/app/api/`, `packages/`, `tests/`, `apps/api/`, `plugins/`
**Architecture**: Modular Monolith (Turborepo + pnpm workspaces)

---

## Executive Summary

AIOSv2_integration는 Turborepo 기반 모놀리식 모놀리스로, Next.js 웹 앱과 Express/tRPC API 서버를 포함합니다. 전반적으로 체계적인 아키텍처를 갖추고 있으나, **보안 민감 영역에서 Critical/High 수준의 문제가 다수 발견**되었습니다. 특히 인증 바이패스, 하드코딩된 시크릿, 커맨드 인젝션 취약점이 포함되어 있어 프로덕션 배포 전 즉각적인 수정이 필요합니다.

**총 Findings: 23건**
- 🔴 Critical: 5건
- 🟠 High: 7건
- 🟡 Medium: 8건
- 🟢 Low: 3건

---

## 1. 아키텍처 레벨 검토

### ARCH-001: 이중 API 서버 구조 (Web + Express/tRPC) 🟡 Medium

**위치**: `apps/web/` (Next.js App Router) + `apps/api/` (Express + tRPC)

**발견**: 두 개의 독립 API 서버가 공존합니다:
- `apps/web/src/app/api/` — Next.js App Router API routes (30+ endpoints)
- `apps/api/src/` — Express + tRPC server (포트 3200)

**문제점**:
- 동일한 비즈니스 로직(승인, 워크플로우, 고객관리)이 두 서버에 걸쳐 분산될 위험
- `apps/api/`는 tRPC router를 사용하지만, `apps/web/`은 REST-style Next.js route handlers를 사용 — 프로토콜 불일치
- 두 서버 간 공유 인증 메커니즘 부재 (NextAuth vs Express auth middleware)

**제안**:
```
1. 단일 API 진입점으로 통합 권장: Next.js API routes에서 tRPC client로 Express 백엔드 호출
2. 또는 apps/api를 제거하고 모든 비즈니스 로직을 apps/web API routes + packages/ service layer로 통합
3. 공유 인증 미들웨어 패키지(@aios/auth-middleware) 생성
```

### ARCH-002: 의존성 방향 일관성 ✅ Good

**발견**: `packages/` 계층이 잘 분리되어 있습니다:
- `packages/domain/` → 순수 엔티티, 의존성 없음
- `packages/application/` → domain에만 의존
- `packages/infrastructure/` → 외부 서비스 어댑터
- `packages/shared/` → 공통 유틸리티

**평가**: Clean Architecture 원칙을 대체로 준수하고 있습니다.

### ARCH-003: 파일 기반 상태 관리 (Collaboration State) 🟠 High

**위치**: `apps/web/src/lib/collaboration/server.ts`, `packages/infrastructure/src/collaboration/`

**발견**: 협업 세션, 승인 큐, 증거(evidence)가 모두 JSON 파일 기반으로 관리됩니다:
- `collaboration-state.json` — 세션 상태
- `approval-queue.json` — 승인 큐
- `docs/evidence/` — 증거 파일

**문제점**:
- 동시 접근 시 데이터 손실 위험 (파일 잠금 없음)
- 서버 재시작 시 메모리 기반 캐시(idempotency cache 등) 손실
- 스케일아웃 불가 — 멀티 인스턴스 환경에서 상태 공유 불가

**제안**: Prisma DB(`packages/db/`)를 활용하여 상태를 DB로 마이그레이션. 파일 기반은 개발/테스트 전용으로 제한.

---

## 2. 보안 민감 영역 심층 분석

### SEC-001: 🔴 CRITICAL — 하드코딩된 NextAuth 시크릿

**위치**: `apps/web/src/lib/auth/index.ts:10`

```typescript
secret: process.env.NEXTAUTH_SECRET || 'aiosv2-dev-secret-2024',
```

**문제**: 환경변수가 설정되지 않은 경우(프로덕션 포함) 하드코딩된 시크릿이 사용됩니다. 이는:
- JWT 토큰 위변조 가능
- 세션 하이재킹 가능
- `packages/auth/src/token-manager.ts`의 JWT 서명 키도 동일 시크릿 기반이므로 토큰 전체 보안 체계 붕괴

**수정 제안**:
```typescript
// apps/web/src/lib/auth/index.ts
const secret = process.env.NEXTAUTH_SECRET;
if (!secret && process.env.NODE_ENV === 'production') {
  throw new Error('NEXTAUTH_SECRET is required in production');
}
// 프로덕션에서 절대 fallback 시크릿 사용 금지
secret: secret || (process.env.NODE_ENV === 'development' ? 'dev-only-secret' : undefined),
```

### SEC-002: 🔴 CRITICAL — Express Auth Middleware 인증 바이패스

**위치**: `apps/api/src/middleware/auth.ts:23-43`

```typescript
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const userId = req.headers['x-user-id'] as string;
  // ...
  if (process.env.NODE_ENV === 'development') {
    req.user = { id: 'dev-user', email: 'dev@aios.local', name: 'Developer', role: 'ADMIN' };
    next();
  }
}
```

**문제점**:
1. **헤더 기반 인증 위조**: `x-user-id` 헤더를 클라이언트가 임의 설정 가능 — 실제 인증 검증 없음
2. **개발 모드 ADMIN 바이패스**: `NODE_ENV !== 'production'`이면 ADMIN 권한으로 자동 인증
3. **NODE_ENV 조작 가능**: 환경변수를 `development`로 설정하면 프로덕션에서도 바이패스 가능

**수정 제안**:
```typescript
// 실제 JWT/세션 검증 필수
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.slice(7);
  // JWT 검증 로직 호출
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });
  req.user = user;
  next();
}
```

### SEC-003: 🔴 CRITICAL — Approval Gate 개발 모드 전역 바이패스

**위치**: `apps/web/src/lib/integrations/approval-middleware.ts:222-261`, `aios-v1-proxy-handler.ts:64-69`

```typescript
// approval-middleware.ts
if (process.env.NODE_ENV !== "production") {
  // ... 모든 승인 검증 우회
  const mockApprovalContext = {
    approvalId: "dev-bypass",
    approvalStatus: "approved",
    // ...
  };
}

// aios-v1-proxy-handler.ts
if (process.env.NODE_ENV !== "production") {
  console.warn(`[Gate] ${gate} check ... (DEV MODE: auto-approved)`);
  return { allowed: true };
}
```

**문제점**:
- `NODE_ENV` 환경변수 하나로 전체 승인 게이트 시스템 우회 가능
- 프로덕션 환경에서 `NODE_ENV`가 잘못 설정되면 모든 destructive action(배포, 데이터 삭제, 장비 제어)이 승인 없이 실행됨
- 특히 `device-control`(Sangfor 장비 제어) 게이트까지 바이패스됨

**수정 제안**:
```
1. NODE_ENV 대신 별도의 명시적 플래그 사용: APPROVAL_GATE_DISABLED=true (테스트에서만)
2. 프로덕션 환경에서 APPROVAL_GATE_DISABLED가 설정되어 있으면 startup 시 fatal error
3. 또는 dev 모드에서도 approval gate 활성화 + 빠른 테스트용 auto-approve 별도 메커니즘
```

### SEC-004: 🔴 CRITICAL — Docker/Process Sandbox 커맨드 인젝션

**위치**: `packages/infrastructure/sandbox/src/docker-sandbox.ts:66`, `process-sandbox.ts:29`

```typescript
// docker-sandbox.ts
const { stdout } = await execAsync(`docker ${args.join(' ')}`, { timeout: ... });

// process-sandbox.ts
const fullCommand = [command, ...args].map((a) => JSON.stringify(a)).join(' ');
const { stdout, stderr } = await execAsync(fullCommand, { timeout: ... });
```

**문제점**:
- `docker-sandbox.ts`: `execute()` 메서드에서 command와 args가 문자열 연결로 shell에 전달됨. `; rm -rf /` 같은 명령어 삽입 가능
- `writeFile()`: `echo '${encoded}' | base64 -d > ${filePath}` — filePath에 특수문자 포함 시 인젝션 가능
- `process-sandbox.ts`: `JSON.stringify()`로 escaping 시도했으나 `execAsync`는 여전히 shell을 통해 실행됨

**수정 제안**:
```typescript
// docker-sandbox.ts — spawn 사용으로 변경
import { spawn } from 'child_process';
// shell: false 옵션으로 직접 실행
const child = spawn('docker', ['exec', this.config.containerName!, command, ...args], {
  timeout: this.config.timeout,
  shell: false, // 핵심: shell 해석 방지
});
```

### SEC-005: 🟠 High — Grafana/Prometheus 자격증명 하드코딩

**위치**: `packages/infrastructure/monitoring/src/metrics.ts`

환경변수 대신 기본값으로 `admin:admin` 등이 사용될 가능성. 모니터링 엔드포인트가 외부에 노출되면 시스템 전체 모니터링 데이터 유출.

**수정 제안**: 모니터링 인증 정보를 `@aios/config` RequiredSecretsSchema에 추가.

### SEC-006: 🟠 High — Token Manager 인메모리 저장소

**위치**: `packages/auth/src/token-manager.ts:66`

```typescript
private store = new Map<ProductName, StoredToken>();
```

**문제점**:
- OAuth refresh token이 메모리에 평문 저장 (line 129: "암호화는 추후")
- 서버 재시작 시 모든 토큰 손실 → 사용자 재인증 강제
- 프로세스 메모리 덤프 시 모든 토큰 유출 가능

**수정 제안**:
```
1. Refresh token은 DB에 AES-256-GCM 암호화하여 저장
2. Access token은 메모리 캐시 허용하되 TTL 기반 자동 삭제
3. 프로덕션에서는 Redis 등 외부 저장소 사용
```

### SEC-007: 🟠 High — Proxy 요청에 원본 헤더 전달

**위치**: `apps/web/src/lib/integrations/aios-v1-proxy-handler.ts:25-28`

```typescript
req.headers.forEach((value, key) => {
  headers[key] = value;
});
```

**문제점**: 클라이언트의 모든 헤더를 그대로 업스트림에 전달. `Authorization`, `Cookie` 등 민감한 헤더가 업스트림 서버에 누출될 수 있음.

**수정 제안**: 헤더 화이트리스트 방식으로 변경:
```typescript
const ALLOWED_HEADERS = ['content-type', 'accept', 'x-request-id'];
```

### SEC-008: 🟠 High — GitHub Webhook 시크릿 검증 없음

**위치**: `apps/web/src/app/api/github/webhooks/route.ts`

```typescript
export const POST = createAiosV1ProxyHandler('/api/github/webhooks', 'config-change');
```

GitHub webhook 요청의 서명(signature) 검증이 없습니다. 임의의 POST 요청이 webhook으로 처리될 수 있음.

**수정 제안**: `@octokit/webhooks` 라이브러리를 사용하여 `X-Hub-Signature-256` 헤더 검증 필수화.

### SEC-009: 🟠 High — CORS 설정 과도하게 관대

**위치**: `apps/api/src/index.ts:22`

```typescript
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3110', credentials: true }));
```

**문제점**: `credentials: true`와 함께 origin이 환경변수로 설정 가능. `CORS_ORIGIN=*`로 설정하면 모든 도메인에서 인증된 크로스 오리진 요청 가능.

**수정 제안**: 프로덕션에서 origin을 환경변수로 설정할 때 유효성 검증 추가. `*`와 `credentials: true` 동시 사용 방지.

### SEC-010: 🟠 High — Plugin Loader 무제한 동적 import

**위치**: `plugins/plugin-core/src/loader.ts:75`

```typescript
const pluginModule = await import(path.join(pluginPath, manifest.main));
```

`manifest.main`이 임의의 파일 경로를 가리킬 수 있어 **경로 순회(path traversal)** 공격 가능. 플러그인 디렉토리 외부의 파일이 import될 수 있음.

**수정 제안**:
```typescript
const resolvedPath = path.resolve(pluginPath, manifest.main);
if (!resolvedPath.startsWith(path.resolve(pluginPath))) {
  throw new Error('Plugin main must be within plugin directory');
}
```

---

## 3. 코드 품질 검토

### QUAL-001: 🟡 Medium — 싱글톤 패턴 남용 및 테스트 격리 부족

**위치**: 다수 파일

```typescript
// command-registry.ts
let _instance: CommandRegistry | null = null;
export function getCommandRegistry(): CommandRegistry { ... }

// token-manager.ts
let tokenManagerInstance: TokenManager | null = null;
export function getTokenManager(): TokenManager { ... }

// feature-flag.ts — 싱글톤은 아니나 전역 상태
const FLAG_KEY = 'NEXT_PUBLIC_AIOS_V1_REAL_LOGIST';
```

**문제점**: 모듈 레벨 싱글톤이 테스트 간 상태 누출을 유발. `resetCommandRegistry()` 등 reset 함수가 있으나 일관성 없음.

**제안**: DI(Dependency Injection) 패턴 도입 또는 React Server Components의 request-scoped 패턴 활용.

### QUAL-002: 🟡 Medium — 에러 핸들링 불일치

**발견 패턴**:
- 일부 route: `try/catch`로 에러 처리 후 적절한 HTTP 상태코드 반환 ✅
- 일부 route: `upstreamErrorResponse()` 헬퍼 사용 ✅
- `proxyAiosV1Json` 실패 시 내부 에러 메시지가 클라이언트에 노출될 수 있음 ⚠️
- `console.error`로 로깅만 하고 적절한 에러 응답 미반환 경우 존재 ⚠️

**제안**: 공통 에러 핸들러 미들웨어를 Next.js API routes에도 적용. 에러 응답에 내부 정보 노출 방지.

### QUAL-003: 🟡 Medium — Rate Limiter 메모리 누수

**위치**: `apps/api/src/middleware/rate-limiter.ts`

```typescript
const store = new Map<string, RateLimitEntry>();
```

**문제점**:
- IP 기반으로만 엔트리 생성, 만료된 엔트리 자동 정리 없음
- 대규모 트래픽 시 메모리 무한 증가
- 서버 재시작 시 모든 rate limit 상태 초기화 (DDS 재개)

**제안**: TTL 기반 자동 만료 + LRU 캐시 도입, 또는 Redis 기반 rate limiter 사용.

### QUAL-004: 🟡 Medium — `packages/shared`의 validation 유틸리티 미사용

**위치**: `packages/shared/src/utils/validation.ts`

`validate()`와 `validateSafe()` 함수가 정의되어 있으나, 실제 API route handlers에서는 직접 `zod.parse()`/`safeParse()`를 호출. 중앙 유틸리티 사용을 강제하는 린트 규칙 필요.

### QUAL-005: 🟢 Low — 중복 파일 존재

**발견**:
- `apps/web/src/lib/schemas/aios-v1.schema 2.ts` (공백 포함 파일명)
- `tests/integration.test 2.ts`
- `eslint.config 2.js`
- `apps/web/src/lib/services/command-registry 2.ts`

**제안**: 중복 파일 정리 및 `.gitignore` 또는 린트 규칙으로 공백 포함 파일명 방지.

### QUAL-006: 🟢 Low — `NEXT_PUBLIC_` 접두사가 붙은 feature flag이 서버에서 사용됨

**위치**: `apps/web/src/lib/services/feature-flag.ts:1`

```typescript
const FLAG_KEY = 'NEXT_PUBLIC_AIOS_V1_REAL_LOGIC';
```

`NEXT_PUBLIC_` 접두사는 Next.js에서 클라이언트 번들에 포함됨. 서버 전용 로직에서 이 변수를 사용하면 의도치 않게 클라이언트에 노출됨.

---

## 4. 운영 리스크 검토

### OPS-001: 🟡 Medium — DB 마이그레이션 스크립트에 롤백 전략 불충분

**위치**: `packages/db/scripts/rollback.ts`

마이그레이션 롤백 스크립트가 존재하지만, 실행 전 백업 확인 로직 없음. 프로덕션 데이터 손실 위험.

**제안**: 마이그레이션 전 자동 백업 + 롤백 가능 여부 검증 로직 추가.

### OPS-002: 🟡 Medium — Health Check에 인증 정보 포함

**위치**: `apps/api/src/index.ts:60-70` (Slack status endpoint)

```typescript
app.get('/api/slack/status', (_req, res) => {
  const hasWebhook = Boolean(process.env.SLACK_WEBHOOK_URL);
  const hasBotToken = Boolean(process.env.SLACK_BOT_TOKEN);
  // ...
});
```

**문제점**: 인증 미들웨어 적용 전(`app.use('/api', authMiddleware)` 이전)에 Slack 연동 상태가 노출됨. 공격자가 Slack 설정 여부를 알면 표적 공격에 활용 가능.

**제안**: 민감 정보를 포함하는 health/status 엔드포인트는 인증 미들웨어 이후에 배치.

### OPS-003: 🟠 High — Rate Limiter가 Express API에만 적용

**위치**: `apps/api/src/index.ts` (Express), `apps/web/src/app/api/` (Next.js)

**문제점**: Express 서버에만 rate limiter가 적용되고, Next.js API routes(실제 주요 API)에는 rate limiter 없음. 공격자가 Next.js 경로로 직접 요청하면 rate limit 우회 가능.

**제안**: Next.js middleware.ts에서 전역 rate limiting 적용 또는 `next-rate-limit` 패키지 사용.

### OPS-004: 🟢 Low — `.next` 빌드 아티팩트가 소스 트리에 포함

**발견**: `apps/web/.next/` 디렉토리에 빌드 결과물이 대량 포함되어 있음 (수천 파일). `.gitignore` 설정 확인 필요.

---

## 5. 기술 부채 검토

### DEBT-001: 🟡 Medium — Refresh Token 플로우 미구현

**위치**: `packages/auth/src/token-manager.ts:164-167`

```typescript
private async refreshGraphToken(product: ProductName, refreshToken: string): Promise<string | null> {
  console.warn(`[TokenManager] Refresh token flow not yet implemented for ${product}`);
  return null;
}
```

Microsoft Graph API 연동 시 refresh token이 필수인데 stub만 존재. 토큰 만료 시 전체 서비스 중단.

### DEBT-002: 🟡 Medium — LLM 클라이언트 팩토리의 모든 클라이언트 인스턴스화

**위치**: `packages/infrastructure/llm/src/factory.ts:26-28`

```typescript
this.clients.set('lm-studio', new LMStudioClient(config.lmStudio));
this.clients.set('openai', new OpenAIClientAdapter(config.openai));
this.clients.set('anthropic', new AnthropicClientAdapter(config.anthropic));
```

**문제점**: 팩토리 생성 시 모든 LLM 클라이언트가 초기화됨. 사용하지 않는 제공자의 연결 시도가 발생할 수 있음.

**제안**: Lazy initialization 패턴 적용 (BaseProxyAdapter처럼).

### DEBT-003: 🟠 High — tRPC router와 REST route handlers 간 비즈니스 로직 중복

**위치**: `apps/api/src/routers/` (tRPC) vs `apps/web/src/app/api/` (REST)

동일한 비즈니스 로직(승인, 워크플로우 실행 등)이 두 곳에 구현될 위험이 높음. packages/의 service layer를 공통으로 사용하도록 통일 필요.

---

## Findings 요약 테이블

| ID | Severity | Category | Title | 위치 |
|----|----------|----------|-------|------|
| SEC-001 | 🔴 Critical | Security | 하드코딩된 NextAuth 시크릿 | `apps/web/src/lib/auth/index.ts` |
| SEC-002 | 🔴 Critical | Security | Express Auth Middleware 인증 바이패스 | `apps/api/src/middleware/auth.ts` |
| SEC-003 | 🔴 Critical | Security | Approval Gate 개발 모드 전역 바이패스 | `approval-middleware.ts`, `aios-v1-proxy-handler.ts` |
| SEC-004 | 🔴 Critical | Security | Docker/Process Sandbox 커맨드 인젝션 | `packages/infrastructure/sandbox/` |
| SEC-005 | 🟠 High | Security | 모니터링 자격증명 관리 부재 | `packages/infrastructure/monitoring/` |
| SEC-006 | 🟠 High | Security | Token Manager 인메모리 평문 저장 | `packages/auth/src/token-manager.ts` |
| SEC-007 | 🟠 High | Security | Proxy 원본 헤더 전달 | `aios-v1-proxy-handler.ts` |
| SEC-008 | 🟠 High | Security | GitHub Webhook 서명 검증 없음 | `api/github/webhooks/route.ts` |
| SEC-009 | 🟠 High | Security | CORS 설정 과도 관대 | `apps/api/src/index.ts` |
| SEC-010 | 🟠 High | Security | Plugin Loader 경로 순회 | `plugins/plugin-core/src/loader.ts` |
| ARCH-001 | 🟡 Medium | Architecture | 이중 API 서버 구조 | `apps/web/` + `apps/api/` |
| ARCH-003 | 🟠 High | Architecture | 파일 기반 상태 관리 | `collaboration/server.ts` |
| QUAL-001 | 🟡 Medium | Code Quality | 싱글톤 패턴 남용 | 다수 파일 |
| QUAL-002 | 🟡 Medium | Code Quality | 에러 핸들링 불일치 | API routes 전반 |
| QUAL-003 | 🟡 Medium | Code Quality | Rate Limiter 메모리 누수 | `apps/api/src/middleware/` |
| QUAL-004 | 🟡 Medium | Code Quality | 공통 validation 유틸 미사용 | `packages/shared/` |
| QUAL-005 | 🟢 Low | Code Quality | 중복 파일 존재 | 다수 |
| QUAL-006 | 🟢 Low | Code Quality | NEXT_PUBLIC_ 서버 노출 | `feature-flag.ts` |
| OPS-001 | 🟡 Medium | Operations | DB 롤백 전략 불충분 | `packages/db/scripts/` |
| OPS-002 | 🟡 Medium | Operations | Health Check 정보 노출 | `apps/api/src/index.ts` |
| OPS-003 | 🟠 High | Operations | Next.js API에 rate limit 없음 | `apps/web/src/app/api/` |
| OPS-004 | 🟢 Low | Operations | .next 빌드 아티팩트 포함 | `apps/web/.next/` |
| DEBT-001 | 🟡 Medium | Tech Debt | Refresh Token 미구현 | `packages/auth/` |
| DEBT-002 | 🟡 Medium | Tech Debt | LLM 팩토리 즉시 초기화 | `packages/infrastructure/llm/` |
| DEBT-003 | 🟠 High | Tech Debt | tRPC/REST 비즈니스 로직 중복 | `apps/api/` + `apps/web/` |

---

## 수정 우선순위 (Action Plan)

### Phase 0 — 즉시 수정 (프로덕션 배포 차단)
1. **SEC-001**: NextAuth 시크릿 하드코딩 제거, 환경변수 필수화
2. **SEC-002**: Express auth middleware에 실제 JWT 검증 구현
3. **SEC-003**: Approval gate의 `NODE_ENV` 기반 바이패스를 명시적 플래그로 변경
4. **SEC-004**: sandbox의 `execAsync`를 `spawn` (shell: false)으로 변경

### Phase 1 — 릴리스 전 수정
5. **SEC-006**: 토큰 저장 암호화 구현
6. **SEC-007**: 프록시 헤더 화이트리스트 적용
7. **SEC-008**: GitHub webhook 서명 검증 추가
8. **OPS-003**: Next.js middleware에 rate limiting 적용
9. **SEC-010**: Plugin loader 경로 검증 추가

### Phase 2 — 단기 개선
10. **ARCH-003**: 파일 기반 상태 → DB 마이그레이션
11. **DEBT-003**: tRPC/REST 비즈니스 로직 통합
12. **QUAL-003**: Rate limiter 메모리 관리 개선
13. **SEC-009**: CORS 설정 검증 강화

### Phase 3 — 중기 개선
14. **ARCH-001**: API 서버 구조 통합
15. **QUAL-001**: DI 패턴 도입
16. **DEBT-001**: Refresh token 플로우 구현
17. **DEBT-002**: LLM 팩토리 lazy initialization

---

## 테스트 커버리지 평가

**발견된 테스트**:
- `tests/approval-gate.test.ts` — 승인 게이트 유닛 테스트 ✅
- `tests/integration.test.ts` — 통합 테스트 (승인, 협업, health) ✅
- `tests/unit/` — 14개 유닛 테스트 파일 ✅
- `packages/application/tests/`, `packages/infrastructure/tests/` — 패키지별 테스트 ✅

**테스트 공백 영역**:
- ❌ 보안 테스트 없음 (인증 바이패스, injection 테스트)
- ❌ Rate limiter 테스트 없음
- ❌ Sandbox 보안 테스트 없음
- ❌ Error boundary/edge case 테스트 부족
- ❌ E2E 테스트 없음

**제안**: `tests/security/` 디렉토리를 추가하여 보안 관련 테스트를 집중적으로 구현.

---

*Review completed: 2026-06-14*
*Next action: Phase 0 findings 즉시 remediation 시작*
