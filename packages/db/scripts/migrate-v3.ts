/**
 * AIOS v3 (F-aios-v3) → v2 통합 마이그레이션 스크립트
 *
 * v3의 Workflow 엔진 데이터를 v2 통합 스키마로 마이그레이션합니다.
 * - Workflow의 config JSON에서 steps를 추출하여 WorkflowStep 테이블 생성
 * - Workflow에 startStep, variables 필드 보완
 * - WorkflowExecution에 stepResults 필드 보완
 *
 * 실행: npx tsx scripts/migrate-v3.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MigrationResult {
  table: string;
  migrated: number;
  skipped: number;
  errors: string[];
}

interface V3StepConfig {
  id: string;
  name: string;
  type: string;
  config?: Record<string, unknown>;
  nextSteps?: string[];
  timeout?: number;
  retryPolicy?: { maxRetries: number; delayMs: number };
}

interface V3WorkflowConfig {
  steps?: V3StepConfig[];
  startStep?: string;
  variables?: Record<string, unknown>;
}

/**
 * Workflow의 config JSON에서 WorkflowStep 레코드 생성
 */
async function migrateWorkflowSteps(): Promise<MigrationResult> {
  const result: MigrationResult = { table: 'workflow_steps', migrated: 0, skipped: 0, errors: [] };

  try {
    const workflows = await prisma.workflow.findMany({
      include: { steps: true },
    });

    for (const workflow of workflows) {
      // 이미 steps가 있으면 스킵
      if (workflow.steps.length > 0) {
        result.skipped++;
        continue;
      }

      const config = workflow.config as V3WorkflowConfig | null;
      if (!config?.steps || !Array.isArray(config.steps)) {
        result.skipped++;
        continue;
      }

      try {
        for (let i = 0; i < config.steps.length; i++) {
          const step = config.steps[i];
          await prisma.workflowStep.create({
            data: {
              workflowId: workflow.id,
              name: step.name,
              type: step.type || 'action',
              stepOrder: i,
              config: step.config || {},
              nextSteps: step.nextSteps || [],
              timeout: step.timeout || null,
              retryPolicy: step.retryPolicy || null,
            },
          });
        }

        // Workflow에 startStep, variables 보완
        await prisma.workflow.update({
          where: { id: workflow.id },
          data: {
            startStep: config.startStep || (config.steps[0]?.id ?? null),
            variables: config.variables || {},
          },
        });

        result.migrated++;
      } catch (err) {
        result.errors.push(`Workflow ${workflow.id}: ${String(err)}`);
      }
    }
  } catch (err) {
    result.errors.push(`WorkflowStep migration failed: ${String(err)}`);
  }

  return result;
}

/**
 * WorkflowExecution의 stepResults 보완
 * - output에 step별 결과가 포함되어 있는 경우 stepResults 필드로 추출
 */
async function migrateExecutionStepResults(): Promise<MigrationResult> {
  const result: MigrationResult = { table: 'workflow_executions', migrated: 0, skipped: 0, errors: [] };

  try {
    const executions = await prisma.workflowExecution.findMany({
      where: { stepResults: null },
    });

    for (const execution of executions) {
      // output이 있고 stepResults 구조를 포함하고 있으면 추출
      const output = execution.output as Record<string, unknown> | null;
      if (output && typeof output === 'object' && 'stepResults' in output) {
        try {
          const stepResults = (output as { stepResults: unknown }).stepResults;
          await prisma.workflowExecution.update({
            where: { id: execution.id },
            data: { stepResults: stepResults },
          });
          result.migrated++;
        } catch (err) {
          result.errors.push(`WorkflowExecution ${execution.id}: ${String(err)}`);
        }
      } else {
        result.skipped++;
      }
    }
  } catch (err) {
    result.errors.push(`Execution stepResults migration failed: ${String(err)}`);
  }

  return result;
}

/**
 * Workflow status 표준화
 * - v3의 상태값('draft', 'paused' 등)을 v2 표준으로 매핑
 */
async function normalizeWorkflowStatus(): Promise<MigrationResult> {
  const result: MigrationResult = { table: 'workflows_status', migrated: 0, skipped: 0, errors: [] };

  const statusMapping: Record<string, string> = {
    draft: 'active',
    paused: 'active',
    running: 'active',
    archived: 'active',
  };

  try {
    for (const [oldStatus, newStatus] of Object.entries(statusMapping)) {
      const updated = await prisma.workflow.updateMany({
        where: { status: oldStatus },
        data: { status: newStatus },
      });
      result.migrated += updated.count;
    }

    const total = await prisma.workflow.count();
    result.skipped = total - result.migrated;
  } catch (err) {
    result.errors.push(`Workflow status normalization failed: ${String(err)}`);
  }

  return result;
}

async function main() {
  console.log('🚀 AIOS v3 → v2 마이그레이션 시작...\n');

  const results: MigrationResult[] = [];

  results.push(await migrateWorkflowSteps());
  results.push(await migrateExecutionStepResults());
  results.push(await normalizeWorkflowStatus());

  console.log('\n📊 마이그레이션 결과:');
  console.log('─'.repeat(60));

  let totalMigrated = 0;
  let totalErrors = 0;

  for (const result of results) {
    const status = result.errors.length > 0 ? '⚠️' : '✅';
    console.log(`${status} ${result.table}: ${result.migrated} migrated, ${result.skipped} skipped`);
    if (result.errors.length > 0) {
      for (const err of result.errors) {
        console.log(`   ❌ ${err}`);
      }
    }
    totalMigrated += result.migrated;
    totalErrors += result.errors.length;
  }

  console.log('─'.repeat(60));
  console.log(`총 ${totalMigrated}건 마이그레이션, ${totalErrors}건 에러`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
