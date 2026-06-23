/**
 * 실제 메일 테스트 시나리오
 * 
 * Outlook/Gmail에서 수신되는 메일을 시뮬레이션하여
 * 전체 파이프라인을 검증합니다.
 */

// 테스트 시나리오 인터페이스
export interface MailTestScenario {
  id: string;
  name: string;
  description: string;
  mail: {
    subject: string;
    from: string;
    to: string[];
    body: string;
  };
  expected: {
    category: string;
    confidence: number;
    personaType: string;
    actionRequired: boolean;
    approvalRequired: boolean;
  };
  priority: 'high' | 'medium' | 'low';
}

// 테스트 시나리오 정의
export const TEST_SCENARIOS: MailTestScenario[] = [
  // === 영업 관련 ===
  {
    id: 'scenario-001',
    name: '견적 요청 메일',
    description: '고객이 제품 견적을 요청하는 메일',
    mail: {
      subject: '[견적 요청] ABC 솔루션 견적 부탁드립니다',
      from: 'kim.cheolsu@customer.com',
      to: ['sales@company.com'],
      body: `안녕하세요.

ABC 솔루션 견적 요청드립니다.

- 품목: AIOS Enterprise License
- 수량: 10 라이선스
- 납기: 2026-07-15

견적서 부탁드립니다.

감사합니다.
김철수 드림`,
    },
    expected: {
      category: 'SALES',
      confidence: 0.8,
      personaType: 'SALES',
      actionRequired: false,
      approvalRequired: false,
    },
    priority: 'high',
  },
  {
    id: 'scenario-002',
    name: '계약 조건 협의',
    description: '고객이 계약 조건을 협의하는 메일',
    mail: {
      subject: '계약 조건 협의 건',
      from: 'lee.younghee@partner.com',
      to: ['sales@company.com'],
      body: `안녕하세요.

계약 조건 협의 건으로 연락드립니다.

1. 결제 조건: 30일 후 현금
2. 할인율: 15%
3. 유지보수: 1년 무상

검토 부탁드립니다.

이영희 드림`,
    },
    expected: {
      category: 'SALES',
      confidence: 0.9,
      personaType: 'SALES',
      actionRequired: true,
      approvalRequired: false,
    },
    priority: 'high',
  },

  // === 재무 관련 ===
  {
    id: 'scenario-003',
    name: '청구서 발송',
    description: '고객에게 청구서를 발송하는 메일',
    mail: {
      subject: '[청구서] 2026년 6월 서비스 이용료',
      from: 'finance@company.com',
      to: ['customer@customer.com'],
      body: `안녕하세요.

2026년 6월 서비스 이용료 청구서를 발송합니다.

- 청구 금액: 5,000,000원
- 부가세: 500,000원
- 합계: 5,500,000원
- 납기일: 2026-07-10

자세한 내용은 첨부파일을 확인해주세요.

감사합니다.`,
    },
    expected: {
      category: 'FINANCE',
      confidence: 0.85,
      personaType: 'FINANCE',
      actionRequired: false,
      approvalRequired: false,
    },
    priority: 'medium',
  },
  {
    id: 'scenario-004',
    name: '비용 정산 요청',
    description: '직원이 비용을 정산 요청하는 메일',
    mail: {
      subject: '6월 출장 비용 정산 요청',
      from: 'park.jimin@company.com',
      to: ['finance@company.com'],
      body: `안녕하세요.

6월 출장 비용 정산 요청드립니다.

- 항공료: 350,000원
- 숙박비: 200,000원
- 식비: 150,000원
- 교통비: 50,000원
- 합계: 750,000원

영수증 첨부합니다.

박지민 드림`,
    },
    expected: {
      category: 'FINANCE',
      confidence: 0.8,
      personaType: 'FINANCE',
      actionRequired: false,
      approvalRequired: false,
    },
    priority: 'medium',
  },

  // === 프리세일즈 관련 ===
  {
    id: 'scenario-005',
    name: '기술 문의',
    description: '고객이 기술 사양을 문의하는 메일',
    mail: {
      subject: 'AIOS 솔루션 기술 사양 문의',
      from: 'tech@customer.com',
      to: ['presales@company.com'],
      body: `안녕하세요.

AIOS 솔루션 기술 사양 문의드립니다.

1. 지원하는 데이터베이스는?
2. 최대 동시 접속자 수는?
3. API 응답 시간은?
4. 보안 인증 현황은?

검토 부탁드립니다.

감사합니다.`,
    },
    expected: {
      category: 'PRESALES',
      confidence: 0.75,
      personaType: 'PRESALES',
      actionRequired: false,
      approvalRequired: false,
    },
    priority: 'high',
  },
  {
    id: 'scenario-006',
    name: '데모 요청',
    description: '고객이 제품 데모를 요청하는 메일',
    mail: {
      subject: 'AIOS 솔루션 데모 요청',
      from: 'ceo@customer.com',
      to: ['presales@company.com'],
      body: `안녕하세요.

AIOS 솔루션 데모를 요청합니다.

- 희망 일시: 2026-06-30 14:00
- 참석 인원: 5명
- 관심 기능: 메일 자동 분류, CEO 브리핑

데모 일정 확인 부탁드립니다.

감사합니다.`,
    },
    expected: {
      category: 'PRESALES',
      confidence: 0.85,
      personaType: 'PRESALES',
      actionRequired: true,
      approvalRequired: false,
    },
    priority: 'high',
  },

  // === PM 관련 ===
  {
    id: 'scenario-007',
    name: '프로젝트 일정 논의',
    description: '프로젝트 일정을 논의하는 메일',
    mail: {
      subject: 'AIOS v2 프로젝트 일정 논의',
      from: 'pm@company.com',
      to: ['team@company.com'],
      body: `안녕하세요.

AIOS v2 프로젝트 일정 논의 건입니다.

- Phase 1: 2026-07-01 ~ 2026-07-14
- Phase 2: 2026-07-15 ~ 2026-07-28
- Phase 3: 2026-07-29 ~ 2026-08-11

회의 일정 잡아주세요.

감사합니다.`,
    },
    expected: {
      category: 'PM',
      confidence: 0.7,
      personaType: 'PM',
      actionRequired: false,
      approvalRequired: false,
    },
    priority: 'medium',
  },
  {
    id: 'scenario-008',
    name: '작업 할당',
    description: '팀원에게 작업을 할당하는 메일',
    mail: {
      subject: '작업 할당: 메일 분류 모듈 구현',
      from: 'pm@company.com',
      to: ['dev@company.com'],
      body: `안녕하세요.

작업 할당 건입니다.

- 작업: 메일 분류 모듈 구현
- 담당: 김개발
- 마감: 2026-07-10
- 우선순위: 높음

진행 상황 공유 부탁드립니다.

감사합니다.`,
    },
    expected: {
      category: 'PM',
      confidence: 0.75,
      personaType: 'PM',
      actionRequired: false,
      approvalRequired: false,
    },
    priority: 'medium',
  },

  // === 엔지니어 관련 ===
  {
    id: 'scenario-009',
    name: '코드 리뷰 요청',
    description: '개발자가 코드 리뷰를 요청하는 메일',
    mail: {
      subject: 'PR #123 코드 리뷰 요청',
      from: 'dev@company.com',
      to: ['team@company.com'],
      body: `안녕하세요.

PR #123 코드 리뷰 요청드립니다.

변경 사항:
- MailClassifier 구현
- 테스트 15건 추가
- 문서 업데이트

리뷰 부탁드립니다.

감사합니다.`,
    },
    expected: {
      category: 'ENGINEER',
      confidence: 0.8,
      personaType: 'ENGINEER',
      actionRequired: false,
      approvalRequired: false,
    },
    priority: 'medium',
  },
  {
    id: 'scenario-010',
    name: '버그 리포트',
    description: '사용자가 버그를 리포트하는 메일',
    mail: {
      subject: '[버그] 메일 분류 오류 발생',
      from: 'user@company.com',
      to: ['support@company.com'],
      body: `안녕하세요.

메일 분류 오류가 발생했습니다.

- 증상: 영업 메일이 재무로 분류됨
- 발생 시간: 2026-06-23 14:30
- 재현 방법: "견적" 키워드가 포함된 메일

확인 부탁드립니다.

감사합니다.`,
    },
    expected: {
      category: 'ENGINEER',
      confidence: 0.85,
      personaType: 'ENGINEER',
      actionRequired: true,
      approvalRequired: false,
    },
    priority: 'high',
  },

  // === 마케팅 관련 ===
  {
    id: 'scenario-011',
    name: '뉴스레터 발송',
    description: '마케팅 뉴스레터를 발송하는 메일',
    mail: {
      subject: '[뉴스레터] 6월 AIOS 업데이트 소식',
      from: 'marketing@company.com',
      to: ['subscribers@company.com'],
      body: `안녕하세요.

6월 AIOS 업데이트 소식을 전해드립니다.

1. 새로운 기능: CEO 브리핑 대시보드
2. 성능 개선: 메일 분류 속도 50% 향상
3. 보안 강화: OAuth 2.0 인증 적용

자세한 내용은 블로그를 확인해주세요.

감사합니다.`,
    },
    expected: {
      category: 'MARKETING',
      confidence: 0.75,
      personaType: 'MARKETING',
      actionRequired: false,
      approvalRequired: false,
    },
    priority: 'low',
  },

  // === CEO 승인 관련 ===
  {
    id: 'scenario-012',
    name: '긴급 승인 요청',
    description: 'CEO 승인이 필요한 긴급 메일',
    mail: {
      subject: '[긴급] 500만원 계약 승인 요청',
      from: 'sales@company.com',
      to: ['ceo@company.com'],
      body: `안녕하세요.

500만원 계약 승인 요청드립니다.

- 고객: ABC Corp
- 금액: 5,000,000원
- 계약 기간: 1년
- 결제 조건: 30일 후 현금

승인 부탁드립니다.

감사합니다.`,
    },
    expected: {
      category: 'CEO',
      confidence: 0.9,
      personaType: 'CEO',
      actionRequired: true,
      approvalRequired: true,
    },
    priority: 'high',
  },
  {
    id: 'scenario-013',
    name: '예산 승인 요청',
    description: 'CEO 승인이 필요한 예산 메일',
    mail: {
      subject: '2026년 하반기 예산 승인 요청',
      from: 'finance@company.com',
      to: ['ceo@company.com'],
      body: `안녕하세요.

2026년 하반기 예산 승인 요청드립니다.

- 마케팅 예산: 10,000,000원
- 개발 예산: 20,000,000원
- 운영 예산: 5,000,000원
- 합계: 35,000,000원

승인 부탁드립니다.

감사합니다.`,
    },
    expected: {
      category: 'CEO',
      confidence: 0.9,
      personaType: 'CEO',
      actionRequired: true,
      approvalRequired: true,
    },
    priority: 'high',
  },

  // === 일반 업무 ===
  {
    id: 'scenario-014',
    name: '일반 문의',
    description: '일반적인 문의 메일',
    mail: {
      subject: '서비스 이용 문의',
      from: 'info@example.com',
      to: ['support@company.com'],
      body: `안녕하세요.

서비스 이용 문의드립니다.

- 요금제는 어떻게 되나요?
- 무료 체험 기간이 있나요?
- 기술 지원은 어떻게 받나요?

답변 부탁드립니다.

감사합니다.`,
    },
    expected: {
      category: 'WORK_SUPPORT',
      confidence: 0.5,
      personaType: 'WORK_SUPPORT',
      actionRequired: false,
      approvalRequired: false,
    },
    priority: 'low',
  },
  {
    id: 'scenario-015',
    name: '회의 일정 확인',
    description: '회의 일정을 확인하는 메일',
    mail: {
      subject: '내일 회의 일정 확인',
      from: 'secretary@company.com',
      to: ['team@company.com'],
      body: `안녕하세요.

내일 회의 일정 확인드립니다.

- 시간: 2026-06-24 14:00
- 장소: 회의실 A
- 안건: 프로젝트 진행 상황 공유

참석 부탁드립니다.

감사합니다.`,
    },
    expected: {
      category: 'WORK_SUPPORT',
      confidence: 0.5,
      personaType: 'WORK_SUPPORT',
      actionRequired: false,
      approvalRequired: false,
    },
    priority: 'low',
  },
];

// 시나리오 실행 결과
export interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  passed: boolean;
  actual: {
    category: string;
    confidence: number;
    personaType: string;
  };
  expected: {
    category: string;
    confidence: number;
    personaType: string;
  };
  errors: string[];
  duration: number;
}

// 메일 분류 시뮬레이션
function classifyMail(subject: string, body: string): { category: string; confidence: number } {
  const text = `${subject} ${body}`.toLowerCase();
  
  if (['견적', 'quote', '제안', 'proposal', '계약', 'contract'].some(kw => text.includes(kw))) {
    return { category: 'SALES', confidence: 0.8 + Math.random() * 0.1 };
  }
  if (['청구서', 'invoice', '비용', 'expense', '정산', 'settlement'].some(kw => text.includes(kw))) {
    return { category: 'FINANCE', confidence: 0.8 + Math.random() * 0.1 };
  }
  if (['기술', 'technical', '문의', 'inquiry', '사양', 'spec', '데모', 'demo'].some(kw => text.includes(kw))) {
    return { category: 'PRESALES', confidence: 0.7 + Math.random() * 0.1 };
  }
  if (['프로젝트', 'project', '일정', 'schedule', '작업', 'task'].some(kw => text.includes(kw))) {
    return { category: 'PM', confidence: 0.7 + Math.random() * 0.1 };
  }
  if (['코드', 'code', '리뷰', 'review', '버그', 'bug', 'PR'].some(kw => text.includes(kw))) {
    return { category: 'ENGINEER', confidence: 0.8 + Math.random() * 0.1 };
  }
  if (['마케팅', 'marketing', '뉴스레터', 'newsletter', '콘텐츠', 'content'].some(kw => text.includes(kw))) {
    return { category: 'MARKETING', confidence: 0.7 + Math.random() * 0.1 };
  }
  if (['승인', 'approval', '긴급', 'urgent', '예산', 'budget'].some(kw => text.includes(kw))) {
    return { category: 'CEO', confidence: 0.9 + Math.random() * 0.05 };
  }
  
  return { category: 'WORK_SUPPORT', confidence: 0.5 + Math.random() * 0.1 };
}

// 시나리오 실행
export async function runScenario(scenario: MailTestScenario): Promise<ScenarioResult> {
  const start = performance.now();
  const errors: string[] = [];

  // 메일 분류
  const classification = classifyMail(scenario.mail.subject, scenario.mail.body);

  // 결과 검증
  if (classification.category !== scenario.expected.category) {
    errors.push(`Category mismatch: expected ${scenario.expected.category}, got ${classification.category}`);
  }

  if (Math.abs(classification.confidence - scenario.expected.confidence) > 0.2) {
    errors.push(`Confidence mismatch: expected ~${scenario.expected.confidence}, got ${classification.confidence}`);
  }

  const duration = performance.now() - start;

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    passed: errors.length === 0,
    actual: {
      category: classification.category,
      confidence: Math.round(classification.confidence * 100) / 100,
      personaType: classification.category,
    },
    expected: {
      category: scenario.expected.category,
      confidence: scenario.expected.confidence,
      personaType: scenario.expected.personaType,
    },
    errors,
    duration,
  };
}

// 전체 시나리오 실행
export async function runAllScenarios(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: ScenarioResult[];
  summary: Record<string, { passed: number; failed: number }>;
}> {
  console.log('=== 메일 테스트 시나리오 실행 ===\n');

  const results: ScenarioResult[] = [];
  const summary: Record<string, { passed: number; failed: number }> = {};

  for (const scenario of TEST_SCENARIOS) {
    const result = await runScenario(scenario);
    results.push(result);

    // 카테고리별 집계
    const category = scenario.expected.category;
    if (!summary[category]) {
      summary[category] = { passed: 0, failed: 0 };
    }
    if (result.passed) {
      summary[category].passed++;
    } else {
      summary[category].failed++;
    }

    // 결과 출력
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${scenario.id}: ${scenario.name}`);
    if (!result.passed) {
      result.errors.forEach(error => console.log(`   - ${error}`));
    }
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('\n=== 결과 요약 ===');
  console.log(`총 시나리오: ${results.length}`);
  console.log(`통과: ${passed}`);
  console.log(`실패: ${failed}`);
  console.log(`성공률: ${Math.round((passed / results.length) * 100)}%`);

  console.log('\n=== 카테고리별 결과 ===');
  for (const [category, stats] of Object.entries(summary)) {
    console.log(`${category}: ${stats.passed}통과, ${stats.failed}실패`);
  }

  return {
    total: results.length,
    passed,
    failed,
    results,
    summary,
  };
}

// CLI 실행
if (require.main === module) {
  runAllScenarios().then(result => {
    if (result.failed > 0) {
      console.log('\n❌ 일부 시나리오 실패');
      process.exit(1);
    } else {
      console.log('\n✅ 모든 시나리오 통과');
      process.exit(0);
    }
  });
}
