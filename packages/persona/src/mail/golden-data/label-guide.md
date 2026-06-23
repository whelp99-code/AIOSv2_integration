# Golden Dataset Labeling Guide — classification-golden-v1

## Metadata

| Field           | Value                                |
| --------------- | ------------------------------------ |
| Version         | v1                                   |
| Date            | 2026-06-23                           |
| Target Size     | 500건 최소, 1,000건 권장             |
| Categories      | 8개 페르소나                         |
| Ambiguous Ratio | ≥ 20% (모호/복합 케이스)             |
| Languages       | 한국어/영어 혼합                     |
| Review Rule     | 2인 검수, 불일치 시 운영 owner 확정  |

---

## 1. Category Definitions

| Category      | Label          | Description                                                  |
| ------------- | -------------- | ------------------------------------------------------------ |
| 업무지원      | `WORK_SUPPORT` | 일반 업무 문의, 일정, 내부 공지, 팔로업                     |
| 영업          | `SALES`        | 견적 요청, 구매, 가격 문의, 계약 진행, 고객 기회            |
| 프리세일즈    | `PRESALES`     | 데모, POC, 기술 문의, 솔루션 설계, 호환성 확인              |
| 엔지니어      | `ENGINEER`     | 코드 리뷰, 빌드/배포, 버그 수정, 인프라, CI/CD              |
| PM            | `PM`           | 프로젝트 관리, 일정, 마일스톤, 작업 할당, 이슈 트래킹       |
| 재무          | `FINANCE`      | 청구서, 결제, 예산, 비용 정산, 세금계산서, 송금              |
| 마케팅        | `MARKETING`    | 뉴스레터, 브랜드, 콘텐츠, 디자인 가이드, 프로모션           |
| CEO           | `CEO`          | 승인 필요 건, 긴급 의사결정, 대외 공식 발표, 경영 전략      |

---

## 2. Labeling Rules

### 2.1 단일 카테고리 명확한 경우
- 메일의 **핵심 의도**를 기준으로 1개 카테고리 선택
- 여러 키워드가 겹치면 발신자 컨텍스트 + 본문 의도 기반 판단

### 2.2 모호/복합 케이스 (≥ 20%)
아래 조건 중 하나라도 해당하면 ambiguous로 표기:

- 두 카테고리의 confidence 차이가 0.1 미만으로 예상되는 경우
- 발신자가 고객인데 기술+영업 혼합 문의
- 내부 메일인데 PM+엔지니어 경계
- CEO 승인이 필요한 재무/영업 건
- 스팸/뉴스레터성 외부 메일과 마케팅 구분이 모호한 경우

ambiguous 메일에는 `isAmbiguous: true` + `alternativeCategory` 기록

### 2.3 금지 사항
- **prompt에 정답 라벨 누출 금지**: LLM 호출 시 golden label을 context에 포함하지 않는다
- **train/eval 중복 금지**: 같은 메일 template의 변형이 train/eval에 동시에 존재하면 안 된다
- **80/20 분리**: 전체 dataset의 80%를 eval로, 20%를 prompt development용으로 분리

---

## 3. 검수 절차

1. **1차 라벨링**: 라벨러 A가 메일 읽고 카테고리 + confidence + ambiguous 여부 기록
2. **2차 검수**: 라벨러 B가 동일 메일 독립 라벨링
3. **일치율 확인**: 
   - 일치 → 해당 라벨 채택
   - 불일치 → 운영 owner(CEO/PM)가 최종 확정
4. **ambiguous 케이스**: 2인 모두 ambiguous 표기 시 해당 메일은 복합 의도로 기록

---

## 4. 메일 필드 정의

```typescript
interface GoldenMailEntry {
  id: string;                    // 고유 ID (gm-0001 형식)
  subject: string;               // 메일 제목
  from: string;                  // 발신자 이메일
  to: string[];                  // 수신자 목록
  body: string;                  // 메일 본문 (최대 500자)
  receivedAt: string;            // ISO datetime
  language: 'ko' | 'en' | 'mixed';
  label: {
    category: PersonaType;       // 정답 카테고리
    confidence: number;          // 라벨러 confidence (0~1)
    isAmbiguous: boolean;        // 모호/복합 여부
    alternativeCategory?: PersonaType;  // 대안 카테고리
    labeledBy: string;           // 라벨러 ID
    reviewedBy: string;          // 검수자 ID
    reviewNotes?: string;        // 검수 메모
  };
  metadata: {
    source: 'synthetic' | 'real-anonymized';
    difficulty: 'easy' | 'medium' | 'hard';
    conflictZone?: string;       // 충돌 영역 (예: CEO vs FINANCE)
    tags: string[];              // 추가 태그
  };
}
```

---

## 5. 카테고리별 최소 배분

| Category      | 최소 건수 | 목표 비율 | 난이도 분포                    |
| ------------- | --------: | --------: | ------------------------------ |
| WORK_SUPPORT  |        70 |      14%  | easy 50%, medium 30%, hard 20% |
| SALES         |        70 |      14%  | easy 40%, medium 35%, hard 25% |
| PRESALES      |        60 |      12%  | easy 40%, medium 35%, hard 25% |
| ENGINEER      |        70 |      14%  | easy 50%, medium 30%, hard 20% |
| PM            |        60 |      12%  | easy 45%, medium 35%, hard 20% |
| FINANCE       |        60 |      12%  | easy 40%, medium 35%, hard 25% |
| MARKETING     |        50 |      10%  | easy 50%, medium 30%, hard 20% |
| CEO           |        60 |      12%  | easy 30%, medium 40%, hard 30% |
| **Total**     |   **500** |  **100%** |                                |

---

## 6. 충돌 영역 (Confusion Zone)

| Zone                      | Categories         | 예시 키워드                          |
| ------------------------- | ------------------ | ------------------------------------ |
| 결제/승인 충돌            | CEO ↔ FINANCE     | 결제, payment, 승인, 긴급 예산       |
| 작업/이슈 충돌            | PM ↔ ENGINEER     | 버그, bug, 이슈, issue, 작업, task   |
| 기술+영업 복합            | SALES ↔ PRESALES  | 견적+기술 검토, 데모+가격           |
| 뉴스레터/외부 메일        | MARKETING ↔ 기타  | 구독, newsletter, 프로모션          |
| 기본값 과다               | WORK_SUPPORT ↔ 전체 | fallback 과잉 케이스               |

충돌 영역 메일은 **전체의 20% 이상**을 차지해야 한다.
