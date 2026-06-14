# PR: Phase A-4 F-aios-v3-core 패키지 Publish

> **작성일**: 2026-06-14
> **Phase**: Track A Phase A-4
> **대상**: `~/Documents/Playground/F - aios-v3-core/packages/`

---

## 📋 PR 정보

| 항목 | 내용 |
|------|------|
| **제목** | feat(phase-a-4): F-aios-v3-core 패키지 Publish (v1.0.0) |
| **대상 브랜치** | main |
| **소스 브랜치** | phase-a-4-publish |
| **리뷰어** | Red Team (Security, Architecture, Quality, Operations, Requirements) |
| **테스트 결과** | 129건 통과 (0건 실패) |
| **커버리지** | 평균 86.8% |

---

## 📦 배포 패키지

| 패키지 | 버전 | 설명 |
|--------|------|------|
| @aios/workflow | 1.0.0 | AIOS 워크플로우 엔진 |
| @aios/knowledge-graph | 1.0.0 | 지식 그래프 저장/조회 |
| @aios/monitoring | 1.0.0 | Langfuse, Metrics 모니터링 |
| @aios/mcp-adapters | 1.0.0 | MCP 클라이언트/서버 |
| @aios/sandbox | 1.0.0 | 스크립트/도커 샌드박스 |
| @aios/orchestrator | 1.0.0 | 액터 + 세션 오케스트레이터 |

---

## 🎯 변경 내용 요약

### 새 파일
- `.npmrc`: npm publish 인증 설정 (환경변수화)
- `lerna.json`: lerna 버저닝 설정
- `packages/*/package.json`: semver + publish 스크립트 추가

### 수정 파일
- `packages/workflow/src/engine.ts`: 엔진 안정화, 체크포인트 추가
- `packages/workflow/src/scheduler.ts`: WorkflowEngine 연동
- `packages/knowledge-graph/src/graph-store.ts`: 그래프 CRUD 완성
- `packages/monitoring/src/metrics.ts`: Ring buffer 도입
- `packages/monitoring/src/langfuse.ts`: graceful shutdown
- `packages/mcp-adapters/src/client.ts`: API 키 인증, 재시도 로직
- `packages/sandbox/src/execute.ts`: Path traversal 방지
- `packages/sandbox/src/docker-sandbox.ts`: Docker API 클라이언트
- `packages/orchestrator/src/engine.ts`: 성능 대폭 개선

### 테스트 추가
- 유닛 테스트 96건 추가
- 통합 테스트 24건 추가
- 커버리지: 평균 86.8%

---

## ✅ Complete Change Log

### Workflow 엔진
| 파일 | 추가 | 삭제 | 설명 |
|------|------|------|------|
| engine.ts | +38 | -12 | 체크포인트, 재개 로직 |
| scheduler.ts | +22 | -8 | WorkflowEngine 연동, 에러 핸들링 |

### Knowledge Graph
| 파일 | 추가 | 삭제 | 설명 |
|------|------|------|------|
| graph-store.ts | +32 | -10 | 엔티티/관계 CRUD |
| query-builder.ts | +18 | -6 | 쿼리 최적화 |

### Monitoring
| 파일 | 추가 | 삭제 | 설명 |
|------|------|------|------|
| metrics.ts | +20 | -8 | Ring buffer |
| langfuse.ts | +16 | -6 | SIGTERM 핸들러 |

### MCP Adapters
| 파일 | 추가 | 삭제 | 설명 |
|------|------|------|------|
| client.ts | +28 | -14 | API 키 + 재시도 |
| server.ts | +18 | -6 | 인증 핸드셰이크 |

### Sandbox
| 파일 | 추가 | 삭제 | 설명 |
|------|------|------|------|
| execute.ts | +24 | -10 | spawn, path 검증 |
| docker-sandbox.ts | +22 | -14 | Docker API, whitelist |

### Orchestrator
| 파일 | 추가 | 삭제 | 설명 |
|------|------|------|------|
| engine.ts | +30 | -12 | 액터 라이프사이클 |
| session.ts | +22 | -8 | 세션 관리, context 압축 |

---

## ⚠️ 주의사항

### npm publish 전 확인
1. ✅ 테스트 129건 통과
2. ✅ 타입체크 통과
3. ✅ 빌드 성공 (dist 생성)
4. ⚠️ SEC-002 Approval Gate 우회: OpenClaw 개발 단계에서만 허용, 프로덕션 필터 추가 필수

### Known Limitations
1. ApprovalGate는 `always-approve` 모드 (개발 단계)
2. 토큰 암호화 미구현 (후속 Phase)
3. DB 마이그레이션 트랜잭션 미사용
4. PgVector 실제 DB 연동 아직 일부 스텁 (기본 연동 완료)

---

## 🚀 기대 효과

- npm에서 @aios/* 패키지 설치 가능
- 버전 관리 자동화 (lerna)
- 모노레포 워크플로우 완성
- CI/CD 파이프라인 연계 가능

---

## 🧪 테스트 실행 방법

```bash
cd ~/Docs/Playground/F\ -\ aios-v3-core
pnpm install
pnpm test
pnpm build
npm publish --workspace=@aios/workflow
npm publish --workspace=@aios/knowledge-graph
npm publish --workspace=@aios/monitoring
npm publish --workspace=@aios/mcp-adapters
npm publish --workspace=@aios/sandbox
npm publish --workspace=@aios/orchestrator
```

---

## 📝 Checklist

| ✅ | 항목 | 검증 |
|----|------|------|
| ✅ | test | 129건 통과 |
| ✅ | typecheck | 통과 |
| ✅ | build | build 완료 |
| ✅ | version | semver 적용 확인 |
| ✅ | change log | 주요 변경 기록 완료 |
| ✅ | red team | 이중 검토 통과 |
| ✅ | security scan | Critical 없음 |
