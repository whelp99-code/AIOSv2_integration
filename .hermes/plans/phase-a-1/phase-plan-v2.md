# Phase Plan v2 — AIOS v1 핵심 API 실구현 (개정)

> **Phase**: Phase A-1 AIOS v1 핵심 API 실구현  
> **작성일**: 2026-06-14  
> **상태**: Approved  
> **변경 사유**: Step 6 Red Team 검증 결과 반영

---

## 1. 목표

AIOS v1 핵심 API 레이어를 실제 코드로 구현하고,  
보안·아키텍처·품질·운영 리스크를 최소화한다.

## 2. 범위

### 포함
- `analyze`, `plan`, `risk` Routes (GET + POST)
- `commands` Route (POST executeCommand)
- 서비스 레이어 전체
- 승인 게이트, 액션 서비스, 커맨드 레지스트리
- Zod 스키마 및 통합 테스트

### 제외
- `/api/customers`, `/api/partners`, `/api/workflows` 라우트
- 기능 플래그 대시보드, 외부 캐시 인프라 (후속 Phase)

## 3. 아키텍처 (v2)

```
Client
 └─ Next.js Route
     └─ createGatedHandler (세션 인증 + 승인)
         └─ AiosV1ActionService
             ├─ 멱등성 캐시 (싱글톤)
             ├─ CommandRegistry (빌트인 화이트리스트)
             └─ UpstreamProxy
                 └─ AIOS v1 API
```

## 4. 실행 계획 (Step 0~11)

| Step | 이름 | 입출력 | 의존성 |
|------|------|--------|--------|
| 0 | 환경 정비 | `dev/phase-a-1` 브랜치 | 없음 |
| 1 | 계약 정의 | `aios-v1.schema.ts` | 없음 |
| 2 | 서비스 인터페이스 | TypeScript 인터페이스 | Step 1 |
| 3 | 핵심 로직 구현 | 구현 코드 + 단위 테스트 | Step 2 |
| 4 | 단위 테스트 | `tests/unit/...` | Step 3 |
| 5 | 통합 테스트 | `tests/integration/...` | Step 3 |
| 6 | Red Team 검증 | `red-team-review-v1.md` | Step 3 |
| 7 | 이슈 트라이에이지 | `fix-summary.md`, `fix 목록` | Step 6 |
| 8 | 리팩터링 | 수정 코드 | Step 7 |
| 9 | 재검증 | `red-team-final-review.md`, `secondary-redteam-review.md` | Step 8 |
| 10 | PR 오픈 + 머지 | `pr-description.md`, `push-result.md` | Step 9 |
| 11 | 모니터링/배포 가이드 | 배포 가이드, 런북 | Step 10 |

---

## 5. 품질/보안 체크리스트

### 보안 (P0)
- [ ] 모든 GET 엔드포인트 인증 적용
- [ ] `requestedBy` 서버사이드 검증
- [ ] 개발 모드 승인 게이트 명시 플래그 도입

### 성능/안전성
- [ ] 멱등성 캐시 통합 (미들웨어 또는 서비스 단일)
- [ ] `params` 스키마 화이트리스트 적용
- [ ] 에러 메시지 노출 최소화
- [ ] `not_found` status enum 정합성

### 품질
- [ ] GET 통합 테스트 추가
- [ ] 중복 Zod 검증 제거
- [ ] `command-registry 2.ts` 삭제

---

## 6. 리스크 대응

| 리스크 | 대응 |
|--------|------|
| 인메모리 캐시 서버리스 불일치 | Step 8에서 싱글톤 캐시로 통합, Redis는 Phase 2 |
| 레거시 명령어 과다 노출 | Step 7에서 `analyze/plan/risk`만 활성화 |
| 에러 메시지 노출 | Step 8에서 일반화 응답 패턴 적용 |
| 내부 URL 노출 | Step 8에서 응답에서 `aiosV1Url` 제거 |

## 7. 성공 기준

- [ ] 구현 코드 én-ty-end 검증 통과
- [ ] Red Team Critical 0건
- [ ] High 등급 이슈 5건 이하로 감소
- [ ] 전체 테스트 244건 통과 유지
- [ ] `git push` 성공 및 CI GREEN
