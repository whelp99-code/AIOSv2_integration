import {
  createImprovementTaskWithPersistence,
  createSolutionCandidateWithPersistence,
  linkImprovementToVibeProjectWithPersistence,
} from "@/lib/lifecycle/lifecycle-mutations";
import {
  getLifecycleStore,
  jsonError,
  jsonOk,
  parseJsonBody,
} from "@/lib/lifecycle/lifecycle-api";

export async function GET() {
  const store = getLifecycleStore();
  return jsonOk({
    improvementTasks: [...store.improvementTasks.values()],
    devProjects: [...store.devProjects.values()],
    solutionCandidates: [...store.solutionCandidates.values()],
  });
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{
      action?: "create" | "link-vibe" | "solution-candidate";
      title?: string;
      description?: string;
      sourceType?: "lifecycle" | "maintenance" | "manual";
      sourceRef?: string;
      requestedBy?: string;
      improvementTaskId?: string;
      vibeProjectRef?: string;
      projectName?: string;
    }>(request);

    const requestedBy = body.requestedBy || "lifecycle-api";

    if (body.action === "link-vibe") {
      if (!body.improvementTaskId || !body.vibeProjectRef) {
        return jsonError("improvementTaskId and vibeProjectRef are required");
      }
      const devProject = await linkImprovementToVibeProjectWithPersistence({
        improvementTaskId: body.improvementTaskId,
        vibeProjectRef: body.vibeProjectRef,
        projectName: body.projectName || "Vibe Dev Project",
        requestedBy,
      });
      return jsonOk({ devProject }, 201);
    }

    if (body.action === "solution-candidate") {
      if (!body.title) {
        return jsonError("title is required");
      }
      const candidate = await createSolutionCandidateWithPersistence({
        title: body.title,
        description: body.description,
        improvementTaskId: body.improvementTaskId,
        requestedBy,
      });
      return jsonOk({ solutionCandidate: candidate }, 201);
    }

    if (!body.title) {
      return jsonError("title is required");
    }

    const task = await createImprovementTaskWithPersistence({
      title: body.title,
      description: body.description,
      sourceType: body.sourceType || "lifecycle",
      sourceRef: body.sourceRef,
      requestedBy,
    });

    return jsonOk({ improvementTask: task }, 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Improvement task failed",
      500,
    );
  }
}
