# Phase Plan v2 — Track A 전체 (Red Team 피드백 반영)

> **작성일**: 2026-06-14
> **반영 소스**: Red Team Review v1 (A-1: 34건, A-2: 23건, A-3: 22건, A-4: 41건)
> **총 이슈**: 120건 (Critical 13, High 45, Medium 54, Low 18)

---

## 📊 Red Team 피드백 요약

### Phase A-1 (AIOS v1 API) — 34건
| Severity | Count | 주요 이슈 |
|----------|-------|-----------|
| Critical | 2 | 인증 없는 GET 엔드포인트, requestedBy 클라이언트 지정 |
| High | 13 | Dev mode approval bypass, command params injection |
| Medium | 15 | 에러 응답 내부 노출, CSRF/CORS 미적용 |
| Low | 4 | 플레이스홀더 테스트, 하드코딩 경로 |

### Phase A-2 (Sangfor MCP) — 23건
| Severity | Count | 주요 이슈 |
|----------|-------|-----------|
| Critical | 3 | Path injection, 무검증 payload forwarding, 테스트 0건 |
| High | 8 | 인증 미적용, 에러 정보 유출, dead code |
| Medium | 7 | CORS, Rate Limiting, Mock 데이터 |
| Low | 5 | 하드코딩 설정 |

### Phase A-3 (VibeCodingOS) — 22건
| Severity | Count | 주요 이슈 |
|----------|-------|-----------|
| Critical | 5 | 인증 없는 API, RCE vector, 테스트 0건, 파일 기반 저장소 |
| High | 7 | SSRF, Rate Limiting 부재, Audit 로그 미적용 |
| Medium | 7 | DB 접속 정보 힌트 노출, 비프로덕션 키 노출 |
| Low | 3 | 중복 파일 |

### Phase A-4 (F-aios-v3-core) — 41건
| Severity | Count | 주요 이슈 |
|----------|-------|-----------|
| Critical | 3 | Approval Gate 우회, OAuth 평문 저장, 테스트 부족 |
| High | 17 | Command injection, DB 마이그레이션 비트랜잭션, stub 코드 |
| Medium | 15 | 메모리 누수, unsafe ID 생성, 중복 타입 |
| Low | 6 | 파일 명명 불일치 |

---

## 🎯 수정 우선순위 (Critical → High 순)

### 즉시 수정 필요 (Critical 13건)
1. **JWT_SECRET 미설정 시 부팅 거부** (A-1)
2. **로그인 role 클라이언트 지정 차단** (A-1)
3. **Path injection 방지 — 입력 검증** (A-2)
4. **Payload 검증 — Zod 스키마 적용** (A-2)
5. **테스트 작성 — Sangfor routes** (A-2)
6. **인증 미들웨어 — 모든 API 라우트** (A-3)
7. **RCE 방지 — collaboration/execute 검증** (A-3)
8. **테스트 작성 — Collaboration** (A-3)
9. **파일 기반 저장소 → DB 전환** (A-3)
10. **Approval Gate 실제 동작** (A-4)
11. **OAuth 토큰 암호화 저장** (A-4)
12. **테스트 확대 — packages** (A-4)
13. **Git 히스토리 인증정보 제거** (전체)

### 조건부 수정 (High 45건)
- Dev mode approval bypass 제거
- Command params Zod 검증
- Rate Limiting 적용
- CORS 정책 설정
- 에러 응답 표준화
- 입력 검증 일괄 적용

---

## 📋 수정 계획

### Track A Phase A-1 수정
| 수정 항목 | 담당 | 상태 |
|-----------|------|------|
| JWT_SECRET 환경변수 검증 | OpenCode2 | ⏳ |
| role 서버사이드 강제 | OpenCode2 | ⏳ |
| Zod 입력 검증 적용 | OpenCode2 | ⏳ |
| Dev mode bypass 제거 | OpenCode2 | ⏳ |

### Track A Phase A-2 수정
| 수정 항목 | 담당 | 상태 |
|-----------|------|------|
| 입력 검증 (Zod) | OpenCode2 | ⏳ |
| 인증 미들웨어 적용 | OpenCode2 | ⏳ |
| 단위 테스트 작성 | OpenCode2 | ⏳ |
| Dead code 제거 | OpenCode2 | ⏳ |

### Track A Phase A-3 수정
| 수정 항목 | 담당 | 상태 |
|-----------|------|------|
| 인증 미들웨어 전체 적용 | OpenCode2 | ⏳ |
| RCE 방지 (exec 검증) | OpenCode2 | ⏳ |
| 통합 테스트 작성 | OpenCode2 | ⏳ |
| DB 전환 (파일 → Prisma) | OpenCode2 | ⏳ |

### Track A Phase A-4 수정
| 수정 항목 | 담당 | 상태 |
|-----------|------|------|
| Approval Gate 활성화 | OpenCode2 | ⏳ |
| OAuth 토큰 보안 저장 | OpenCode2 | ⏳ |
| 패키지 테스트 확대 | OpenCode2 | ⏳ |
| Command injection 방지 | OpenCode2 | ⏳ |

---

## ⏱️ 예상 소요 시간
- Critical 수정: ~2시간
- High 수정: ~3시간
- 재검증: ~1시간
- **총 예상**: ~6시간

---

## 🚫 제외 범위
- Track B 수정 (별도 Phase에서 처리)
- Low severity 이슈 (추후 개선)
- 성능 최적화 (범위 외)
