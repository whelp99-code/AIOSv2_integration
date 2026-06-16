import { NextResponse } from "next/server";
import { fetchMailIntelligence } from "@/lib/integrations/mail-intelligence-proxy";

export async function GET() {
  try {
    const { response, data } = await fetchMailIntelligence("/api/portal/attachments", {
      method: "GET",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        entries: [],
        error: "Attachment archive proxy failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
