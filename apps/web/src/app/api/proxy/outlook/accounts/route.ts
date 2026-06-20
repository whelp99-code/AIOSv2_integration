import { NextResponse } from "next/server";
import { fetchMailIntelligence } from "@/lib/integrations/mail-intelligence-proxy";

export async function GET() {
  try {
    const { response, data } = await fetchMailIntelligence("/api/outlook/accounts");
    if (!response.ok) return NextResponse.json(data, { status: response.status });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { accounts: [], error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { response, data } = await fetchMailIntelligence("/api/outlook/accounts/active", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!response.ok) return NextResponse.json(data, { status: response.status });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { switched: false, error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}
