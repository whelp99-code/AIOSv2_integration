import { createMaintenanceCaseWithPersistence } from "@/lib/lifecycle/lifecycle-mutations";
import {
  gatedDeviceControl,
  getHydratedLifecycleStore,
  jsonError,
  jsonOk,
  parseJsonBody,
} from "@/lib/lifecycle/lifecycle-api";

export async function GET() {
  const store = await getHydratedLifecycleStore();
  return jsonOk({ cases: [...store.maintenanceCases.values()] });
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{
      customerProductId?: string;
      caseType?: "support" | "inspection" | "incident" | "change";
      title?: string;
      description?: string;
      mcpWorkflowRef?: string;
      sangforRouteRef?: string;
      requestedBy?: string;
      deviceControl?: boolean;
      approvalId?: string;
    }>(request);

    if (!body.customerProductId || !body.title) {
      return jsonError("customerProductId and title are required");
    }

    if (body.deviceControl) {
      const gate = await gatedDeviceControl(
        request,
        "maintenance-device-control",
        `Device control for maintenance: ${body.title}`,
        { approvalId: body.approvalId, requestedBy: body.requestedBy },
      );
      if (!gate.allowed) {
        return gate.response;
      }
    }

    const maintenanceCase = await createMaintenanceCaseWithPersistence({
      customerProductId: body.customerProductId,
      caseType: body.caseType || "support",
      title: body.title,
      description: body.description,
      mcpWorkflowRef: body.mcpWorkflowRef,
      sangforRouteRef: body.sangforRouteRef,
      requestedBy: body.requestedBy || "lifecycle-api",
    });

    return jsonOk({ maintenanceCase }, 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Maintenance case failed",
      500,
    );
  }
}
