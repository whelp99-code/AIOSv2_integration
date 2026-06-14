import { NextResponse } from "next/server";

export async function GET() {
  const mcpUrl = process.env.WHELP99_MCP_HTTP_URL;
  const mcpPath = process.env.WHELP99_MCP_PATH;

  if (!mcpUrl) {
    return NextResponse.json({
      status: "planned",
      connected: false,
      mcpPath: mcpPath ?? null,
      message: "WHELP99_MCP_HTTP_URL not configured",
    });
  }

  try {
    const response = await fetch(`${mcpUrl}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return NextResponse.json({
        status: "unreachable",
        connected: false,
        upstreamStatus: response.status,
      });
    }

    const data = await response.json();
    return NextResponse.json({
      status: "ok",
      connected: true,
      upstream: data,
    });
  } catch {
    return NextResponse.json({
      status: "unreachable",
      connected: false,
      message: "WHELP99 MCP endpoint unreachable",
    });
  }
}
