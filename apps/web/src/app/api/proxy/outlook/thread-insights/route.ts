import { NextResponse } from "next/server";
import { fetchMailIntelligence } from "@/lib/integrations/mail-intelligence-proxy";

export async function GET() {
  try {
    const { response, data } = await fetchMailIntelligence("/api/portal/thread-insights");
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { threads: [], error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}
