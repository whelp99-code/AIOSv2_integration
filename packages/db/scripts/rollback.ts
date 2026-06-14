/**
 * DB 롤백 스크립트
 *
 * 마이그레이션 롤백을 수행합니다.
 * - WorkflowStep 데이터 삭제
 * - Workflow의 startStep, variables 필드 초기화
 * - WorkflowExecution의 stepResults 필드 초기화
 *
 * 실행: npx tsx scripts/rollback.ts [--target=v1|v3|all]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type RollbackTarget = 'v1' | 'v3' | 'all';

interface RollbackResult {
  table: string;
  rolledBack: number;
  errors: string[];
}

/**
 * v3 마이그레이션 롤백
 * - WorkflowStep 레코드 삭제
 * - Workflow startStep, variables 초기화
 * - WorkflowExecution stepResults 초기화
 */
async function rollbackV3(): Promise<RollbackResult[]> {
  const results: RollbackResult[] = [];

  // WorkflowStep 삭제
  try {
    const deleted = await prisma.workflowStep.deleteMany({});
    results.push({ table: 'workflow_steps', rolledBack: deleted.count, errors: [] });
  } catch (err) {
    results.push({ table: 'workflow_steps', rolledBack: 0, errors: [String(err)] });
  }

  // Workflow startStep, variables 초기화
  try {
    const updated = await prisma.workflow.updateMany({
      data: { startStep: null, variables: null },
    });
    results.push({ table: 'workflows(startStep/variables)', rolledBack: updated.count, errors: [] });
  } catch (err) {
    results.push({ table: 'workflows(startStep/variables)', rolledBack: 0, errors: [String(err)] });
  }

  // WorkflowExecution stepResults 초기화
  try {
    const updated = await prisma.workflowExecution.updateMany({
      where: { stepResults: { not: null } },
      data: { stepResults: null },
    });
    results.push({ table: 'workflow_executions(stepResults)', rolledBack: updated.count, errors: [] });
  } catch (err) {
    results.push({ table: 'workflow_executions(stepResults)', rolledBack: 0, errors: [String(err)] });
  }

  return results;
}

/**
 * v1 마이그레이션 롤백
 * - system-migration-v1 userId를 빈 문자열로 복원
 * - MailMessage status를 null로 복원
 * - KnowledgeDocument tags를 빈 배열로 복원
 */
async function rollbackV1(): Promise<RollbackResult[]> {
  const results: RollbackResult[] = [];

  // Customer userId 롤백
  try {
    const updated = await prisma.customer.updateMany({
      where: { userId: 'system-migration-v1' },
      data: { userId: '' },
    });
    results.push({ table: 'customers(userId)', rolledBack: updated.count, errors: [] });
  } catch (err) {
    results.push({ table: 'customers(userId)', rolledBack: 0, errors: [String(err)] });
  }

  // Partner userId 롤백
  try {
    const updated = await prisma.partner.updateMany({
      where: { userId: 'system-migration-v1' },
      data: { userId: '' },
    });
    results.push({ table: 'partners(userId)', rolledBack: updated.count, errors: [] });
  } catch (err) {
    results.push({ table: 'partners(userId)', rolledBack: 0, errors: [String(err)] });
  }

  // MailMessage status 롤백
  try {
    const updated = await prisma.mailMessage.updateMany({
      where: { status: 'unread' },
      data: { status: null },
    });
    results.push({ table: 'mail_messages(status)', rolledBack: updated.count, errors: [] });
  } catch (err) {
    results.push({ table: 'mail_messages(status)', rolledBack: 0, errors: [String(err)] });
  }

  // KnowledgeDocument tags 롤백
  try {
    const updated = await prisma.knowledgeDocument.updateMany({
      where: { tags: { equals: ['uncategorized'] } },
      data: { tags: [] },
    });
    results.push({ table: 'knowledge_documents(tags)', rolledBack: updated.count, errors: [] });
  } catch (err) {
    results.push({ table: 'knowledge_documents(tags)', rolledBack: 0, errors: [String(err)] });
  }

  return results;
}

async function main() {
  const targetArg = process.argv.find((arg) => arg.startsWith('--target='));
  const target: RollbackTarget = targetArg
    ? (targetArg.split('=')[1] as RollbackTarget)
    : 'all';

  console.log(`🔄 롤백 시작 (target: ${target})...\n`);

  let results: RollbackResult[] = [];

  if (target === 'v3' || target === 'all') {
    results.push(...(await rollbackV3()));
  }

  if (target === 'v1' || target === 'all') {
    results.push(...(await rollbackV1()));
  }

  console.log('\n📊 롤백 결과:');
  console.log('─'.repeat(60));

  let totalRolledBack = 0;
  let totalErrors = 0;

  for (const result of results) {
    const status = result.errors.length > 0 ? '⚠️' : '✅';
    console.log(`${status} ${result.table}: ${result.rolledBack} rolled back`);
    if (result.errors.length > 0) {
      for (const err of result.errors) {
        console.log(`   ❌ ${err}`);
      }
    }
    totalRolledBack += result.rolledBack;
    totalErrors += result.errors.length;
  }

  console.log('─'.repeat(60));
  console.log(`총 ${totalRolledBack}건 롤백, ${totalErrors}건 에러`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
