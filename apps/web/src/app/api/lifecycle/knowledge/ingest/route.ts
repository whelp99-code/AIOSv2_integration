import {
  jsonError,
  jsonOk,
  knowledgeIngestDryRun,
  parseJsonBody,
} from "@/lib/lifecycle/lifecycle-api";

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{
      mode?: "dry-run" | "write";
      mcpRagIndex?: { entries?: Array<Record<string, unknown>> };
      vendorDb?: { vendors?: Array<Record<string, unknown>> };
    }>(request);

    if (body.mode === "write") {
      return jsonError(
        "Write mode requires explicit approval and DB migration — use dry-run only",
        409,
      );
    }

    const result = knowledgeIngestDryRun({
      mcpRagIndex: body.mcpRagIndex,
      vendorDb: body.vendorDb,
    });

    return jsonOk({
      mode: "dry-run",
      candidateCount: result.candidates.length,
      candidates: result.candidates,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Knowledge ingest failed",
      500,
    );
  }
}
