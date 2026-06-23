/**
 * Golden Dataset Generator — classification-golden-v1
 *
 * Generates synthetic mail entries for benchmark testing.
 * Each run produces a deterministic dataset based on seed.
 *
 * Usage:
 *   npx ts-node packages/persona/src/mail/golden-data/generator.ts [--count 1000] [--seed 42] [--output path]
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Types ──────────────────────────────────────────────────────────────

type PersonaType =
  | 'WORK_SUPPORT'
  | 'SALES'
  | 'PRESALES'
  | 'ENGINEER'
  | 'PM'
  | 'FINANCE'
  | 'MARKETING'
  | 'CEO';

interface GoldenMailEntry {
  id: string;
  subject: string;
  from: string;
  to: string[];
  body: string;
  receivedAt: string;
  language: 'ko' | 'en' | 'mixed';
  label: {
    category: PersonaType;
    confidence: number;
    isAmbiguous: boolean;
    alternativeCategory?: PersonaType;
    labeledBy: string;
    reviewedBy: string;
    reviewNotes?: string;
  };
  metadata: {
    source: 'synthetic';
    difficulty: 'easy' | 'medium' | 'hard';
    conflictZone?: string;
    tags: string[];
  };
}

interface Manifest {
  version: string;
  generatedAt: string;
  seed: number;
  totalCount: number;
  ambiguousCount: number;
  categoryDistribution: Record<PersonaType, number>;
  difficultyDistribution: Record<string, number>;
  languageDistribution: Record<string, number>;
  splits: {
    eval: { count: number; ids: string[] };
    promptDev: { count: number; ids: string[] };
  };
}

// ── Seeded PRNG ────────────────────────────────────────────────────────

class SeededRandom {
  private state: number;
  constructor(seed: number) {
    this.state = seed;
  }
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) & 0xffffffff;
    return (this.state >>> 0) / 0xffffffff;
  }
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

// ── Templates ──────────────────────────────────────────────────────────

const DOMAINS_INTERNAL = ['company.co.kr', 'team.internal', 'aios.io'];
const DOMAINS_CUSTOMER = ['customer.com', 'client.co.kr', 'partner.io', 'enterprise.kr'];
const DOMAINS_VENDOR = ['vendor.co.kr', 'supplier.com', 'techpartner.io'];

const NAMES_KO = ['김철수', '이영희', '박민수', '최수진', '정하늘', '강서연', '조현우', '윤지아', '한동욱', '임소영'];
const NAMES_EN = ['John Smith', 'Sarah Lee', 'Mike Chen', 'Emily Park', 'David Kim', 'Lisa Wang', 'Tom Brown', 'Amy Cho'];

interface Template {
  subject: string;
  body: string;
  fromDomain: string;
  language: 'ko' | 'en' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard';
  isAmbiguous: boolean;
  alternativeCategory?: PersonaType;
  conflictZone?: string;
  tags: string[];
}

// WORK_SUPPORT templates
const WORK_SUPPORT_TEMPLATES: Template[] = [
  { subject: '다음 주 회의 일정 확인 요청', body: '안녕하세요, 다음 주 화요일 프로젝트 미팅 시간이 변경되었는지 확인 부탁드립니다. 감사합니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'easy', isAmbiguous: false, tags: ['schedule', 'meeting'] },
  { subject: '사무용품 신청 안내', body: '이번 달 사무용품 신청 기한이 금요일까지입니다. 필요하신 분은 구글 시트에 입력해 주세요.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'easy', isAmbiguous: false, tags: ['admin', 'office'] },
  { subject: 'Re: Follow up on Q3 planning', body: 'Hi team, just following up on the Q3 planning discussion. Can everyone update their action items by EOW?', fromDomain: 'team.internal', language: 'en', difficulty: 'easy', isAmbiguous: false, tags: ['follow-up', 'planning'] },
  { subject: '건물 출입문 공사 안내', body: '6월 25일~27일 본관 1층 출입문 공사가 있습니다. 우측 출입문을 이용해 주세요.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'easy', isAmbiguous: false, tags: ['notice', 'facility'] },
  { subject: '사내 교육 프로그램 참가 신청', body: '7월 사내 교육 프로그램 참가자를 모집합니다. 신청 마감: 6/30. 선착순 30명.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'easy', isAmbiguous: false, tags: ['education', 'hr'] },
  { subject: 'VPN 접속 오류 관련 문의', body: 'VPN 접속 시 인증 오류가 발생합니다. 재설치해도 동일한 문제가 지속됩니다. 지원 부탁드립니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['it-support', 'vpn'] },
  { subject: 'Team offsite venue options', body: 'I found 3 venues for our July offsite. Please review attached and vote by Friday.', fromDomain: 'team.internal', language: 'en', difficulty: 'medium', isAmbiguous: false, tags: ['team-building', 'planning'] },
  { subject: 'Re: 주간 보고 양식 변경 안내', body: '이번 주부터 주간 보고 양식이 변경됩니다. 새 양식은 공유 드라이브에 업로드했습니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['report', 'template'] },
  { subject: '연차 사용 현황 및 독려', body: '상반기 연차 사용률이 60%입니다. 잔여 연차 소진을 권장합니다. 팀장님들께 협조 부탁드립니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'medium', isAmbiguous: true, alternativeCategory: 'PM', conflictZone: 'PM boundary', tags: ['hr', 'leave'] },
  { subject: 'Parking lot assignment update', body: 'Starting July, parking assignments will be based on seniority. Please check the new assignments sheet.', fromDomain: 'company.co.kr', language: 'en', difficulty: 'easy', isAmbiguous: false, tags: ['admin', 'facility'] },
  { subject: '복합: 일정 조율 + 예산 논의', body: '다음 주 미팅에서 Q3 일정과 예산 배분을 함께 논의하면 좋겠습니다. 재무팀 참석 요청 드립니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'hard', isAmbiguous: true, alternativeCategory: 'FINANCE', conflictZone: 'PM vs FINANCE', tags: ['meeting', 'budget', 'cross-functional'] },
  { subject: 'Equipment return reminder', body: 'Employees leaving the company must return all equipment within 5 business days. IT team, please track.', fromDomain: 'company.co.kr', language: 'en', difficulty: 'medium', isAmbiguous: false, tags: ['admin', 'it'] },
];

// SALES templates
const SALES_TEMPLATES: Template[] = [
  { subject: 'HCI 솔루션 견적 요청', body: '안녕하세요, 당사 HCI 솔루션 10노드 견적을 요청드립니다. 납기 및 가격 조건 부탁드립니다.', fromDomain: 'customer.com', language: 'ko', difficulty: 'easy', isAmbiguous: false, tags: ['quote', 'hci'] },
  { subject: 'Re: 계약 조건 협의', body: '견적서 검토 완료했습니다. 연간 라이선스 비용 15% 할인 가능하신지 확인 부탁드립니다.', fromDomain: 'client.co.kr', language: 'ko', difficulty: 'easy', isAmbiguous: false, tags: ['contract', 'negotiation'] },
  { subject: 'Purchase order for backup solution', body: 'Please find attached our PO for the backup solution discussed last week. Delivery by end of July preferred.', fromDomain: 'enterprise.kr', language: 'en', difficulty: 'easy', isAmbiguous: false, tags: ['purchase', 'order'] },
  { subject: '신규 리드: OO대학교 인프라 구축', body: 'OO대학교에서 신규 인프라 구축 문의가 들어왔습니다. 영업팀 배정 요청드립니다.', fromDomain: 'partner.io', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['lead', 'education'] },
  { subject: '가격 비교 요청 - 경쟁사 대비', body: '경쟁사 A사와 가격 비교 분석 부탁드립니다. 고객이 의사결정 전에 비교 자료를 요청했습니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['pricing', 'competitive'] },
  { subject: 'Customer expansion opportunity', body: 'Our existing client wants to expand their SASE deployment to 3 additional branches. Need updated pricing.', fromDomain: 'customer.com', language: 'en', difficulty: 'medium', isAmbiguous: true, alternativeCategory: 'PRESALES', conflictZone: 'SALES vs PRESALES expansion', tags: ['expansion', 'sase'] },
  { subject: 'Re: 구매 일정 확정', body: '6월 내 구매 확정 예정입니다. 최종 할인율과 결제 조건 안내 부탁드립니다.', fromDomain: 'client.co.kr', language: 'ko', difficulty: 'easy', isAmbiguous: false, tags: ['purchase', 'closing'] },
  { subject: '파트너사 딜 등록 안내', body: '이번 분기 딜 등록 마감이 6/30입니다. 미등록 딜이 있으시면 등록 부탁드립니다.', fromDomain: 'partner.io', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['partner', 'deal-registration'] },
  { subject: '연간 유지보수 갱신 견적', body: '3건의 유지보수 계약이 다음 달 만료됩니다. 갱신 견적서 준비 부탁드립니다.', fromDomain: 'customer.com', language: 'ko', difficulty: 'medium', isAmbiguous: true, alternativeCategory: 'FINANCE', conflictZone: 'SALES vs FINANCE renewal', tags: ['renewal', 'maintenance'] },
  { subject: 'Bulk order inquiry', body: 'We are looking to order 50 units of SKE appliances for our branch offices. Can you provide volume pricing?', fromDomain: 'enterprise.kr', language: 'en', difficulty: 'easy', isAmbiguous: false, tags: ['bulk-order', 'volume'] },
  { subject: '영업 실적 보고 및 목표 논의', body: '이번 분기 영업 실적 보고서 공유드립니다. 목표 대비 85% 달성했습니다. 다음 분기 전략 논의 필요합니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'hard', isAmbiguous: true, alternativeCategory: 'PM', conflictZone: 'SALES vs PM reporting', tags: ['sales-report', 'strategy'] },
  { subject: 'Re: 제안서 수정 요청', body: '고객 피드백 반영하여 제안서 기술 사양 페이지 수정이 필요합니다. 엔지니어 협조 부탁드립니다.', fromDomain: 'customer.com', language: 'ko', difficulty: 'hard', isAmbiguous: true, alternativeCategory: 'PRESALES', conflictZone: 'SALES vs PRESALES proposal', tags: ['proposal', 'revision'] },
];

// PRESALES templates
const PRESALES_TEMPLATES: Template[] = [
  { subject: 'POC 일정 및 환경 협의', body: 'POC 진행을 위한 일정과 테스트 환경 요구사항을 협의하고 싶습니다. 가능한 시간대 알려주세요.', fromDomain: 'customer.com', language: 'ko', difficulty: 'easy', isAmbiguous: false, tags: ['poc', 'planning'] },
  { subject: 'Technical architecture review request', body: 'Customer requested a technical architecture review for their hybrid cloud deployment. Need presales engineer.', fromDomain: 'partner.io', language: 'en', difficulty: 'easy', isAmbiguous: false, tags: ['architecture', 'review'] },
  { subject: '데모 환경 설정 완료 안내', body: '고객사 ABC 데모 환경 설정이 완료되었습니다. URL과 계정 정보는 별도 전달드립니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'easy', isAmbiguous: false, tags: ['demo', 'setup'] },
  { subject: '솔루션 호환성 문의', body: '기존 VMware 환경에서 SCP 솔루션 호환성이 가능한지 기술 검토 부탁드립니다.', fromDomain: 'customer.com', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['compatibility', 'technical'] },
  { subject: 'RFP 기술 검토 요청', body: '고객사에서 발행한 RFP의 기술 요구사항 검토가 필요합니다. 검토 후 솔루션 매핑 부탁드립니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['rfp', 'review'] },
  { subject: 'Re: 기술 문의 - HDR 성능', body: 'HDR 솔루션의 동시 스트리밍 성능 지표가 필요합니다. 고객 프레젠테이션 자료에 포함할 예정입니다.', fromDomain: 'customer.com', language: 'ko', difficulty: 'medium', isAmbiguous: true, alternativeCategory: 'SALES', conflictZone: 'PRESALES vs SALES presentation', tags: ['performance', 'presentation'] },
  { subject: 'POC 결과 보고서 작성', body: 'ABC사 POC 결과 보고서 초안 작성 완료했습니다. 검토 후 고객 전달 예정입니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['poc', 'report'] },
  { subject: 'Integration test environment request', body: 'Need a sandbox environment to test NGAF integration with customer SIEM. Can we spin up isolated VMs?', fromDomain: 'company.co.kr', language: 'en', difficulty: 'medium', isAmbiguous: false, tags: ['integration', 'testing'] },
  { subject: '기술 검토 + 견적 복합 요청', body: '기술 검토 완료 후 바로 견적서를 고객에게 제출해야 합니다. 검토 결과에 따라 가격 변동 가능성이 있습니다.', fromDomain: 'customer.com', language: 'ko', difficulty: 'hard', isAmbiguous: true, alternativeCategory: 'SALES', conflictZone: 'PRESALES vs SALES combined', tags: ['technical-review', 'quote'] },
  { subject: 'Demo script for SASE rollout', body: 'Created demo script for the SASE rollout presentation. Need technical review before customer meeting Thursday.', fromDomain: 'company.co.kr', language: 'en', difficulty: 'medium', isAmbiguous: false, tags: ['demo', 'sase'] },
  { subject: '고객 기술 문의 대응 - 보안 정책', body: '고객사에서 NGAF 보안 정책 설정 관련 기술 문의가 왔습니다. 기술 지원팀 협조 필요합니다.', fromDomain: 'customer.com', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['security', 'support'] },
  { subject: 'Solution comparison matrix', body: 'Please prepare a feature comparison matrix between our EPP solution and competitors for the customer presentation.', fromDomain: 'company.co.kr', language: 'en', difficulty: 'hard', isAmbiguous: true, alternativeCategory: 'SALES', conflictZone: 'PRESALES vs SALES competitive', tags: ['comparison', 'competitive'] },
];

// ENGINEER templates
const ENGINEER_TEMPLATES: Template[] = [
  { subject: 'PR 리뷰 요청: API 엔드포인트 추가', body: '새로운 사용자 API 엔드포인트 PR 올렸습니다. 리뷰 부탁드립니다. PR #234', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'easy', isAmbiguous: false, tags: ['code-review', 'api'] },
  { subject: 'Build failure on main branch', body: 'Main branch 빌드가 실패했습니다. TypeScript 컴파일 오류입니다. 긴급 수정이 필요합니다.', fromDomain: 'company.co.kr', language: 'mixed', difficulty: 'easy', isAmbiguous: false, tags: ['build', 'failure'] },
  { subject: 'Hotfix: production memory leak', body: '프로덕션 서버에서 메모리 누수가 발견되었습니다. Node.js heap size가 지속적으로 증가합니다. 긴급 패치 필요.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'easy', isAmbiguous: false, tags: ['hotfix', 'production'] },
  { subject: 'CI/CD 파이프라인 개선 제안', body: '현재 빌드 시간이 15분입니다. 병렬 빌드와 캐시 최적화로 5분까지 단축 가능합니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['ci-cd', 'optimization'] },
  { subject: 'Database migration plan for v2.0', body: 'Schema migration plan for v2.0 release. Includes backward-compatible changes and rollback scripts.', fromDomain: 'company.co.kr', language: 'en', difficulty: 'medium', isAmbiguous: false, tags: ['database', 'migration'] },
  { subject: 'Kubernetes pod crash loop debugging', body: '프로덕션 K8s 클러스터에서 pod가 crash loop 상태입니다. 로그 분석과 디버깅 지원 부탁드립니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['kubernetes', 'debugging'] },
  { subject: 'Code refactoring proposal', body: 'classifier.ts 리팩토링 제안: rule engine을 strategy pattern으로 분리하면 테스트 용이성이 향상됩니다.', fromDomain: 'company.co.kr', language: 'mixed', difficulty: 'medium', isAmbiguous: false, tags: ['refactoring', 'architecture'] },
  { subject: 'Security patch deployment', body: 'Critical security vulnerability CVE-2026-XXXX patch가 준비되었습니다. 배포 승인 요청드립니다.', fromDomain: 'company.co.kr', language: 'en', difficulty: 'hard', isAmbiguous: true, alternativeCategory: 'CEO', conflictZone: 'ENGINEER vs CEO approval', tags: ['security', 'deployment', 'approval'] },
  { subject: '인프라 장비 교체 + 비용 문의', body: '프로덕션 서버 3대 교체가 필요합니다. 견적서와 함께 예산 승인 요청드립니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'hard', isAmbiguous: true, alternativeCategory: 'FINANCE', conflictZone: 'ENGINEER vs FINANCE infra cost', tags: ['infra', 'budget'] },
  { subject: 'Load testing results for new API', body: '새 API의 부하 테스트 결과 p95 응답시간 1.8초, 99.9% SLA 충족. 배포 가능 상태입니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['testing', 'performance'] },
  { subject: 'Dependency update PR', body: 'Updated all major dependencies. Breaking changes in Prisma v6 migration need review.', fromDomain: 'company.co.kr', language: 'en', difficulty: 'medium', isAmbiguous: false, tags: ['dependency', 'upgrade'] },
  { subject: 'Re: 버그 리포트 - 결제 모듈', body: '결제 모듈 버그 확인했습니다. 타임아웃 설정 문제입니다. 수정 PR 올렸습니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'hard', isAmbiguous: true, alternativeCategory: 'FINANCE', conflictZone: 'ENGINEER vs FINANCE payment bug', tags: ['bug-fix', 'payment'] },
];

// PM templates
const PM_TEMPLATES: Template[] = [
  { subject: 'Sprint 14 planning meeting', body: 'Sprint 14 planning은 월요일 오전 10시입니다. 백로그 우선순위 정리 부탁드립니다.', fromDomain: 'company.co.kr', language: 'mixed', difficulty: 'easy', isAmbiguous: false, tags: ['sprint', 'planning'] },
  { body: '프로젝트 마일스톤 2단계 완료 보고드립니다. 다음 단계 일정은 7월 초 예정입니다.', fromDomain: 'company.co.kr', language: 'ko', subject: '마일스톤 2 완료 보고', difficulty: 'easy', isAmbiguous: false, tags: ['milestone', 'report'] },
  { subject: '이슈 트래킹: 고객 요구사항 변경', body: '고객사에서 요구사항 변경이 발생했습니다. 영향 범위 분석 및 일정 조정이 필요합니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['issue', 'requirement-change'] },
  { subject: 'Resource allocation for Q3', body: 'Q3 인력 배분 계획 수립이 필요합니다. 현재 프로젝트별 리소스 현황 공유 부탁드립니다.', fromDomain: 'company.co.kr', language: 'en', difficulty: 'medium', isAmbiguous: false, tags: ['resource', 'planning'] },
  { subject: 'Release v3.0 go/no-go decision', body: 'v3.0 릴리스 go/no-go 결정이 필요합니다. QA 결과와 알려진 이슈를 검토해 주세요.', fromDomain: 'company.co.kr', language: 'mixed', difficulty: 'medium', isAmbiguous: true, alternativeCategory: 'ENGINEER', conflictZone: 'PM vs ENGINEER release', tags: ['release', 'decision'] },
  { subject: '주간 프로젝트 현황 공유', body: '주간 프로젝트 현황 보고서 공유드립니다. 리스크 2건과 이슈 3건이 있습니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'easy', isAmbiguous: false, tags: ['weekly-report', 'status'] },
  { subject: 'Task assignment - urgent bug triage', body: '프로덕션 버그 트라이아지 작업 배정합니다. 긴급도 높으므로 오늘 내 분석 완료 부탁드립니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'hard', isAmbiguous: true, alternativeCategory: 'ENGINEER', conflictZone: 'PM vs ENGINEER triage', tags: ['task', 'bug-triage'] },
  { subject: 'Cross-team coordination meeting', body: '마케팅-영업-개발 간 조율 미팅이 필요합니다. 다음 주 중 가능한 시간 알려주세요.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['coordination', 'meeting'] },
  { subject: 'Deadline extension request', body: '프로젝트 XYZ 마감 기한 연장이 필요합니다. 2주 연장 요청 사유서 첨부합니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['deadline', 'extension'] },
  { subject: 'Meeting + budget discussion', body: '다음 주 프로젝트 리뷰 미팅에서 예산 재배분도 함께 논의해야 합니다. 재무팀 참석 부탁드립니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'hard', isAmbiguous: true, alternativeCategory: 'FINANCE', conflictZone: 'PM vs FINANCE meeting', tags: ['meeting', 'budget'] },
  { subject: 'Agile retrospective notes', body: 'Sprint 13 회고 결과 공유. 3가지 개선 사항과 액션 아이템이 있습니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'easy', isAmbiguous: false, tags: ['retrospective', 'agile'] },
  { subject: 'Risk assessment for new feature', body: '새 기능 개발에 대한 리스크 평가가 필요합니다. 기술적 복잡성과 일정 리스크 분석 부탁드립니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['risk', 'assessment'] },
];

// FINANCE templates
const FINANCE_TEMPLATES: Template[] = [
  { subject: '6월 청구서 발행 안내', body: '6월분 청구서가 발행되었습니다. 검토 후 승인 부탁드립니다.', fromDomain: 'customer.com', language: 'ko', difficulty: 'easy', isAmbiguous: false, tags: ['invoice', 'billing'] },
  { subject: '세금계산서 발행 요청', body: 'ABC사 건에 대한 세금계산서 발행 요청드립니다. 사업자번호 확인 후 발행 부탁드립니다.', fromDomain: 'customer.com', language: 'ko', difficulty: 'easy', isAmbiguous: false, tags: ['tax-invoice'] },
  { subject: 'Expense report Q2', body: 'Q2 expense report attached. Total: 15,230,000 KRW. Approval needed by June 30.', fromDomain: 'company.co.kr', language: 'en', difficulty: 'easy', isAmbiguous: false, tags: ['expense', 'report'] },
  { subject: '예산 초과 알림 - 마케팅 비용', body: '이번 달 마케팅 비용이 예산 대비 120% 초과했습니다. 집행 중단 및 재검토가 필요합니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'medium', isAmbiguous: true, alternativeCategory: 'MARKETING', conflictZone: 'FINANCE vs MARKETING budget', tags: ['budget', 'overrun'] },
  { subject: '송금 확인 요청', body: '5월 건 송금이 완료되었는지 확인 부탁드립니다. 거래은행: 국민은행, 금액: 5,000만원', fromDomain: 'customer.com', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['transfer', 'confirmation'] },
  { subject: 'Annual budget planning', body: '내년도 예산 계획 수립을 위한 기초 자료 요청드립니다. 각 팀별 예산 신청서 제출 기한: 7/15', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['budget', 'annual-planning'] },
  { subject: '정산 관련 문의 - 법인카드', body: '이번 달 법인카드 사용 내역 정산이 누락되었습니다. 확인 후 처리 부탁드립니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'easy', isAmbiguous: false, tags: ['settlement', 'corporate-card'] },
  { body: '이번 분기 투자 수익률 분석 보고서입니다. ROI 15% 목표 대비 12% 달성했습니다.', fromDomain: 'company.co.kr', language: 'ko', subject: '투자 수익률 분석', difficulty: 'medium', isAmbiguous: false, tags: ['investment', 'roi'] },
  { subject: 'Contract payment terms review', body: '신규 계약서 결제 조건 검토 요청드립니다. 넷 30 vs 넷 60 조건 비교 분석이 필요합니다.', fromDomain: 'customer.com', language: 'mixed', difficulty: 'hard', isAmbiguous: true, alternativeCategory: 'SALES', conflictZone: 'FINANCE vs SALES contract', tags: ['contract', 'payment-terms'] },
  { subject: 'CEO 승인 필요 - 대금 지급', body: '해외 벤더 대금 지급 건(USD 50,000)에 대해 CEO 승인이 필요합니다. 지급 사유서 첨부합니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'hard', isAmbiguous: true, alternativeCategory: 'CEO', conflictZone: 'FINANCE vs CEO payment approval', tags: ['payment', 'approval', 'ceo'] },
  { subject: 'Re: 비용절감 방안 검토', body: '클라우드 비용 절감 방안 분석 완료했습니다. Reserved Instance 전환 시 연 30% 절감 가능합니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['cost-saving', 'cloud'] },
  { subject: 'Vendor payment overdue notice', body: '벤더사 결제가 30일 연체되었습니다. 즉시 처리 부탁드립니다. 미결 금액: 2,300만원', fromDomain: 'vendor.co.kr', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['overdue', 'vendor'] },
];

// MARKETING templates
const MARKETING_TEMPLATES: Template[] = [
  { subject: '7월 뉴스레터 초안 검토', body: '7월 뉴스레터 초안 공유드립니다. 콘텐츠와 디자인 검토 후 피드백 부탁드립니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'easy', isAmbiguous: false, tags: ['newsletter', 'review'] },
  { subject: 'Brand guideline update', body: '브랜드 가이드라인이 업데이트되었습니다. 새로운 로고 사용법과 컬러 팔레트를 확인해 주세요.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'easy', isAmbiguous: false, tags: ['brand', 'guideline'] },
  { subject: 'Social media campaign results', body: '6월 소셜 미디어 캠페인 결과: 도달률 150% 증가, engagement rate 4.2%. 보고서 첨부.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'easy', isAmbiguous: false, tags: ['social-media', 'campaign'] },
  { subject: '콘텐츠 마케팅 전략 수립', body: 'Q3 콘텐츠 마케팅 전략 문서 초안 작성 완료했습니다. 검토 후 실행 계획 수립 부탁드립니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['content', 'strategy'] },
  { subject: 'Promotion event planning', body: '여름 프로모션 이벤트 기획안입니다. 타겟: 기존 고객, 기간: 7/1~7/31, 할인율: 20%', fromDomain: 'company.co.kr', language: 'mixed', difficulty: 'medium', isAmbiguous: false, tags: ['promotion', 'event'] },
  { subject: 'Newsletter unsubscribe spike', body: '뉴스레터 구독 해지율이 급증했습니다. 콘텐츠 품질 점검과 발송 빈도 조정이 필요합니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['newsletter', 'analytics'] },
  { subject: 'Spam or legitimate marketing?', body: '외부에서 받은 프로모션 메일입니다. 마케팅 협업 제안인지 스팸인지 판단 부탁드립니다.', fromDomain: 'external-marketing.com', language: 'ko', difficulty: 'hard', isAmbiguous: true, alternativeCategory: 'WORK_SUPPORT', conflictZone: 'MARKETING vs spam', tags: ['spam', 'external'] },
  { subject: '마케팅 예산 + 재무 승인', body: 'Q3 마케팅 캠페인 예산 5천만원 편성했습니다. 재무팀 승인 후 집행하겠습니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'hard', isAmbiguous: true, alternativeCategory: 'FINANCE', conflictZone: 'MARKETING vs FINANCE budget', tags: ['budget', 'approval'] },
  { body: '고객사 인터뷰 콘텐츠 촬영이 예정되어 있습니다. 촬영 일정 및 장소 협의 부탁드립니다.', fromDomain: 'company.co.kr', language: 'ko', subject: '고객 인터뷰 촬영 일정', difficulty: 'medium', isAmbiguous: false, tags: ['content', 'production'] },
  { subject: 'SEO optimization report', body: 'Website SEO 분석 결과 상위 노출 키워드 12개 식별. 콘텐츠 최적화 작업이 필요합니다.', fromDomain: 'company.co.kr', language: 'mixed', difficulty: 'medium', isAmbiguous: false, tags: ['seo', 'optimization'] },
  { subject: 'Webinar invitation draft', body: '기술 웨비나 초안 작성 완료. 등록 페이지와 프로모션 자료 검토 부탁드립니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'easy', isAmbiguous: false, tags: ['webinar', 'event'] },
  { subject: 'Competitor marketing analysis', body: '경쟁사 마케팅 전략 분석 보고서입니다. SNS 활동, 꼐인 분석, 포지셔닝 비교 포함.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['competitive', 'analysis'] },
];

// CEO templates
const CEO_TEMPLATES: Template[] = [
  { subject: '[긴급] 대외 파트너십 건 승인 요청', body: '해외 벤더사와의 전략적 파트너십 계약 승인이 필요합니다. 계약서 요약본 첨부. 경영진 검토 후 승인 부탁드립니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'easy', isAmbiguous: false, tags: ['approval', 'partnership'] },
  { subject: 'CEO approval needed: policy change', body: '사내 보안 정책 변경에 대한 CEO 승인이 필요합니다. 변경 내용과 영향 범위를 검토해 주세요.', fromDomain: 'company.co.kr', language: 'en', difficulty: 'easy', isAmbiguous: false, tags: ['approval', 'policy'] },
  { subject: '긴급: 프로덕션 장애 보고', body: '프로덕션 서비스 장애가 발생했습니다. 고객 영향 범위: 전체. ETA 복구 2시간. 경영진 보고 필요.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'easy', isAmbiguous: false, tags: ['incident', 'urgent'] },
  { subject: '분기 실적 보고 및 전략 논의', body: '이번 분기 실적 보고서입니다. 매출 목표 대비 92% 달성. 전략 수정이 필요한 부분 논의 요청드립니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['performance', 'strategy'] },
  { subject: 'Board meeting preparation', body: '이사회 자료 준비가 필요합니다. Q2 실적, 하반기 전략, 리스크 보고서 포함.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['board', 'preparation'] },
  { subject: '대외 발표 자료 승인 요청', body: '국제 컨퍼런스 발표 자료 최종 승인이 필요합니다. 기술 내용과 NDA 준수 여부 확인 부탁드립니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['approval', 'external'] },
  { subject: 'CEO + 결제 승인 복합 건', body: '해외 벤더 대금 지급 건(USD 100,000)에 대해 경영진 승인이 필요합니다. 재무팀 검토 완료 상태입니다.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'hard', isAmbiguous: true, alternativeCategory: 'FINANCE', conflictZone: 'CEO vs FINANCE approval', tags: ['approval', 'payment', 'cross-functional'] },
  { body: 'CEO께 보고: 영업 대표의 고객 미팅 후속 조치가 필요합니다. 고객 불만 사항 해결 방안 검토 요청드립니다.', fromDomain: 'company.co.kr', language: 'ko', subject: '고객 클레임 대응 - 경영진 보고', difficulty: 'hard', isAmbiguous: true, alternativeCategory: 'SALES', conflictZone: 'CEO vs SALES customer issue', tags: ['customer', 'escalation'] },
  { subject: 'Urgent: regulatory compliance check', body: 'New regulation requires immediate compliance review. Legal and engineering teams need CEO directive.', fromDomain: 'company.co.kr', language: 'en', difficulty: 'medium', isAmbiguous: false, tags: ['compliance', 'regulatory'] },
  { subject: '인수 합의 건 승인 요청', body: '중소 SI 업체 인수 건에 대한 경영진 승인이 필요합니다. 실사 결과 보고서 첨부.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['m-and-a', 'approval'] },
  { subject: 'CEO 직접 지시: 비상경영회의', body: '다음 주 월요일 비상경영회의를 소집합니다. 모든 임원 참석 필수. 안건: 하반기 전략 재수립.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'easy', isAmbiguous: false, tags: ['emergency', 'meeting'] },
  { subject: 'Annual strategy review', body: '연간 전략 리뷰 문서 배포합니다. 각 사업부별 목표 대비 실적과 수정 전략을 준비해 주세요.', fromDomain: 'company.co.kr', language: 'ko', difficulty: 'medium', isAmbiguous: false, tags: ['strategy', 'annual'] },
];

const TEMPLATES_BY_CATEGORY: Record<PersonaType, Template[]> = {
  WORK_SUPPORT: WORK_SUPPORT_TEMPLATES,
  SALES: SALES_TEMPLATES,
  PRESALES: PRESALES_TEMPLATES,
  ENGINEER: ENGINEER_TEMPLATES,
  PM: PM_TEMPLATES,
  FINANCE: FINANCE_TEMPLATES,
  MARKETING: MARKETING_TEMPLATES,
  CEO: CEO_TEMPLATES,
};

const CATEGORY_TARGETS: Record<PersonaType, number> = {
  WORK_SUPPORT: 70,
  SALES: 70,
  PRESALES: 60,
  ENGINEER: 70,
  PM: 60,
  FINANCE: 60,
  MARKETING: 50,
  CEO: 60,
};

// ── Generator ──────────────────────────────────────────────────────────

function generateDataset(targetCount: number, seed: number): { entries: GoldenMailEntry[]; manifest: Manifest } {
  const rng = new SeededRandom(seed);
  const entries: GoldenMailEntry[] = [];
  let id = 1;

  const scale = targetCount / 500; // scale factor from base 500

  for (const [category, baseCount] of Object.entries(CATEGORY_TARGETS)) {
    const cat = category as PersonaType;
    const templates = TEMPLATES_BY_CATEGORY[cat];
    const count = Math.round(baseCount * scale);

    for (let i = 0; i < count; i++) {
      const template = templates[i % templates.length];
      const name = rng.pick([...NAMES_KO, ...NAMES_EN]);
      const domain = template.fromDomain;
      const variation = rng.int(1, 999);

      const entry: GoldenMailEntry = {
        id: `gm-${String(id).padStart(4, '0')}`,
        subject: template.subject,
        from: `${name.replace(/\s/g, '.').toLowerCase()}${variation}@${domain}`,
        to: [`team@${rng.pick(DOMAINS_INTERNAL)}`],
        body: template.body,
        receivedAt: `2026-06-${String(rng.int(1, 22)).padStart(2, '0')}T${String(rng.int(8, 18)).padStart(2, '0')}:00:00Z`,
        language: template.language,
        label: {
          category: cat,
          confidence: template.isAmbiguous ? rng.int(60, 80) / 100 : rng.int(85, 99) / 100,
          isAmbiguous: template.isAmbiguous,
          alternativeCategory: template.alternativeCategory,
          labeledBy: `labeler-${rng.int(1, 2)}`,
          reviewedBy: `reviewer-${rng.int(1, 2)}`,
          reviewNotes: template.isAmbiguous ? `Conflict zone: ${template.conflictZone}` : undefined,
        },
        metadata: {
          source: 'synthetic',
          difficulty: template.difficulty,
          conflictZone: template.conflictZone,
          tags: template.tags,
        },
      };
      entries.push(entry);
      id++;
    }
  }

  const shuffled = rng.shuffle(entries);

  // Build manifest
  const categoryDistribution: Record<string, number> = {};
  const difficultyDistribution: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
  const languageDistribution: Record<string, number> = { ko: 0, en: 0, mixed: 0 };
  let ambiguousCount = 0;

  for (const entry of shuffled) {
    categoryDistribution[entry.label.category] = (categoryDistribution[entry.label.category] || 0) + 1;
    difficultyDistribution[entry.metadata.difficulty]++;
    languageDistribution[entry.language]++;
    if (entry.label.isAmbiguous) ambiguousCount++;
  }

  const splitIdx = Math.floor(shuffled.length * 0.8);
  const manifest: Manifest = {
    version: 'classification-golden-v1',
    generatedAt: new Date().toISOString(),
    seed,
    totalCount: shuffled.length,
    ambiguousCount,
    categoryDistribution: categoryDistribution as Record<PersonaType, number>,
    difficultyDistribution,
    languageDistribution,
    splits: {
      eval: { count: splitIdx, ids: shuffled.slice(0, splitIdx).map(e => e.id) },
      promptDev: { count: shuffled.length - splitIdx, ids: shuffled.slice(splitIdx).map(e => e.id) },
    },
  };

  return { entries: shuffled, manifest };
}

// ── CLI ────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  let count = 500;
  let seed = 42;
  let outputDir = path.join(__dirname);

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count') count = parseInt(args[++i], 10);
    if (args[i] === '--seed') seed = parseInt(args[++i], 10);
    if (args[i] === '--output') outputDir = args[++i];
  }

  const { entries, manifest } = generateDataset(count, seed);

  fs.writeFileSync(
    path.join(outputDir, 'classification-golden-v1.json'),
    JSON.stringify(entries, null, 2),
  );
  fs.writeFileSync(
    path.join(outputDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
  );

  console.log(`Generated ${entries.length} entries`);
  console.log(`Ambiguous: ${manifest.ambiguousCount} (${((manifest.ambiguousCount / manifest.totalCount) * 100).toFixed(1)}%)`);
  console.log(`Splits: eval=${manifest.splits.eval.count}, promptDev=${manifest.splits.promptDev.count}`);
  console.log('Category distribution:');
  for (const [cat, cnt] of Object.entries(manifest.categoryDistribution)) {
    console.log(`  ${cat}: ${cnt}`);
  }
}

main();
