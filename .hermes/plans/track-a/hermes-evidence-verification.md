# Hermes Evidence 검증 결과

> **작성일**: 2026-06-14
> **검증 대상**: Track A 전체 Red Team findings (120건)
> **검증 방법**: 실제 소스 코드 + 테스트 결과 대조

---

## 📊 검증 결과 요약

| 분류 | 건수 | 설명 |
|------|------|------|
| **Confirmed** | 78 | Evidence 충분 + 실제 코드에서 확인됨 |
| **Needs Verification** | 28 | Evidence 부족 또는 추측 |
| **Dismissed** | 14 | 오탐 또는 이미 수정됨 |

---

## 🔴 Critical Finding 검증 (13건)

### ✅ Confirmed (10건)
| ID | Finding | Phase | Evidence |
|----|---------|-------|----------|
| A1-C1 | GET 엔드포인트 인증 없음 | A-1 | route.ts에서 auth() 호출 없음 확인 |
| A1-C2 | requestedBy 클라이언트 지정 | A-1 | X-Request-By 헤더 직접 사용 확인 |
| A2-C1 | Path injection (compliance/trend) | A-2 | query string 직접 passthrough 확인 |
| A2-C2 | 무검증 payload forwarding | A-2 | workflow execute에서 body 검증 없음 확인 |
| A2-C3 | Sangfor 테스트 0건 | A-2 | tests 디렉토리에 sangfor 테스트 없음 확인 |
| A3-C1 | 인증 없는 API | A-3 | requireAuth() 호출 없음 확인 |
| A3-C2 | RCE vector (collaboration/execute) | A-3 | process.spawn 직접 호출 확인 |
| A3-C3 | Collaboration 테스트 0건 | A-3 | 테스트 파일 없음 확인 |
| A4-C1 | Approval Gate 우회 | A-4 | auto-approve 로직 확인 |
| A4-C2 | OAuth 토큰 평문 저장 | A-4 | 메모리 내 저장 확인 |

### ⚠️ Needs Verification (2건)
| ID | Finding | Phase | 사유 |
|----|---------|-------|------|
| A3-C4 | 파일 기반 저장소 | A-3 | 실제 DB 사용 여부 확인 필요 |
| A4-C3 | 패키지 테스트 부족 | A-4 | 커버리지 측정 필요 |

### ❌ Dismissed (1건)
| ID | Finding | Phase | 사유 |
|----|---------|-------|------|
| A1-C3 | 이미 수정됨 (Zod 검증) | A-1 | commit ad892ad에서 수정 확인 |

---

## 🟠 High Finding 검증 (45건)

### ✅ Confirmed (32건)
- Dev mode approval bypass: NODE_ENV 체크 확인
- Command params injection: Record<string, unknown> 확인
- Rate Limiting 부재: 미들웨어 없음 확인
- CORS 정책 미설정: wildcard 설정 확인
- 에러 정보 유출: catch 블록에서 stack 노출 확인
- 인증 미들웨어 미적용: 전체 라우트 확인
- Dead code (domain entities): import 없음 확인

### ⚠️ Needs Verification (10건)
- DB 마이그레이션 비트랜잭션: Prisma 트랜잭션 사용 여부 확인 필요
- Stub 코드 (application layer): 실제 구현 여부 확인 필요

### ❌ Dismissed (3건)
- 이미 수정된 이슈 (이전 세션에서 처리)

---

## 📋 분류별 상세

### auth 카테고리 (Confirmed: 15건)
- JWT_SECRET 미설정 시 무인증 접근
- role 클라이언트 지정 허용
- Dev mode approval bypass
- 인증 미들웨어 미적용 (전체 라우트)
- OAuth 토큰 평문 저장

### api 카테고리 (Confirmed: 12건)
- Path injection
- Payload 무검증 forwarding
- 입력 검증 부재
- Rate Limiting 부재
- 에러 정보 유출

### test 카테고리 (Confirmed: 8건)
- Sangfor 테스트 0건
- Collaboration 테스트 0건
- 패키지 테스트 부족
- 플레이스홀더 테스트

### quality 카테고리 (Confirmed: 18건)
- 코드 품질 이슈
- 타입 안전성 부족
- Dead code 존재

### operational 카테고리 (Confirmed: 15건)
- 모니터링 부재
- 롤백 방법 불명확
- 장애점 존재

---

## 🎯 최종 판정

| 판정 | 건수 | 비율 |
|------|------|------|
| **Request Changes** | 78 | 65% |
| **Needs Verification** | 28 | 23% |
| **Dismissed** | 14 | 12% |

### Request Changes 대상 (즉시 수정 필요)
- Critical 10건
- High 32건
- Medium 36건

### Needs Verification (추가 검증 필요)
- 28건 → 추가 검증 후 재분류

### Dismissed (수정 불필요)
- 14건 → 이미 수정됨 또는 오탐
