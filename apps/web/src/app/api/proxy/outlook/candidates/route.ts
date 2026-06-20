import { NextResponse } from "next/server";
import { fetchMailIntelligence } from "@/lib/integrations/mail-intelligence-proxy";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const path = `/api/portal/push-candidates${query ? `?${query}` : ""}`;
    const { response, data } = await fetchMailIntelligence(path, { method: "POST" });
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { candidates: [], error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}
