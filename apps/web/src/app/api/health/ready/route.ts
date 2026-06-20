import { NextResponse } from "next/server";
import { isLifecyclePersistenceAvailable } from "@aios/db";

/** Readiness probe — DB reachable when configured. */
export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      status: "ok",
      service: "aios-v2-web",
      database: "not_configured",
      timestamp: new Date().toISOString(),
    });
  }

  const dbReady = await isLifecyclePersistenceAvailable();
  const status = dbReady ? "ok" : "degraded";

  return NextResponse.json(
    {
      status,
      service: "aios-v2-web",
      database: dbReady ? "connected" : "unreachable",
      timestamp: new Date().toISOString(),
    },
    { status: dbReady ? 200 : 503 },
  );
}
