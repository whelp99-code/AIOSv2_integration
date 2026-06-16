const MAIL_INTELLIGENCE_URL =
  process.env.MAIL_INTELLIGENCE_URL || "http://localhost:3010";

const MAIL_INTERNAL_API_KEY = process.env.MAIL_INTERNAL_API_KEY || "";

export function mailIntelligenceBaseUrl() {
  return MAIL_INTELLIGENCE_URL.replace(/\/$/, "");
}

export async function fetchMailIntelligence(
  path: string,
  init: RequestInit & { approvalId?: string } = {},
) {
  const { approvalId, ...rest } = init;
  const headers = new Headers(rest.headers);
  headers.set("Content-Type", "application/json");
  if (approvalId) headers.set("X-AIOS-Approval-Id", approvalId);
  if (MAIL_INTERNAL_API_KEY) {
    headers.set("X-Mail-Internal-Key", MAIL_INTERNAL_API_KEY);
  }

  const url = `${mailIntelligenceBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    ...rest,
    headers,
    signal: rest.signal ?? AbortSignal.timeout(30_000),
  });

  const text = await response.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  return { response, data };
}
