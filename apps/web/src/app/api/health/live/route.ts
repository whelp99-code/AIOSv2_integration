import { NextResponse } from "next/server";

/** Lightweight liveness probe — process is up. */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "aios-v2-web",
    timestamp: new Date().toISOString(),
  });
}
