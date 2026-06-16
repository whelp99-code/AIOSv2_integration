import { NextResponse } from "next/server";
import { getRegistry } from "@aios/health";
import { PORT_REGISTRY, getUrl } from "@aios/config/ports";

const SERVICE_CONFIGS: Record<
  string,
  {
    baseUrl: string;
    livenessPath: string;
    readinessPath: string;
    critical: boolean;
  }
> = {
  "aios-v1": {
    baseUrl: getUrl("AIOS_V1"),
    livenessPath: "/api/health",
    readinessPath: "/api/health",
    critical: true,
  },
  "f-aios-v3": {
    baseUrl: getUrl("F_AIOS_V3"),
    livenessPath: "/api/health",
    readinessPath: "/api/health",
    critical: true,
  },
  "sangfor-mcp": {
    baseUrl: getUrl("SANGFOR_MCP"),
    livenessPath: "/api/system/health",
    readinessPath: "/api/system/health",
    critical: true,
  },
  "vibe-coding-os": {
    baseUrl: getUrl("VIBE_CODING_OS"),
    livenessPath: "/api/health",
    readinessPath: "/api/health",
    critical: false,
  },
  "mail-intelligence": {
    baseUrl: getUrl("MAIL_INTELLIGENCE"),
    livenessPath: "/health/live",
    readinessPath: "/health/ready",
    critical: true,
  },
  "aios-v2-web": {
    baseUrl: getUrl("AIOS_V2_WEB"),
    livenessPath: "/api/health/live",
    readinessPath: "/api/health/ready",
    critical: false,
  },
  "lm-studio": {
    baseUrl: getUrl("LM_STUDIO"),
    livenessPath: "/v1/models",
    readinessPath: "/v1/models",
    critical: false,
  },
};

const DISPLAY_NAMES: Record<string, string> = {
  "aios-v1": "AIOS v1 (메인 엔진)",
  "f-aios-v3": "F-aios-v3",
  "sangfor-mcp": "Sangfor MCP",
  "vibe-coding-os": "Vibe Coding OS",
  "mail-intelligence": "Mail Intelligence",
  "aios-v2-web": "AIOS v2 Portal",
  "lm-studio": "LM Studio (로컬 LLM)",
};

function getPort(service: string): number {
  const portMap: Record<string, keyof typeof PORT_REGISTRY> = {
    "aios-v1": "AIOS_V1",
    "f-aios-v3": "F_AIOS_V3",
    "sangfor-mcp": "SANGFOR_MCP",
    "vibe-coding-os": "VIBE_CODING_OS",
    "mail-intelligence": "MAIL_INTELLIGENCE",
    "aios-v2-web": "AIOS_V2_WEB",
    "lm-studio": "LM_STUDIO",
  };
  return PORT_REGISTRY[portMap[service]] || 0;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name) {
    return NextResponse.json(
      { error: "name parameter is required" },
      { status: 400 },
    );
  }

  const config = SERVICE_CONFIGS[name];
  if (!config) {
    return NextResponse.json(
      { error: `Unknown service: ${name}` },
      { status: 404 },
    );
  }

  const registry = getRegistry();

  try {
    registry.register({
      name,
      baseUrl: config.baseUrl,
      livenessPath: config.livenessPath,
      readinessPath: config.readinessPath,
      timeoutMs: 3000,
      intervalMs: 30000,
      critical: config.critical,
    });
  } catch {
    // already registered
  }

  const liveness = await registry.checkLiveness(name);
  const readiness =
    liveness.status === "healthy"
      ? await registry.checkReadiness(name)
      : { ...liveness, status: "unreachable" as const };

  return NextResponse.json({
    name,
    displayName: DISPLAY_NAMES[name] || name,
    port: getPort(name),
    liveness: liveness.status,
    readiness: readiness.status,
    latencyMs: liveness.latencyMs,
    lastChecked: liveness.lastChecked,
    baseUrl: config.baseUrl,
    critical: config.critical,
  });
}
