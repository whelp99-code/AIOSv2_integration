/**
 * Portal query block → proxy → standalone mail-intelligence endpoint mapping.
 *
 * | Block ID           | Proxy                              | Standalone endpoint           |
 * |--------------------|------------------------------------|-------------------------------|
 * | mail.thread        | /api/proxy/outlook/analyze         | /api/outlook/analyze          |
 * | mail.taskCandidate | /api/proxy/outlook/candidates      | /api/portal/push-candidates   |
 */
export interface MailPortalApiMappingRow {
  blockId: "mail.thread" | "mail.taskCandidate";
  proxy: string;
  standaloneEndpoint: string;
  method: "GET" | "POST";
}

export const MAIL_PORTAL_API_MAPPING: MailPortalApiMappingRow[] = [
  {
    blockId: "mail.thread",
    proxy: "/api/proxy/outlook/analyze",
    standaloneEndpoint: "/api/outlook/analyze",
    method: "GET",
  },
  {
    blockId: "mail.taskCandidate",
    proxy: "/api/proxy/outlook/candidates",
    standaloneEndpoint: "/api/portal/push-candidates",
    method: "POST",
  },
];

/** Client-safe fetch paths keyed by portal block id (includes query params where needed). */
export const MAIL_PORTAL_BLOCK_CLIENT_PATHS: Record<
  MailPortalApiMappingRow["blockId"],
  { url: string; method: "GET" | "POST" }
> = {
  "mail.thread": {
    url: "/api/proxy/outlook/analyze?top=10&sync=cache",
    method: "GET",
  },
  "mail.taskCandidate": {
    url: "/api/proxy/outlook/candidates",
    method: "POST",
  },
};
