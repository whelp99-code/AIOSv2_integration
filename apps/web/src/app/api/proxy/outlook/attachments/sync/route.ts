import { NextResponse } from "next/server";
import { fetchMailIntelligence } from "@/lib/integrations/mail-intelligence-proxy";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const path = `/api/outlook/attachments/sync${query ? `?${query}` : ""}`;
    const { response, data } = await fetchMailIntelligence(path, {
      method: "POST",
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { synced: false, error: error instanceof Error ? error.message : "Attachment sync failed" },
      { status: 500 },
    );
  }
}
