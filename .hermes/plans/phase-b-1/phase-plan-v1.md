# Track B Phase B-1: DB 마이그레이션

> **작성일**: 2026-06-14
> **목표**: AIOS v1/F-aios-v3 → 통합 DB 마이그레이션
> **대상**: AIOSv2_integration/packages/db/

---

## 📊 현재 상태 분석

### AIOS v1 DB
- **ORM**: Prisma 6
- **DB**: PostgreSQL
- **스키마**: User, Project, Task, AgentJob, Result, KanbanBoard 등 17개 모델

### F-aios-v3 DB
- **ORM**: Prisma 6
- **DB**: PostgreSQL
- **스키마**: Workflow, KnowledgeGraph, Monitoring 등

### AIOSv2 DB
- **ORM**: Prisma 6
- **DB**: PostgreSQL (포트 5434)
- **스키마**: 기존 17개 모델 + 통합 모델 필요

---

## 🎯 Phase B-1 목표

### 1차 목표: 통합 스키마 설계
- AIOS v1 + F-aios-v3 스키마 통합
- 중복 모델 제거
- 새 모델 추가 (Integration, Proxy 등)

### 2차 목표: 마이그레이션 스크립트
- 기존 데이터 마이그레이션
- 롤백 스크립트
- 검증 스크립트

### 3차 목표: Prisma 설정 통일
- 단일 Prisma Client
- 연결 풀링 설정
- 환경변수 통일

---

## 📋 구현 상세

### Task 1.1: 통합 스키마 설계

**Objective:** AIOS v1 + F-aios-v3 스키마 통합

**Files:**
- Modify: `packages/db/prisma/schema.prisma`

**Step 1: 기존 스키마 분석**

```prisma
// AIOS v1 모델
model User { ... }
model Project { ... }
model Task { ... }
model AgentJob { ... }
model Result { ... }
model KanbanBoard { ... }

// F-aios-v3 모델
model Workflow { ... }
model KnowledgeGraph { ... }
model Monitoring { ... }
```

**Step 2: 통합 스키마 작성**

```prisma
// 통합 스키마
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      Role     @default(OPERATOR)
  projects  Project[]
  tasks     Task[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  status      ProjectStatus @default(ACTIVE)
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  tasks       Task[]
  workflows   Workflow[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Task {
  id          String   @id @default(cuid())
  title       String
  description String?
  status      TaskStatus @default(PENDING)
  priority    Priority @default(MEDIUM)
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id])
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Workflow {
  id          String   @id @default(cuid())
  name        String
  description String?
  status      WorkflowStatus @default(DRAFT)
  projectId   String?
  project     Project? @relation(fields: [projectId], references: [id])
  steps       WorkflowStep[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model WorkflowStep {
  id          String   @id @default(cuid())
  name        String
  type        StepType
  config      Json?
  workflowId  String
  workflow    Workflow @relation(fields: [workflowId], references: [id])
  order       Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum Role {
  ADMIN
  OPERATOR
  VIEWER
}

enum ProjectStatus {
  ACTIVE
  ARCHIVED
  DELETED
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum WorkflowStatus {
  DRAFT
  ACTIVE
  COMPLETED
  FAILED
}

enum StepType {
  HTTP
  TRANSFORM
  CONDITION
  LOOP
}
```

**Step 3: Prisma 마이그레이션**

```bash
cd packages/db
pnpm prisma migrate dev --name add-workflow-models
```

**Step 4: 커밋**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "feat(db): add workflow models to unified schema"
```

---

### Task 1.2: 마이그레이션 스크립트

**Objective:** 기존 데이터 마이그레이션

**Files:**
- Create: `packages/db/scripts/migrate-v1.ts`
- Create: `packages/db/scripts/migrate-v3.ts`
- Create: `packages/db/scripts/rollback.ts`

**Step 1: AIOS v1 마이그레이션 스크립트**

```typescript
// packages/db/scripts/migrate-v1.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateV1() {
  console.log('Starting AIOS v1 migration...');
  
  // 기존 데이터 조회
  const v1Users = await prisma.user.findMany();
  const v1Projects = await prisma.project.findMany();
  const v1Tasks = await prisma.task.findMany();
  
  console.log(`Found ${v1Users.length} users, ${v1Projects.length} projects, ${v1Tasks.length} tasks`);
  
  // 데이터 변환 및 저장
  for (const user of v1Users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role as any },
      create: {
        email: user.email,
        name: user.name,
        role: user.role as any,
      },
    });
  }
  
  console.log('AIOS v1 migration completed.');
}

migrateV1()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Step 2: 롤백 스크립트**

```typescript
// packages/db/scripts/rollback.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function rollback() {
  console.log('Starting rollback...');
  
  await prisma.workflowStep.deleteMany();
  await prisma.workflow.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  
  console.log('Rollback completed.');
}

rollback()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Step 3: 커밋**

```bash
git add packages/db/scripts/
git commit -m "feat(db): add migration and rollback scripts"
```

---

### Task 1.3: Prisma 설정 통일

**Objective:** 단일 Prisma Client 설정

**Files:**
- Modify: `packages/db/src/client.ts`
- Modify: `packages/db/src/index.ts`

**Step 1: Prisma Client 통일**

```typescript
// packages/db/src/client.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**Step 2: 연결 풀링 설정**

```prisma
// schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// 연결 풀링 설정
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  relationMode = "prisma"
}
```

**Step 3: 커밋**

```bash
git add packages/db/
git commit -m "feat(db): unify Prisma client with connection pooling"
```

---

## 📋 검증 기준

### ✅ 완료 조건

1. **통합 스키마**
   - AIOS v1 + F-aios-v3 모델 통합
   - Prisma 마이그레이션 성공

2. **마이그레이션 스크립트**
   - 기존 데이터 마이그레이션 성공
   - 롤백 스크립트 동작

3. **Prisma 설정**
   - 단일 Prisma Client
   - 연결 풀링 설정

4. **테스트 통과**
   - pnpm test 통과
   - pnpm typecheck 통과

---

## 📅 타임라인

| Task | 내용 | 기간 | 상태 |
|------|------|------|------|
| 1.1 | 통합 스키마 설계 | 0.5일 | ⏸️ 대기 |
| 1.2 | 마이그레이션 스크립트 | 0.5일 | ⏸️ 대기 |
| 1.3 | Prisma 설정 통일 | 0.25일 | ⏸️ 대기 |

**총 예상 기간: 1.25일**

---

## ⚠️ 리스크

1. **데이터 손실** - 마이그레이션 전 백업 필수
2. **스키마 충돌** - 중복 모델 주의
3. **연결 문제** - PostgreSQL 연결 확인

---

## 🎯 성공 기준

1. ✅ 통합 스키마 마이그레이션 성공
2. ✅ 기존 데이터 마이그레이션 성공
3. ✅ Prisma Client 통일
4. ✅ 모든 테스트 통과
