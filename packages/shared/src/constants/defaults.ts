// Default constants

export const DEFAULTS = {
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  TIMEOUT_MS: 30000,
  MAX_RETRIES: 3,
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes
} as const;

export const API_ROUTES = {
  HEALTH: '/api/health',
  MAIL: '/api/mail',
  WORKFLOW: '/api/workflow',
  SANGFOR: '/api/sangfor',
  CODING: '/api/coding',
} as const;
