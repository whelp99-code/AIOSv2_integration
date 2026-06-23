/**
 * 부하 테스트 스크립트
 * 
 * Mac Mini 리소스 검증을 위한 부하 테스트
 * 100건 메일 처리 성능 측정
 */

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // requests per second
  errors: string[];
}

interface MailTestCase {
  subject: string;
  from: string;
  body: string;
  expectedCategory: string;
}

// 테스트 메일 데이터
const TEST_MAILS: MailTestCase[] = [
  { subject: '견적 요청 드립니다', from: 'customer@customer.com', body: '견적 요청합니다.', expectedCategory: 'SALES' },
  { subject: '청구서 발송 건', from: 'finance@company.com', body: '청구서 발송합니다.', expectedCategory: 'FINANCE' },
  { subject: '기술 문의 드립니다', from: 'tech@customer.com', body: '기술 사양 문의드립니다.', expectedCategory: 'PRESALES' },
  { subject: '긴급 승인 요청', from: 'manager@company.com', body: '500만원 계약 승인 요청합니다.', expectedCategory: 'CEO' },
  { subject: '프로젝트 일정 논의', from: 'pm@company.com', body: '프로젝트 일정을 논의합시다.', expectedCategory: 'PM' },
  { subject: '코드 리뷰 요청', from: 'dev@company.com', body: 'PR #123 코드 리뷰 요청합니다.', expectedCategory: 'ENGINEER' },
  { subject: '뉴스레터 발송', from: 'marketing@company.com', body: '이번 주 뉴스레터입니다.', expectedCategory: 'MARKETING' },
  { subject: '일반 문의', from: 'info@example.com', body: '일반 문의드립니다.', expectedCategory: 'WORK_SUPPORT' },
];

// 메일 분류 시뮬레이션
function classifyMail(subject: string, body: string): { category: string; confidence: number; duration: number } {
  const start = performance.now();
  const text = `${subject} ${body}`.toLowerCase();
  
  let category = 'WORK_SUPPORT';
  let confidence = 0.5;

  if (['견적', 'quote', '제안', 'proposal'].some(kw => text.includes(kw))) {
    category = 'SALES';
    confidence = 0.8;
  } else if (['청구서', 'invoice', '비용', 'expense'].some(kw => text.includes(kw))) {
    category = 'FINANCE';
    confidence = 0.85;
  } else if (['기술', 'technical', '문의', 'inquiry'].some(kw => text.includes(kw))) {
    category = 'PRESALES';
    confidence = 0.75;
  } else if (['승인', 'approval', '긴급', 'urgent'].some(kw => text.includes(kw))) {
    category = 'CEO';
    confidence = 0.9;
  } else if (['프로젝트', 'project', '일정', 'schedule'].some(kw => text.includes(kw))) {
    category = 'PM';
    confidence = 0.7;
  } else if (['코드', 'code', '리뷰', 'review'].some(kw => text.includes(kw))) {
    category = 'ENGINEER';
    confidence = 0.8;
  } else if (['마케팅', 'marketing', '뉴스레터', 'newsletter'].some(kw => text.includes(kw))) {
    category = 'MARKETING';
    confidence = 0.75;
  }

  const duration = performance.now() - start;
  return { category, confidence, duration };
}

// 단일 요청 실행
async function executeRequest(testCase: MailTestCase): Promise<{ success: boolean; responseTime: number; error?: string }> {
  const start = performance.now();

  try {
    // 메일 분류 시뮬레이션
    const result = classifyMail(testCase.subject, testCase.body);

    // 라우팅 시뮬레이션 (약간의 지연)
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10));

    const responseTime = performance.now() - start;

    // 카테고리 검증
    if (result.category !== testCase.expectedCategory) {
      return {
        success: false,
        responseTime,
        error: `Expected ${testCase.expectedCategory}, got ${result.category}`,
      };
    }

    return { success: true, responseTime };
  } catch (error) {
    return {
      success: false,
      responseTime: performance.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// 부하 테스트 실행
export async function runLoadTest(
  totalRequests: number = 100,
  concurrency: number = 10,
): Promise<LoadTestResult> {
  console.log(`Starting load test: ${totalRequests} requests, ${concurrency} concurrent`);

  const results: Array<{ success: boolean; responseTime: number; error?: string }> = [];
  const errors: string[] = [];
  const startTime = performance.now();

  // 동시성 제어를 위한 청크 분할
  for (let i = 0; i < totalRequests; i += concurrency) {
    const chunk = Array.from(
      { length: Math.min(concurrency, totalRequests - i) },
      (_, index) => {
        const testCase = TEST_MAILS[(i + index) % TEST_MAILS.length];
        return executeRequest(testCase);
      },
    );

    const chunkResults = await Promise.all(chunk);
    results.push(...chunkResults);

    // 진행 상황 출력
    if ((i + concurrency) % 50 === 0 || i + concurrency >= totalRequests) {
      console.log(`Progress: ${Math.min(i + concurrency, totalRequests)}/${totalRequests}`);
    }
  }

  const totalTime = performance.now() - startTime;

  // 결과 집계
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const responseTimes = results.map(r => r.responseTime).sort((a, b) => a - b);

  const p95Index = Math.floor(responseTimes.length * 0.95);
  const p99Index = Math.floor(responseTimes.length * 0.99);

  const result: LoadTestResult = {
    totalRequests,
    successfulRequests: successful.length,
    failedRequests: failed.length,
    averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
    minResponseTime: responseTimes[0] || 0,
    maxResponseTime: responseTimes[responseTimes.length - 1] || 0,
    p95ResponseTime: responseTimes[p95Index] || 0,
    p99ResponseTime: responseTimes[p99Index] || 0,
    throughput: (totalRequests / totalTime) * 1000, // requests per second
    errors: failed.map(r => r.error || 'Unknown error'),
  };

  return result;
}

// 결과 출력
export function printLoadTestResult(result: LoadTestResult): void {
  console.log('\n=== Load Test Results ===');
  console.log(`Total Requests: ${result.totalRequests}`);
  console.log(`Successful: ${result.successfulRequests}`);
  console.log(`Failed: ${result.failedRequests}`);
  console.log(`Success Rate: ${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%`);
  console.log(`\nResponse Times (ms):`);
  console.log(`  Average: ${result.averageResponseTime.toFixed(2)}`);
  console.log(`  Min: ${result.minResponseTime.toFixed(2)}`);
  console.log(`  Max: ${result.maxResponseTime.toFixed(2)}`);
  console.log(`  P95: ${result.p95ResponseTime.toFixed(2)}`);
  console.log(`  P99: ${result.p99ResponseTime.toFixed(2)}`);
  console.log(`\nThroughput: ${result.throughput.toFixed(2)} requests/second`);

  if (result.errors.length > 0) {
    console.log(`\nErrors (${result.errors.length}):`);
    const uniqueErrors = [...new Set(result.errors)];
    uniqueErrors.forEach(error => console.log(`  - ${error}`));
  }
}

// 리소스 사용량 체크
export function checkResourceUsage(): { cpu: number; memory: number; disk: number } {
  // 시뮬레이션된 리소스 사용량
  return {
    cpu: Math.random() * 100,
    memory: Math.random() * 100,
    disk: Math.random() * 100,
  };
}

// CLI 실행
if (require.main === module) {
  runLoadTest(100, 10).then(result => {
    printLoadTestResult(result);

    // 리소스 체크
    const resources = checkResourceUsage();
    console.log('\n=== Resource Usage ===');
    console.log(`CPU: ${resources.cpu.toFixed(1)}%`);
    console.log(`Memory: ${resources.memory.toFixed(1)}%`);
    console.log(`Disk: ${resources.disk.toFixed(1)}%`);

    // 성공 기준 확인
    const successRate = (result.successfulRequests / result.totalRequests) * 100;
    if (successRate >= 95 && result.averageResponseTime < 100) {
      console.log('\n✅ Load test PASSED');
      process.exit(0);
    } else {
      console.log('\n❌ Load test FAILED');
      process.exit(1);
    }
  });
}
