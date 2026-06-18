import { getIntegrationBaseUrl } from '@aios/shared';

export function getAiosV1Url(): string {
  return getIntegrationBaseUrl('aios-v1');
}

export function getFaiosV3Url(): string {
  return getIntegrationBaseUrl('f-aios-v3-core');
}

export function getFaiosV3Headers(): HeadersInit {
  const apiKey = process.env.F_AIOS_V3_API_KEY;
  return apiKey ? { 'X-API-Key': apiKey } : {};
}

export function getSangforMcpUrl(): string {
  return getIntegrationBaseUrl('sangfor-mcp-workflow');
}

export function getVibeCodingOsUrl(): string {
  return getIntegrationBaseUrl('vibe-coding-os');
}
