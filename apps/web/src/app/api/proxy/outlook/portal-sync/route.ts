import { NextResponse } from "next/server";
import { recordMailReadEvidence } from "@/lib/integrations/mail-evidence";
import { fetchMailIntelligence } from "@/lib/integrations/mail-intelligence-proxy";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const path = `/api/portal/sync-overview${query ? `?${query}` : ""}`;
    const { response, data } = await fetchMailIntelligence(path);
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    const payload = data as {
      messages?: number;
      groups?: unknown[];
      connected?: boolean;
      syncedAt?: string;
    };
    await recordMailReadEvidence({
      operation: "mail-sync",
      target: `portal sync-overview${query ? `?${query}` : ""}`,
      context: {
        messageCount: payload.messages,
        groupCount: payload.groups?.length ?? 0,
        connected: payload.connected,
        syncedAt: payload.syncedAt,
      },
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Portal sync failed" },
      { status: 500 },
    );
  }
}
