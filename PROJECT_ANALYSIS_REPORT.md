# AIOSv2_integration 프로젝트 분석 보고서

> 분석일: 2026-06-12
> 프로젝트 경로: `/Users/jmpark/Documents/Playground/AIOSv2_integration`

---

## 1. 프로젝트 개요

**AIOS v2 Integration**은 5개의 분리된 프로젝트를 하나의 **모놀리식 모노레포**로 통합한 AIOS 통합 플랫폼입니다.

### 통합 대상 프로젝트
| 원본 프로젝트 | 통합된 기능 |
|---|---|
| AIOS v1 | Mail Intelligence, User Management |
| F-aios-v3-core | Workflow Engine, Monitoring |
| sangfor-mcp-workflow | MCP Integration, Security Policies |
| vibe-coding-os | Learning System, RAG, Agent Framework |
| AIOS-JARVIS | Voice Interface, LM Studio Integration |

---

## 2. 기술 스택

| 계층 | 기술 |
|---|---|
| **모노레오 관리** | Turborepo 2.0 + pnpm 10 (workspace) |
| **프론트엔드** | Next.js 16, React 19, shadcn/ui, Tailwind CSS |
| **API 서버** | Express 4, tRPC 11 |
| **데이터베이스** | PostgreSQL + Prisma 6 ORM |
| **LLM** | OpenAI SDK, Anthropic SDK, LM Studio (로컬) |
| **RAG** | LightRAG, pgvector |
| **모니터링** | Langfuse |
| **인증** | NextAuth 5 (beta) + GitHub OAuth + Prisma Adapter |
| **캐싱** | Redis (ioredis) |
| **VCS 연동** | Octokit (GitHub REST API) |
| **테스트** | Vitest 3, Playwright |
| **언어** | TypeScript 5.5, Node.js >= 20 |
| **CI/CD** | GitHub Actions |

---

## 3. 데이터베이스

- **PostgreSQL** (기본 DB)
  - 연결 문자열: `postgresql://user:***@localhost:5432/aios_v2`
  - ORM: Prisma 6 (`@aios/db` 패키지)
  - pgvector 확장 사용 (RAG 벡터 검색용)
- **Redis** (캐싱/큐)
  - `ioredis` 사용 (infrastructure 패키지에 포함)

---

## 4. 포트 번호

| 서비스 | 포트 | 설명 |
|---|---|---|
| Web UI (Next.js) | **3300** | `next dev -p 3300` (package.json 기준) |
| API Server | **3200** | Express/tRPC |
| LightRAG | **3300** | FastAPI (README 기준, 웹과 충돌 가능) |
| Dashboard | **3400** | Static HTML |
| JARVIS Voice | **3500** | Python |
| LM Studio | **1234** | 외부 LLM 서버 |

> ⚠️ README의 포트 할당표와 실제 `apps/web/package.json`의 `dev` 스크립트가 다릅니다.
> - README: Web UI = 3100, LightRAG = 3300
> - 실제 package.json: Web UI = 3300 (`next dev -p 3300`)

---

## 5. 현재 실행 상태

| 포트 | 상태 |
|---|---|
| 3100 | ❌ 미실행 |
| 3200 | ❌ 미실행 |
| 3300 | ❌ 미실행 |
| 3400 | ❌ 미실행 |
| 3500 | ❌ 미실행 |

**→ 현재 모든 서비스가 중지 상태입니다.**

단, `node` 프로세스가 `opcon-xps` 포트에서 LISTEN 중이나 이는 다른 프로세스로 보입니다.

---

## 6. 주요 기능

### 6.1 UI 페이지 (Next.js App Router)
| 경로 | 기능 |
|---|---|
| `/` | 메인 페이지 |
| `/dashboard` | 대시보드 |
| `/mail` | 메일 관리 (AI 메일 분석) |
| `/workflows` | 워크플로우 관리 |
| `/kanban` | 칸반 보드 (태스크 관리) |
| `/sangfor` | Sangfor 보안 정책 관리 |
| `/settings` | 설정 |
| `/auth/signin` | 로그인 |

### 6.2 핵심 도메인 기능
- **Mail Intelligence** — AI 기반 메일 분석/요약
- **Workflow Engine** — 자동화 워크플로우 실행
- **RAG** — 지식 검색 (LightRAG + pgvector)
- **Agent Framework** — AI 에이전트 실행 (BaseAgent 패턴)
- **Self-Learning** — 자기 학습 시스템
- **MCP Integration** — Model Context Protocol 연동
- **GitHub Automation** — PR 자동화, 브랜치 관리
- **Kanban** — 태스크/워크플로우 칸반 보드
- **Monitoring** — Langfuse 기반 메트릭/모니터링

---

## 7. API 엔드포인트

### 7.1 Next.js API Routes (`apps/web/src/app/api/`)
| 경로 | 기능 |
|---|---|
| `/api/auth/[...nextauth]` | NextAuth 인증 |
| `/api/workflows` | 워크플로우 CRUD |
| `/api/tasks` | 태스크 관리 |
| `/api/mail` (tRPC) | 메일 관련 API |
| `/api/customers` | 고객 관리 |
| `/api/partners` | 파트너 관리 |
| `/api/knowledge` | 지식 베이스 |
| `/api/github` | GitHub 연동 |
| `/api/commands` | 명령어 실행 |
| `/api/analyze` | AI 분석 |
| `/api/plan` | 계획 수립 |
| `/api/risk` | 리스크 분석 |
| `/api/approvals` | 승인 관리 |
| `/api/automation` | 자동화 |
| `/api/proxy/outlook/messages` | Outlook 메일 프록시 |
| `/api/proxy/outlook/status` | Outlook 상태 프록시 |
| `/api/aios-v3/health` | v3 헬스체크 |
| `/api/aios-v3/workflows` | v3 워크플로우 |
| `/api/aios-v3/knowledge` | v3 지식 |

### 7.2 tRPC 라우터 (`apps/api/src/routers/`)
| 라우터 | 기능 |
|---|---|
| `mail` | 메일 관련 RPC |
| `workflow` | 워크플로우 RPC |
| `sangfor` | Sangfor 보안 RPC |
| `coding` | 코딩 어시스턴트 RPC |

---

## 8. 패키지 구조

```
AIOSv2_integration/
├── apps/                          # 애플리케이션
│   ├── web/                       # @aios/web — Next.js 16 UI (:3300)
│   └── api/                       # @aios/api — Express + tRPC 서버 (:3200)
│
├── packages/                      # 공유 패키지 (DDD 계층)
│   ├── shared/                    # @aios/shared — 타입, 유틸, 상수
│   ├── ui/                        # @aios/ui — UI 컴포넌트 (shadcn 스타일)
│   ├── db/                        # @aios/db — Prisma ORM (PostgreSQL)
│   ├── domain/                    # @aios/domain — 도메인 모델
│   │   ├── mail/                  # @aios/domain/mail
│   │   ├── workflow/              # @aios/domain/workflow
│   │   ├── coding/                # @aios/domain/coding
│   │   └── sangfor/               # @aios/domain/sangfor
│   ├── application/               # @aios/application — 애플리케이션 서비스
│   │   ├── mail/                  # @aios/application/mail
│   │   ├── workflow/              # @aios/application/workflow
│   │   ├── coding/                # @aios/application/coding
│   │   └── sangfor/               # @aios/application/sangfor
│   └── infrastructure/            # @aios/infrastructure — 인프라 어댑터
│       ├── llm/                   # OpenAI, Anthropic, LM Studio
│       ├── rag/                   # LightRAG, pgvector
│       ├── mcp/                   # MCP 프로토콜
│       ├── memory/                # 대화 메모리
│       ├── agents/                # AI 에이전트 베이스
│       ├── learning/              # 자기 학습 시스템
│       ├── monitoring/            # Langfuse 메트릭
│       ├── sandbox/               # 프로세스 샌드박스
│       ├── storage/               # 로컬 스토리지
│       ├── workflow/              # 워크플로우 엔진/스케줄러
│       └── github/                # Octokit 기반 GitHub 연동
│
├── plugins/                       # 플러그인 시스템
│   ├── plugin-core/               # @aios/plugin-core — 플러그인 레지스트리/로더
│   └── mail-plugin/               # @aios/mail-plugin — 메일 플러그인
│
├── tools/                         # 개발 도구
├── tests/                         # 통합 테스트 (Vitest)
├── scripts/                       # 스크립트 (start, stop, extract-customers)
├── docs/                          # 문서 (6단계 개발 phases, 보고서)
└── .aios/                         # AIOS 태스크/칸반 관리
```

---

## 9. 연결 관계 (외부 서비스)

| 외부 서비스 | 연결 방식 | 용도 |
|---|---|---|
| **PostgreSQL** | Prisma ORM | 메인 데이터베이스 |
| **Redis** | ioredis | 캐싱/큐 |
| **GitHub** | Octokit REST API | PR 자동화, 브랜치 관리 |
| **OpenAI** | openai SDK | LLM API |
| **Anthropic** | @anthropic-ai/sdk | Claude LLM API |
| **LM Studio** | axios (localhost:1234) | 로컬 LLM 추론 |
| **LightRAG** | axios (:3300) | RAG 검색 |
| **Langfuse** | axios | LLM 모니터링/트레이싱 |
| **Outlook** | 프록시 API | 메일 연동 |
| **NextAuth/GitHub OAuth** | next-auth | 사용자 인증 |

---

## 10. 개발 단계 (Phase)

프로젝트는 6단계로 개발이 진행되었습니다:
1. **Phase 1** — Repo Baseline & Workspace 설정
2. **Phase 2** — Core Workflow Domain & Application
3. **Phase 3** — Agent Runtime (Hermes/OpenCode)
4. **Phase 4** — GitHub PR Automation
5. **Phase 5** — Kanban Integration
6. **Phase 6** — Final Integration & Gap Analysis

---

## 11. 요약

| 항목 | 값 |
|---|---|
| 프로젝트명 | AIOS v2 Integration |
| 타입 | 모놀리식 모노레포 (Turborepo + pnpm) |
| 프레임워크 | Next.js 16 + Express + tRPC |
| 데이터베이스 | PostgreSQL (Prisma) + Redis |
| LLM | OpenAI + Anthropic + LM Studio |
| 웹 포트 | 3300 (실제), 3100 (문서) |
| API 포트 | 3200 |
| 현재 상태 | 🔴 전체 중지 |
| 패키지 수 | 앱 2개 + 패키지 약 20개 + 플러그인 2개 |
| 주요 기능 | 메일 AI, 워크플로우, RAG, 에이전트, 칸반, GitHub 자동화 |
