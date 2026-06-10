// Port constants

export const PORTS = {
  WEB: 3100,
  API: 3200,
  LIGHT_RAG: 3300,
  DASHBOARD: 3400,
  VOICE: 3500,
  LM_STUDIO: 1234
} as const;

export type Port = typeof PORTS[keyof typeof PORTS];
