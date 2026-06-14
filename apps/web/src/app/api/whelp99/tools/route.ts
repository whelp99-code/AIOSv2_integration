import { NextResponse } from "next/server";

export async function GET() {
  const mcpUrl = process.env.WHELP99_MCP_HTTP_URL;

  if (!mcpUrl) {
    return NextResponse.json({
      status: "planned",
      tools: [],
      message: "WHELP99_MCP_HTTP_URL not configured",
    });
  }

  try {
    const response = await fetch(`${mcpUrl}/tools`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      return NextResponse.json({
        status: "unreachable",
        tools: [],
        upstreamStatus: response.status,
      });
    }

    const data = await response.json();
    return NextResponse.json({
      status: "ok",
      tools: Array.isArray(data) ? data : (data.tools ?? []),
    });
  } catch {
    return NextResponse.json({
      status: "unreachable",
      tools: [],
      message: "WHELP99 MCP endpoint unreachable",
    });
  }
}
