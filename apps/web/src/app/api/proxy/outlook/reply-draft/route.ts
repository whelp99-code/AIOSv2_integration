import { NextResponse } from "next/server";
import { fetchMailIntelligence } from "@/lib/integrations/mail-intelligence-proxy";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("messageId");
    if (!messageId) {
      return NextResponse.json({ message: "messageId is required" }, { status: 400 });
    }

    const { response, data } = await fetchMailIntelligence(
      `/api/outlook/reply-draft?messageId=${encodeURIComponent(messageId)}`,
      { method: "GET", signal: AbortSignal.timeout(45_000) },
    );

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Reply draft proxy failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
