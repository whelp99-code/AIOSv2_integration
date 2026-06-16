import {
  createAgentTask,
  getLifecycleStore,
  jsonError,
  jsonOk,
  parseJsonBody,
  startLifecycleWorkflowRun,
} from "@/lib/lifecycle/lifecycle-api";
import type { AgentTaskType } from "@aios/domain";

const VALID_TYPES: AgentTaskType[] = [
  "mail-reply",
  "entity-resolution",
  "opportunity-scoring",
  "proposal-writing",
  "poc-planning",
  "maintenance-triage",
];

export async function GET() {
  const store = getLifecycleStore();
  return jsonOk({
    agentTasks: [...store.agentTasks.values()],
    workflowRuns: [...store.workflowRuns.values()],
  });
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{
      type?: AgentTaskType;
      targetRef?: string;
      input?: Record<string, unknown>;
      requestedBy?: string;
      startRun?: boolean;
      source?: "f-aios-v3" | "mcp-workflow" | "vibe-coding" | "local";
      upstreamAvailable?: boolean;
    }>(request);

    if (!body.type || !body.targetRef) {
      return jsonError("type and targetRef are required");
    }
    if (!VALID_TYPES.includes(body.type)) {
      return jsonError(`Invalid agent task type: ${body.type}`);
    }

    const task = createAgentTask({
      type: body.type,
      targetRef: body.targetRef,
      input: body.input,
      requestedBy: body.requestedBy || "lifecycle-api",
    });

    let workflowRun = null;
    if (body.startRun) {
      workflowRun = startLifecycleWorkflowRun({
        agentTaskId: task.id,
        source: body.source || "f-aios-v3",
        upstreamRef: `/api/aios-v3/workflows/run`,
        requestedBy: body.requestedBy || "lifecycle-api",
        upstreamAvailable: body.upstreamAvailable,
      });
    }

    return jsonOk({ agentTask: task, workflowRun }, 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Agent task failed",
      500,
    );
  }
}
