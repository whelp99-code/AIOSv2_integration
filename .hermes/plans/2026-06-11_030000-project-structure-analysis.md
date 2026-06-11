# Playground 프로젝트 전체 구조 분석

> **작성일**: 2026-06-11
> **목적**: 모든 프로젝트의 구조를 체계적으로 정리

---

## 📊 전체 프로젝트 현황

| 프로젝트 | 위치 | 포트 | 상태 | 설명 |
|----------|------|------|------|------|
| **AIOS v1** | ~/Playground/AIOS v1 | 3101 | ✅ | 메인 엔진, 30개 API |
| **AIOSv2 Integration** | ~/Playground/AIOSv2_integration | 3100 | ✅ | 통합 플랫폼 |
| **F-aios-v3-core** | ~/Playground/F - aios-v3-core | - | ✅ | 16개 패키지 |
| **Mail Intelligence** | ~/Playground/apps/mail-intelligence | 10200 | ✅ | Outlook 연동 |
| **Sangfor MCP** | ~/Playground/sangfor-mcp-workflow | 3500 | ✅ | 보안 워크플로우 |
| **AIOS-JARVIS** | ~/Playground/AIOS-JARVIS | - | ✅ | 음성 어시스턴트 |
| **Vibe Coding OS** | ~/Playground/vibe-coding-os | 4000 | ✅ | 개발 워크플로우 |

---

## 1. AIOS v1 (메인 엔진)

**위치**: ~/Documents/Playground/AIOS v1
**포트**: 3101
**아키텍처**: Turborepo + pnpm 모노레포

### 패키지 구조
```
packages/
├── automation/    # 자동화 로직
├── db/            # Prisma ORM
├── mail-intelligence/  # 메일 분석
└── shared/        # 공유 타입
```

### API 엔드포인트 (30개)
| API | 기능 | 메서드 |
|-----|------|--------|
| /api/mail-import | 메일 가져오기 | POST |
| /api/mail-candidates | 메일 후보 | GET/POST |
| /api/mail-insight-threads | 메일 스레드 | GET/POST |
| /api/customers | 고객 관리 | CRUD |
| /api/partners | 파트너 관리 | CRUD |
| /api/workflows | 워크플로우 | GET/POST |
| /api/knowledge | 지식 베이스 | GET/POST |
| /api/github | GitHub 연동 | GET |
| /api/automation | 자동화 | GET/POST |
| /api/approvals | 승인 관리 | GET/POST |
| /api/tasks | 태스크 관리 | CRUD |
| /api/opportunities | 기회 관리 | CRUD |
| /api/proposals | 제안 관리 | CRUD |
| /api/modules | 모듈 관리 | GET/POST |
| /api/connectors | 커넥터 | GET/POST |
| /api/contacts | 연락처 | GET/POST |
| /api/improvements | 개선 사항 | GET/POST |
| /api/poc | PoC 관리 | GET/POST |
| /api/portal | 포탈 | GET |
| /api/validation | 검증 | GET/POST |
| /api/daily-report | 일일 리포트 | GET |
| /api/aios-v3 | F-aios-v3 연동 | GET/POST |
| /api/aios-v3-status | F-aios-v3 상태 | GET |
| /api/commands | 명령어 | GET/POST |
| /api/auth | 인증 | GET/POST |
| /api/health | 헬스 체크 | GET |
| /api/dev | 개발 도구 | GET |
| /api/ops | 운영 도구 | GET |
| /api/actions | 액션 | GET/POST |
| /api/policy-memories | 정책 메모리 | GET/POST |

---

## 2. AIOSv2 Integration (통합 플랫폼)

**위치**: ~/Documents/Playground/AIOSv2_integration
**포트**: 3100
**아키텍처**: 모놀리스 모노레포 (Turborepo + pnpm)

### 패키지 구조
```
packages/
├── domain/        # 도메인 모델 (13개 파일)
│   ├── models/    # Project, Task, AgentJob 등
│   └── kanban/    # 칸반 보드 모델
├── application/   # 비즈니스 로직 (16개 파일)
│   ├── agents/    # 에이전트 역할
│   ├── kanban/    # 칸반 서비스
│   ├── services/  # 코어 워크플로우
│   └── use-cases/ # 유스케이스
├── infrastructure/ # 인프라 (8개 파일)
│   └── github/    # GitHub 연동 (Octokit)
├── shared/        # 공유 타입 (9개 파일)
├── ui/            # UI 컴포넌트 (1개 파일)
└── db/            # Prisma DB (2개 파일)
```

### API 엔드포인트
| API | 기능 | 상태 |
|-----|------|------|
| /api/proxy/outlook/status | Outlook 상태 | ✅ 프록시 |
| /api/proxy/outlook/messages | 메일 목록 | ✅ 프록시 |
| /api/analyze | 분석 | ❌ 가짜 데이터 |
| /api/commands | 명령어 | ❌ 가짜 데이터 |
| /api/plan | 계획 | ❌ 가짜 데이터 |
| /api/risk | 리스크 | ❌ 가짜 데이터 |
| /api/github | GitHub | ❌ 가짜 데이터 |
| /api/auth/[...nextauth] | 인증 | ✅ NextAuth.js |

### 통합 구조
```
AIOSv2 (3100) → /api/proxy/outlook/* → Mail Intelligence (10200) → Outlook
```

---

## 3. F-aios-v3-core (보조 패키지)

**위치**: ~/Documents/Playground/F - aios-v3-core
**아키텍처**: Turborepo + pnpm 모노레포

### 16개 패키지
| 패키지 | 기능 |
|--------|------|
| a2a | Agent-to-Agent 프로토콜 |
| ag-ui | 실시간 UI 스트리밍 |
| ai-core | AI 코어 엔진 |
| benchmark | 성능 벤치마크 |
| core | 코어 패키지 |
| evolution | 스킬 자기 진화 |
| hyperagents | 메타 인지 에이전트 |
| karpathy-loop | 자동 학습 루프 |
| knowledge-graph | 지식 그래프 |
| lightrag | RAG 시스템 |
| mcp-adapters | MCP 어댑터 |
| monitoring | 관측성 시스템 (Langfuse) |
| orchestrator | 오케스트레이터 |
| sandbox | Docker 샌드박스 |
| self-evolution | 자기 진화 |
| workflow | 워크플로우 엔진 (Mastra) |

---

## 4. Mail Intelligence

**위치**: ~/Documents/Playground/apps/mail-intelligence
**포트**: 10200
**기술 스택**: Node.js ESM, Vanilla JS

### 파일 구조
```
├── server.mjs         # 메인 서버 (1,275줄)
├── app.js             # 프론트엔드 (732줄)
├── src/analyzer.js    # 분석 엔진 (312줄)
├── .outlook-config.json  # Outlook 설정
├── .mail-cache.json   # 메일 캐시
└── data/              # 데이터 디렉토리
```

### API 엔드포인트
| API | 기능 | 메서드 |
|-----|------|--------|
| /api/outlook/status | Outlook 연결 상태 | GET |
| /api/outlook/config | 설정 | GET/POST |
| /api/outlook/messages | 메일 목록 | GET |
| /api/outlook/analyze | 메일 분석 | GET |
| /api/outlook/send | 메일 발송 | POST |
| /api/outlook/read | 읽음 처리 | POST |
| /api/outlook/feedback | 피드백 | POST |
| /api/outlook/oauth/start | OAuth 시작 | GET |

### 분석 엔진 (analyzer.js)
- **메일 텍스트 파싱** → tasks 생성
- **상태 분류**: urgent/active/waiting/done
- **일정 추출** → calendar
- **리마인더 생성** → reminders
- **다음 액션 추천** → nextActions
- **메일별 인사이트** → messageInsights
- **회신 시나리오** → 3가지 자동 생성

### AI 프로바이더 (하이브리드)
```
1차: F-AIOS-v3 (localhost:3200)
    ↓ 실패 시
2차: LM Studio (localhost:1234)
    ↓ 실패 시
3차: Gemini API (API 키 필요)
```

---

## 5. Sangfor MCP Workflow

**위치**: ~/Documents/Playground/sangfor-mcp-workflow
**포트**: 3500
**아키텍처**: pnpm 모노레포

### 디렉토리 구조
```
├── apps/
│   ├── mcp-server/        # MCP stdio JSON-RPC 서버
│   └── operator-console/  # 웹 UI + REST API
├── packages/
│   ├── workflow-core/     # 워크플로우 엔진
│   ├── health-checker/    # 실장비 점검
│   ├── wiki-sync/         # Obsidian 동기화
│   └── shared/            # 공통 타입
└── tests/
```

### 3대 핵심 워크플로우
1. **프로젝트 올인원**: Excel → 가이드 → 검증 → 보고서
2. **실장비 일상 점검**: 정기 정책 상태 확인 + 이상 감지
3. **Obsidian 연동**: 피드백 → 교훈 → 위키 자동 반영

### 실장비
- EPP: 10.80.1.106
- IAG: 10.80.1.108
- CC: 10.80.1.107

---

## 6. AIOS-JARVIS

**위치**: ~/Documents/Playground/AIOS-JARVIS
**기술 스택**: Python

### 파일 구조
```
├── main.py              # 엔트리포인트
├── core/
│   ├── jarvis.py        # JARVIS 코어
│   ├── llm.py           # LLM 연동 (LM Studio)
│   ├── tts.py           # TTS (Edge TTS)
│   ├── stt.py           # STT (Faster Whisper)
│   └── wakeword.py      # 웨이크 워드 (openWakeWord)
├── tools/
│   ├── screen_ocr.py    # 화면 OCR
│   ├── location.py      # 위치 정보
│   ├── computer_control.py  # 컴퓨터 제어
│   └── web_search.py    # 웹 검색
├── memory/
│   ├── conversation.py  # 대화 메모리
│   └── knowledge_graph.py  # 지식 그래프 (NetworkX)
└── config/
    └── settings.py      # 설정
```

### 실행 방법
```bash
python3 main.py          # 텍스트 모드
python3 main.py --voice  # 음성 모드
```

---

## 7. Vibe Coding OS

**위치**: ~/Documents/Playground/vibe-coding-os
**포트**: 4000
**상태**: v6.0 진행 중, Phase 1~4 (44/48 PR)

### 특징
- 블루프린트/개발계획서: ~/dev-team/docs/
- 원칙: 오픈소스 80% + 커스텀 20%
- AQFAS 아키텍처
- Phase 5 (안정화+배포) 남음

---

## 🔗 프로젝트 간 연관성

```
┌─────────────────────────────────────────────────────────────┐
│                    AIOSv2 Integration (3100)                 │
│                    (통합 플랫폼)                              │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ /api/proxy/outlook/*
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                Mail Intelligence (10200)                     │
│                (Outlook 연동)                                │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ AI 프로바이더
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              F-AIOS-v3 (3200) → LM Studio (1234)            │
│              (AI 엔진)                                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    AIOS v1 (3101)                            │
│                    (메인 엔진)                                │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ 30개 API
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              고객/파트너/워크플로우/지식베이스                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Sangfor MCP Workflow (3500)                     │
│              (보안 워크플로우)                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              AIOS-JARVIS (Python)                            │
│              (음성 어시스턴트)                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 통합 우선순위

| 순위 | 프로젝트 | 이유 |
|------|----------|------|
| 1 | Mail Intelligence | 이미 AIOSv2에 프록시 연결됨 |
| 2 | AIOS v1 | 30개 API, 메인 엔진 |
| 3 | F-aios-v3-core | AI 엔진, 16개 패키지 |
| 4 | Sangfor MCP | 보안 워크플로우 |
| 5 | AIOS-JARVIS | 음성 인터페이스 |

---

**이 문서는 ~/Documents/Playground/AIOSv2_integration/.hermes/plans/ 에 저장됩니다.**
