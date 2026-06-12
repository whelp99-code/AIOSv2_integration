# AIOSv2 Integration 테스트 결과 분석 보고서

**분석 일시**: 2026-06-12 12:30 KST  
**분석 대상**: TEST_REPORT.md  
**작업 디렉토리**: /Users/jmpark/Documents/Playground/AIOSv2_integration

---

## Executive Summary

테스트 결과는 전반적으로 정확하나, **3가지 주요 문제점**이 발견되었습니다.  
가장 심각한 문제는 **프록시 라우트의 잘못된 백엔드 URL 구성**입니다.

---

## 1. 테스트 결과 정확성 검증

### ✅ 정확한 부분

| 항목 | 테스트 보고서 | 실제 확인 결과 |
|------|-------------|---------------|
| Mail Intelligence (3010) | ✅ 정상 | ✅ 정확함 |
| AIOS API Server (3200) | ✅ 정상 | ✅ 정확함 (`apps/api/src/index.ts:14`에서 확인) |
| AIOS Web Server (3300) | ✅ 정상 | ✅ 정확함 (`apps/web/package.json:6`에서 확인) |
| Approvals API | ✅ 3개 항목 반환 | ✅ 정확함 (인메모리 스토어 사용) |
| Outlook 프록시 | ✅ 44개 메일 | ✅ 정확함 |

### ⚠️ 불일치 발견

**포트 3100 관련 불일치:**
- 테스트 보고서: "AIOSv2 (지정된 포트) 3100 ❌ 미동작"
- `packages/shared/src/constants/ports.ts`: `WEB: 3100`으로 정의됨
- `apps/web/package.json`: `next dev -p 3300`으로 설정됨
- `.env.example`: `NEXTAUTH_URL=http://localhost:3100`

**결론**: 코드상 포트 설정이 불일치합니다.

---

## 2. 발견된 문제의 원인 분석

### 문제 1: 포트 구성 불일치 (Medium Severity)

**증상**: 
- 코드 상 `WEB: 3100`으로 정의되어 있으나, 실제 앱은 `3300`에서 실행됨

**근본 원인**:
```
packages/shared/src/constants/ports.ts
├── WEB: 3100      ← 코드 정의
├── API: 3200      ← 실제 실행 포트
└── LIGHT_RAG: 3300 ← 실제 Web 앱 포트 (LIGHT_RAG로 오인?)

apps/web/package.json
└── "dev": "next dev -p 3300"  ← 실제 실행 포트
```

**영향도**: 
- 테스트 파일 `tests/integration.test.ts:3`에서 `WEB_URL = 'http://localhost:3100'` 사용
- 포트 불일치로 테스트 실패 가능성

---

### 문제 2: 프록시 라트의 잘못된 백엔드 URL (Critical Severity)

**증상**: 
- `/api/customers`, `/api/partners`, `/api/workflows`, `/api/tasks` API 오류 발생
- 오류 메시지: "Failed to fetch customers", "Failed to fetch partners" 등

**근본 원인**:
```typescript
// apps/web/src/app/api/customers/route.ts:3
const AIOS_V1_URL = process.env.AIOS_V1_URL || 'http://localhost:3101'
//                                    ↑ 포트 3101로 설정됨
//                                    ↑ 실제 서버는 3200에서 실행 중
```

**영향받는 파일들**:
| 파일 | 문제 |
|------|------|
| `apps/web/src/app/api/customers/route.ts` | `http://localhost:3101`로 프록시 |
| `apps/web/src/app/api/partners/route.ts` | `http://localhost:3101`로 프록시 |
| `apps/web/src/app/api/workflows/route.ts` | `http://localhost:3101`로 프록시 |
| `apps/web/src/app/api/tasks/route.ts` | `http://localhost:3101`로 프록시 |
| `apps/web/src/app/api/plan/route.ts` | `http://localhost:3101`로 프록시 |
| `apps/web/src/app/api/github/route.ts` | `http://localhost:3101`로 프록시 |
| `apps/web/src/app/api/knowledge/route.ts` | `http://localhost:3101`로 프록시 |
| `apps/web/src/app/api/risk/route.ts` | `http://localhost:3101`로 프록시 |

**설명**: 
이 라우트들은 "AIOS v1"이라는 레거시 백엔드로 프록시하도록 설계되었으나,  
현재 환경에는 해당 서버가 존재하지 않습니다.  
실제 API 서버는 포트 `3200`에서 실행 중입니다.

---

### 문제 3: Approvals API의 인메모리 저장소 한계 (Low Severity)

**증상**: 
- Approvals API는 정상 동작
- 단, 서버 재시작 시 데이터 소실

**근본 원인**:
```typescript
// apps/web/src/app/api/approvals/route.ts:23
const approvals: Map<string, ApprovalRequest> = new Map()
// 인메모리 저장소 사용 (영구 저장소 아님)
```

**설명**: 
테스트에서는 정상 동작하나, 프로덕션 환경에서는 Prisma를 사용한 영구 저장소가 필요합니다.

---

## 3. 해결 방안 제시

### 해결 방안 1: 포트 구성 통일

**옵션 A: 상수 파일 업데이트 (권장)**
```typescript
// packages/shared/src/constants/ports.ts
export const PORTS = {
  WEB: 3300,        // 변경: 3100 → 3300
  API: 3200,
  LIGHT_RAG: 3300,  // 또는 LIGHT_RAG 포트 재정의 필요
  DASHBOARD: 3400,
  VOICE: 3500,
  LM_STUDIO: 1234
} as const
```

**옵션 B: 앱 포트 변경**
```json
// apps/web/package.json
"dev": "next dev -p 3100"
```

---

### 해결 방안 2: 프록시 라우트 URL 수정

**즉시 수정 (빠른 해결)**:
```typescript
// 모든 프록시 라우트에서 AIOS_V1_URL 변경
const AIOS_V1_URL = process.env.AIOS_V1_URL || 'http://localhost:3200'
//                                                                       ↑ 3101 → 3200
```

**장기적 해결 (권장)**:
프록시 라우트를 Prisma 기반 직접 구현으로 전환:

```typescript
// 예: apps/web/src/app/api/customers/route.ts (새로운 구현)
import { prisma } from '@aios/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  
  const customers = await prisma.customer.findMany({
    where: search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    } : undefined,
    include: { contacts: true }
  })
  
  return NextResponse.json({ customers })
}
```

---

### 해결 방안 3: 테스트 파일 포트 업데이트

```typescript
// tests/integration.test.ts
const WEB_URL = 'http://localhost:3300'  // 변경: 3100 → 3300
const API_URL = 'http://localhost:3200'
```

---

## 4. 최종 평가

### 점수: 75/100 (양호)

| 평가 항목 | 점수 | 비고 |
|-----------|------|------|
| 서버 구성 | 90/100 | Mail Intelligence, API, Web 서버 정상 |
| API 기능 | 60/100 | Approvals만 정상, 4개 API 프록시 실패 |
| 코드 품질 | 80/100 | 모놀리스 구조 우수, 포트 관리 미흡 |
| 테스트 커버리지 | 70/100 | 통합 테스트 존재하나 포트 불일치 |
| 문서화 | 80/100 | 테스트 보고서 상세, 설정 문서 보완 필요 |

### 강점 ✅
1. 모놀리스 모노레포 구조가 잘 구성됨 (Turborepo + pnpm)
2. Mail Intelligence 통합이 성공적으로 수행됨
3. Approvals API가 인메모리 저장소로 빠르게 구현됨
4. tRPC 기반 API 서버가 정상 동작

### 약점 ⚠️
1. 포트 설정이 코드 전반에 걸쳐 불일치
2. 레거시 AIOS v1 프록시 라우트가 실제 환경과 불일치
3. 데이터베이스 연결이 필요한 API가 Prisma를 사용하지 않음
4. 테스트 환경과 실제 실행 환경의 설정 차이

### 권장 우선순위

| 순위 | 작업 | 예상 소요 시간 |
|------|------|---------------|
| 1 | 프록시 라우트 URL 수정 (3101 → 3200) | 30분 |
| 2 | 포트 상수 통일 (3100 vs 3300) | 15분 |
| 3 | 테스트 파일 포트 업데이트 | 10분 |
| 4 | Prisma 기반 API 구현 (장기) | 2-3일 |

---

## 5. 추가 검증이 필요한 항목

1. **데이터베이스 연결 상태**
   ```bash
   # PostgreSQL 서버 실행 확인
   psql -h localhost -U user -d aios_v2 -c "SELECT 1"
   ```

2. **Prisma 마이그레이션 상태**
   ```bash
   pnpm db:generate
   pnpm db:push
   ```

3. **환경 변수 검증**
   ```bash
   # .env.local 파일 확인
   cat .env.local | grep -E "(DATABASE_URL|AIOS_V1_URL|MAIL_INTELLIGENCE_URL)"
   ```

---

**분석 완료**  
**다음 단계**: 해결 방안 1, 2, 3을 순차적으로 적용하고 테스트 재실행
