// Port constants — aligned with packages/config PORT_REGISTRY

export const PORTS = {
  WEB: 3110,
  API: 3200,
  AIOS_V1: 3101,
  F_AIOS_V3: 3201,
  SANGFOR_MCP: 3500,
  VIBE_CODING_OS: 4000,
  WHELP99_MCP_BRIDGE: 3600,
  MAIL_INTELLIGENCE: 3010,
  LIGHT_RAG: 3300,
  DASHBOARD: 3400,
  VOICE: 3310,
  LM_STUDIO: 1234,
} as const;

export type Port = typeof PORTS[keyof typeof PORTS];
