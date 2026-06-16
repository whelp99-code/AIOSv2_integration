import { createCustomerProductWithPersistence } from "@/lib/lifecycle/lifecycle-mutations";
import { getHydratedLifecycleStore, jsonError, jsonOk, parseJsonBody } from "@/lib/lifecycle/lifecycle-api";

export async function GET() {
  const store = await getHydratedLifecycleStore();
  return jsonOk({ products: [...store.customerProducts.values()] });
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{
      projectId?: string;
      customerId?: string;
      productName?: string;
      version?: string;
      requestedBy?: string;
    }>(request);

    if (!body.projectId || !body.customerId || !body.productName) {
      return jsonError("projectId, customerId, and productName are required");
    }

    const product = await createCustomerProductWithPersistence({
      projectId: body.projectId,
      customerId: body.customerId,
      productName: body.productName,
      version: body.version,
      requestedBy: body.requestedBy || "lifecycle-api",
    });

    return jsonOk({ product }, 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Product creation failed",
      500,
    );
  }
}
