# B-3 PR Description

## Overview

- **Phase**: B-3 도메인/애플리케이션/API Layer 완성
- **Goals**: Domain entities/IVO 완성, application services 실제 연동, tRPC 타입안전 API 완성

## Summary

| Scope | Package/Path | Contents |
|-------|--------------|----------|
| domain | `packages/domain/*` | Entities, VO, IVO, error types via Zod |
| application | `packages/application/*` | *Service 실 구현, LLM 응답 Zod 검증 |
| api | `apps/api` | tRPC router, Bearer Auth, DI 컨테이너, 헬스체크 |

### 주요 변경 점

- 인증 우회 이슈 해결 (JWT 베어러 토큰)
- 스텁 응답 제거, 서비스 연결
- LLM JSON 검증 추가
- 개발 모드 ADMIN 자동 부여 정책 제거 (AUTH_DISABLED 기본 false)
- CORS_ORIGIN 검증 (credential 조합 부적합 차단)
- pino 기반 HTTP 요청 로깅, 헬스체크, 에러 매핑 (TypedError)

## Test & Review

- 204건 통과
- 단위, 통합 테스트 핵심 터널 리포지토리에 반영
- Secondary RedTeam 통과

## 전략

- B-4로 `ownership check`, `rate-limit` 추상화 이관 예정.

## How to Verify

```bash
pnpm install
pnpm test
pnpm build
```

## Checklist

- [x] 단위 테스트 통과
- [x] Lint 통과
- [x] 빌드 통과
- [x] Red Team 검증 완료
- [x] 문서 업데이트 완료

---

**PR 만든 사람**: Hermes agent (subagent for B-3 dev-loop-process)  
**날짜**: 2026-06-14
