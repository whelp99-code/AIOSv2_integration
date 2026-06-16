import { getRegistry, createHealthStream } from "@aios/health";
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

export async function GET() {
  const registry = getRegistry();

  // 모든 서비스 등록
  for (const [name, config] of Object.entries(SERVICE_CONFIGS)) {
    try {
      registry.register({
        name,
        baseUrl: config.baseUrl,
        livenessPath: config.livenessPath,
        readinessPath: config.readinessPath,
        timeoutMs: 3000,
        intervalMs: 10000,
        critical: config.critical,
      });
    } catch {
      // already registered
    }
  }

  // 주기적 체크 시작
  registry.startPeriodicChecks();

  // SSE 스트림 생성
  const stream = createHealthStream();

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
