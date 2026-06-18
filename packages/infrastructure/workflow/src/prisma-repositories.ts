import { Prisma, PrismaClient } from '@prisma/client';
import type {
  Workflow,
  WorkflowExecution,
  WorkflowExecutionEvent,
  WorkflowExecutionRepository,
  WorkflowRepository,
} from '@aios/domain-workflow';

type PrismaWorkflowWithSteps = Prisma.WorkflowGetPayload<{
  include: { steps: true };
}>;

export class PrismaWorkflowRepository implements WorkflowRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Workflow | null> {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    return workflow ? mapWorkflow(workflow) : null;
  }

  async findAll(options: { userId?: string; status?: string } = {}): Promise<Workflow[]> {
    const workflows = await this.prisma.workflow.findMany({
      where: {
        userId: options.userId,
        status: options.status,
      },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
    return workflows.map(mapWorkflow);
  }

  async save(workflow: Workflow): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { id: workflow.userId },
        update: {},
        create: {
          id: workflow.userId,
          email: `${workflow.userId.replace(/[^a-zA-Z0-9._-]/g, '-')}@automation.aios.local`,
          name: workflow.userId,
        },
      });
      await tx.workflow.create({
        data: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        type: workflow.type,
        status: workflow.status,
        startStep: workflow.startStep,
        variables: toJson(workflow.variables),
        version: workflow.version,
        source: workflow.source,
        userId: workflow.userId,
        createdAt: new Date(workflow.createdAt),
        updatedAt: new Date(workflow.updatedAt),
          steps: {
            create: workflow.steps.map((step, index) => ({
              id: step.id,
              name: step.name,
              type: step.type,
              stepOrder: index,
              config: toJson(step.config),
              nextSteps: step.nextSteps ?? [],
              timeout: step.timeout,
              retryPolicy: toJson(step.retryPolicy),
            })),
          },
        },
      });
    });
  }

  async update(id: string, updates: Partial<Workflow>): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.workflow.update({
        where: { id },
        data: {
          name: updates.name,
          description: updates.description,
          type: updates.type,
          status: updates.status,
          startStep: updates.startStep,
          variables: toJson(updates.variables),
          version: updates.version,
          source: updates.source,
          updatedAt: updates.updatedAt ? new Date(updates.updatedAt) : new Date(),
        },
      });

      if (updates.steps) {
        await tx.workflowStep.deleteMany({ where: { workflowId: id } });
        for (const [index, step] of updates.steps.entries()) {
          await tx.workflowStep.create({
            data: {
              id: step.id,
              workflowId: id,
              name: step.name,
              type: step.type,
              stepOrder: index,
              config: toJson(step.config),
              nextSteps: step.nextSteps ?? [],
              timeout: step.timeout,
              retryPolicy: toJson(step.retryPolicy),
            },
          });
        }
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.workflow.delete({ where: { id } });
  }
}

export class PrismaWorkflowExecutionRepository implements WorkflowExecutionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<WorkflowExecution | null> {
    const execution = await this.prisma.workflowExecution.findUnique({ where: { id } });
    return execution ? mapExecution(execution) : null;
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<WorkflowExecution | null> {
    const execution = await this.prisma.workflowExecution.findUnique({
      where: { idempotencyKey },
    });
    return execution ? mapExecution(execution) : null;
  }

  async findByWorkflowId(workflowId: string): Promise<WorkflowExecution[]> {
    const executions = await this.prisma.workflowExecution.findMany({
      where: { workflowId },
      orderBy: { createdAt: 'desc' },
    });
    return executions.map(mapExecution);
  }

  async save(execution: WorkflowExecution): Promise<void> {
    await this.prisma.workflowExecution.create({
      data: {
        id: execution.id,
        workflowId: execution.workflowId,
        status: execution.status,
        input: toJson(execution.input),
        output: toJson(execution.output),
        error: execution.error,
        stepResults: toJson(execution.stepResults),
        mode: execution.mode,
        engine: execution.engine,
        approvalId: execution.approvalId,
        requestedBy: execution.requestedBy,
        idempotencyKey: execution.idempotencyKey,
        traceId: execution.traceId,
        heartbeatAt: execution.heartbeatAt ? new Date(execution.heartbeatAt) : undefined,
        attempt: execution.attempt,
        metadata: toJson(execution.metadata),
        startedAt: new Date(execution.startedAt),
        completedAt: execution.completedAt ? new Date(execution.completedAt) : undefined,
        createdAt: new Date(execution.createdAt),
      },
    });
  }

  async update(id: string, updates: Partial<WorkflowExecution>): Promise<void> {
    await this.prisma.workflowExecution.update({
      where: { id },
      data: {
        status: updates.status,
        input: toJson(updates.input),
        output: toJson(updates.output),
        error: updates.error,
        stepResults: toJson(updates.stepResults),
        mode: updates.mode,
        engine: updates.engine,
        approvalId: updates.approvalId,
        requestedBy: updates.requestedBy,
        traceId: updates.traceId,
        heartbeatAt: updates.heartbeatAt ? new Date(updates.heartbeatAt) : undefined,
        attempt: updates.attempt,
        metadata: toJson(updates.metadata),
        completedAt: updates.completedAt ? new Date(updates.completedAt) : undefined,
      },
    });
  }

  async appendEvent(event: WorkflowExecutionEvent): Promise<void> {
    await this.prisma.workflowExecutionEvent.create({
      data: {
        id: event.id,
        executionId: event.executionId,
        sequence: event.sequence,
        type: event.type,
        payload: toJson(event.payload) ?? {},
        createdAt: new Date(event.createdAt),
      },
    });
  }

  async listEvents(executionId: string, afterSequence = -1): Promise<WorkflowExecutionEvent[]> {
    const events = await this.prisma.workflowExecutionEvent.findMany({
      where: { executionId, sequence: { gt: afterSequence } },
      orderBy: { sequence: 'asc' },
    });
    return events.map((event) => ({
      id: event.id,
      executionId: event.executionId,
      sequence: event.sequence,
      type: event.type,
      payload: event.payload as Record<string, unknown>,
      createdAt: event.createdAt.toISOString(),
    }));
  }
}

function mapWorkflow(workflow: PrismaWorkflowWithSteps): Workflow {
  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description ?? undefined,
    type: workflow.type,
    status: workflow.status as Workflow['status'],
    steps: workflow.steps.map((step) => ({
      id: step.id,
      name: step.name,
      type: step.type as Workflow['steps'][number]['type'],
      config: step.config as Record<string, unknown>,
      nextSteps: step.nextSteps,
      timeout: step.timeout ?? undefined,
      retryPolicy: step.retryPolicy as Workflow['steps'][number]['retryPolicy'],
    })),
    startStep: workflow.startStep ?? workflow.steps[0]?.id ?? '',
    variables: workflow.variables as Record<string, unknown> | undefined,
    version: workflow.version,
    source: workflow.source,
    userId: workflow.userId,
    createdAt: workflow.createdAt.toISOString(),
    updatedAt: workflow.updatedAt.toISOString(),
  };
}

function mapExecution(
  execution: Prisma.WorkflowExecutionGetPayload<Record<string, never>>,
): WorkflowExecution {
  return {
    id: execution.id,
    workflowId: execution.workflowId,
    status: execution.status as WorkflowExecution['status'],
    input: execution.input as Record<string, unknown> | undefined,
    output: execution.output as Record<string, unknown> | undefined,
    error: execution.error ?? undefined,
    stepResults: execution.stepResults as WorkflowExecution['stepResults'],
    mode: execution.mode as WorkflowExecution['mode'],
    engine: execution.engine ?? undefined,
    approvalId: execution.approvalId ?? undefined,
    requestedBy: execution.requestedBy ?? undefined,
    idempotencyKey: execution.idempotencyKey ?? undefined,
    traceId: execution.traceId ?? undefined,
    heartbeatAt: execution.heartbeatAt?.toISOString(),
    attempt: execution.attempt,
    metadata: execution.metadata as Record<string, unknown> | undefined,
    startedAt: execution.startedAt.toISOString(),
    completedAt: execution.completedAt?.toISOString(),
    createdAt: execution.createdAt.toISOString(),
  };
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  return value === undefined ? undefined : (value as Prisma.InputJsonValue);
}

let workflowPrisma: PrismaClient | undefined;

export function createPrismaWorkflowRepositories(): {
  workflowRepository: PrismaWorkflowRepository;
  executionRepository: PrismaWorkflowExecutionRepository;
} {
  workflowPrisma ??= new PrismaClient();
  return {
    workflowRepository: new PrismaWorkflowRepository(workflowPrisma),
    executionRepository: new PrismaWorkflowExecutionRepository(workflowPrisma),
  };
}
