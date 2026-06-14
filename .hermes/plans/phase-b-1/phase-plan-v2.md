# Track B Phase B-1: DB 마이그레이션 (Plan v2)

> **작성일**: 2026-06-14
> **목표**: AIOS v1/F-aios-v3 → 통합 DB 마이그레이션
> **대상**: AIOSv2_integration/packages/db/
> **전제**: Red Team Review v1 피드백 반영

---

## 📊 변경 사항 요약 (v1 vs v2)

| 변경 항목 | v1 문제점 | v2 해결 |
|---------|---------|---------|
| 스키마 중복 | `schema 2.prisma` 병합 충돌 잔여 파일 존재 | `schema 2.prisma` 삭제 |
| 트랜잭션 | 마이그레이션 루프에 트랜잭션 미적용 | `$transaction()` / chunked 배치 적용 |
| 롤백 | userId를 `''`(empty string)으로 설정 | 원본 userId 복원 로직으로 변경 |
| 상태 정규화 | archived/paused → active로 매핑 | 의미 보존 매핑으로 변경 (draft→draft, paused→paused, running→active, archived→completed) |
| 보안 | OAuth 토큰 평문 저장 | 애플리케이션 레벨 암호화 적용 (AES-256-GCM) |
| 테넌트 격리 | userId 필터 누락 시 전체 노출 | Prisma 미들웨어 자동 주입 |
| 테스트 | 테스트 파일 0건 | 마이그레이션/롤백 통합 테스트 추가 |
| 백업 | 백업 스크립트 없음 | pre-migration backup 스크립트 추가 |
| 로깅 | emoji 로그 / 불완전 | pino 구조화 로그 도입 |
| 잠금 | 동시 실행 방지 없음 | PostgreSQL advisory lock 추가 |

---

## 🎯 Phase B-1 목표

### 1차 목표: 통합 스키마 설계
- AIOS v1 + F-aios-v3 스키마 통합
- 중복/충돌 파일 정리
- 새 모델 추가 (AgentJob↔Task relation, LearningData↔User relation 등)
- 일관된 테이블 네이밍 (`@@map` snake_case)

### 2차 목표: 안전한 마이그레이션 스크립트
- 트랜잭션 보장 배치 마이그레이션
- dry-run / confirm 모드
- 롤백 시 원본 데이터 복원
- 백업/복원 스크립트

### 3차 목표: 견고한 Prisma 설정
- 단일 Prisma Client + 연결 풀링
- 테넌트 필터 미들웨어
- 다중 DB 제공자 대응 (dev: SQLite, prod: PostgreSQL)

---

## 📋 구현 상세

### Task 1.1: 충돌 파일 정리 및 통합 스키마 수정

**Objective:** `schema 2.prisma` 제거 및 스키마 결함 수정

**Step 1:** `packages/db/prisma/schema 2.prisma` 삭제 (git rm)
**Step 2:** `schema.prisma`에 누락 리네이션 추가:
- `AgentJob.task Task @relation(fields: [taskId], references: [id])`
- `LearningData.user User @relation(fields: [userId], references: [id])`
**Step 3:** 모든 모델에 `@@map("snake_case")` 추가
**Step 4:** 마이그레이션 실행 및 커밋

### Task 1.2: 안전한 마이그레이션 스크립트 (트랜잭션 + 배치 + 백업)

**Objective:** Red Team R1/A2/O1 대응

**Files:**
- Create: `packages/db/scripts/backup.ts`
- Modify: `packages/db/scripts/migrate-v1.ts`
- Modify: `packages/db/scripts/migrate-v3.ts`
- Modify: `packages/db/scripts/rollback.ts`

**주요 변경:**
- `prisma.$transaction()` 으로 각 마이그레이션 단위 래핑
- 청크 단위 배치 (CHUNK_SIZE=500)
- dry-run, confirm 플래그
- migration_metadata 테이블에 원본 userId 저장
- 롤백 시 migration_metadata 참조로 원래 상태 복원
- 에러 발생 시 non-zero exit code

### Task 1.3: 보안 강화 (토큰 암호화 + 테넌트 필터)

**Objective:** Red Team S1/S2 대응

**Files:**
- Create: `packages/db/src/middleware/tenant.ts`
- Create: `packages/db/src/middleware/encryption.ts`
- Modify: `packages/db/src/client.ts`

**주요 변경:**
- `refresh_token`, `access_token`, `id_token` 필드 암호화 후 저장
- 모든 `findMany/findUnique/findFirst` 호출에 자동 userId 필터 주입
- 운영 환경에서 PostgreSQL RLS 정책 추가

### Task 1.4: 관측성 (구조화 로그 + 잠금)

**Objective:** Red Team O2/O3/O4 대응

**주요 변경:**
- pino 기반 구조화 로그
- PostgreSQL advisory lock (`pg_advisory_lock`) 기반 동시 실행 방지
- 연결 헬스체크 (`$connect()` + 재시도)

### Task 1.5: 상태 정규화 의미 보존

**Objective:** Red Team A3 대응

**변경:**
- `normalizeWorkflowStatus()` 매핑 정정:
  - `draft` → `draft`
  - `paused` → `paused` (추가)
  - `running` → `active`
  - `archived` → `completed` (추가)
- `WorkflowStatus` enum에 `PAUSED`, `COMPLETED` 추가

---

## ✅ 완료 조건 (Updated)

1. **통합 스키마**
   - 충돌 파일 제거
   - 모든 모델 FK/@@map 정비
   - 마이그레이션 성공

2. **마이그레이션 스크립트**
   - 트랜잭션 + 배치 처리
   - dry-run/confirm 지원
   - 롤백 시 원본 복원
   - 백업 스크립트 존재

3. **보안/운영**
   - OAuth 토큰 암호화
   - 테넌트 자동 필터 미들웨어
   - 구조화 로그 + 잠금 메커니즘

4. **테스트**
   - 마이그레이션/롤백 통합 테스트 통과
   - `pnpm test` 100% 통과
   - `pnpm typecheck` 통과

---

## 📅 타임라인

| Task | 내용 | 기간 | 상태 |
|------|------|------|------|
| 1.1 | 충돌 파일 정리 및 스키마 수정 | 0.5일 | 대기 |
| 1.2 | 안전한 마이그레이션/롤백 스크립트 | 0.75일 | 대기 |
| 1.3 | 보안 강화 (암호화, 테넌트 격리) | 0.5일 | 대기 |
| 1.4 | 관측성 (로깅, 잠금) | 0.25일 | 대기 |
| 1.5 | 상태 정규화 의미 보존 | 0.25일 | 대기 |

**총 예상 기간: 2.25일**

---

## ⚠️ 리스크 (Updated)

1. **데이터 손실** — 백업 필수 + dry-run
2. **스키마 충돌** — 충돌 파일 사전 제거
3. **연결 문제** — 헬스체크 + 재시도 로직
4. **암호화 키 관리** — 운영 환경 secrets vault 필수
