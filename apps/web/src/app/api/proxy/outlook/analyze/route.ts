import { NextResponse } from "next/server";
import { fetchMailIntelligence } from "@/lib/integrations/mail-intelligence-proxy";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const path = `/api/outlook/analyze${query ? `?${query}` : ""}`;
    const { response, data } = await fetchMailIntelligence(path, {
      method: "GET",
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Outlook analyze proxy error:", error);
    return NextResponse.json(
      {
        connected: false,
        messages: [],
        threadGroups: [],
        error: "메일 분석 데이터를 가져올 수 없습니다.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
