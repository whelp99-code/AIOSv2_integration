import { NextResponse } from "next/server";
import { PORT_REGISTRY, getUrl } from "@aios/config/ports";
import { getRegistry, ServiceHealthConfig } from "@aios/health";

// 서비스 설정: 포트 레지스트리에서 가져와서 헬스 체크 설정 생성
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
    livenessPath: "/health/liveness",
    readinessPath: "/health/readiness",
    critical: true,
  },
  "f-aios-v3": {
    baseUrl: getUrl("F_AIOS_V3"),
    livenessPath: "/health/liveness",
    readinessPath: "/health/readiness",
    critical: true,
  },
  "sangfor-mcp": {
    baseUrl: getUrl("SANGFOR_MCP"),
    livenessPath: "/health",
    readinessPath: "/health/ready",
    critical: true,
  },
  "vibe-coding-os": {
    baseUrl: getUrl("VIBE_CODING_OS"),
    livenessPath: "/health",
    readinessPath: "/health/ready",
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

// 표시 이름 매핑
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

async function checkServiceHealth(serviceKey: string): Promise<{
  name: string;
  displayName: string;
  port: number;
  liveness: HealthStatus;
  readiness: HealthStatus;
  latencyMs?: number;
  lastChecked: number;
  baseUrl: string;
  critical: boolean;
}> {
  const config = SERVICE_CONFIGS[serviceKey];
  if (!config) {
    return {
      name: serviceKey,
      displayName: DISPLAY_NAMES[serviceKey] || serviceKey,
      port: getPort(serviceKey),
      liveness: "unknown",
      readiness: "unknown",
      lastChecked: Date.now(),
      baseUrl: "",
      critical: false,
    };
  }

  const registry = getRegistry();

  // 서비스 등록 (이미 등록되어 있으면 무시)
  try {
    registry.register({
      name: serviceKey,
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

  // Liveness 체크
  const liveness = await registry.checkLiveness(serviceKey);

  // Readiness 체크 (liveness가 healthy일 때만)
  let readiness: typeof liveness;
  if (liveness.status === "healthy") {
    readiness = await registry.checkReadiness(serviceKey);
  } else {
    readiness = { ...liveness, status: "unreachable" as const };
  }

  return {
    name: serviceKey,
    displayName: DISPLAY_NAMES[serviceKey] || serviceKey,
    port: getPort(serviceKey),
    liveness: liveness.status,
    readiness: readiness.status,
    latencyMs: liveness.latencyMs,
    lastChecked: liveness.lastChecked,
    baseUrl: config.baseUrl,
    critical: config.critical,
  };
}

type HealthStatus =
  | "healthy"
  | "degraded"
  | "unreachable"
  | "planned"
  | "unknown";

export async function GET() {
  try {
    // 모든 서비스 병렬 체크
    const services = await Promise.all(
      Object.keys(SERVICE_CONFIGS).map(checkServiceHealth),
    );

    // 전체 시스템 헬스 계산
    let systemStatus: HealthStatus = "healthy";
    for (const svc of services) {
      if (svc.critical) {
        if (svc.liveness === "unreachable") {
          systemStatus = "unreachable";
          break;
        } else if (svc.liveness === "degraded" && systemStatus === "healthy") {
          systemStatus = "degraded";
        }
      }
    }

    return NextResponse.json({
      status: systemStatus,
      services,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Ops health error:", error);
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        services: [],
      },
      { status: 500 },
    );
  }
}
