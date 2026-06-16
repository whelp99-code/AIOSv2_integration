/**
 * Portal query block → proxy → standalone mail-intelligence endpoint mapping.
 *
 * | Block ID             | Proxy                                  | Standalone endpoint              |
 * |----------------------|----------------------------------------|----------------------------------|
 * | mail.account         | /api/proxy/outlook/accounts            | /api/outlook/accounts            |
 * | mail.thread          | /api/proxy/outlook/analyze             | /api/outlook/analyze             |
 * | mail.insightThread   | /api/proxy/outlook/thread-insights     | /api/portal/thread-insights      |
 * | mail.taskCandidate   | /api/proxy/outlook/candidates          | /api/portal/push-candidates      |
 * | mail.attachment      | /api/proxy/outlook/attachments         | /api/portal/attachments          |
 * | mail.entityCandidate | /api/proxy/outlook/entity-candidates   | /api/portal/entity-candidates    |
 * | mail.calendarHint    | /api/proxy/outlook/calendar-hints      | /api/portal/calendar-hints       |
 */
export interface MailPortalApiMappingRow {
  blockId:
    | "mail.account"
    | "mail.thread"
    | "mail.insightThread"
    | "mail.taskCandidate"
    | "mail.attachment"
    | "mail.entityCandidate"
    | "mail.calendarHint";
  proxy: string;
  standaloneEndpoint: string;
  method: "GET" | "POST";
}

export const MAIL_PORTAL_API_MAPPING: MailPortalApiMappingRow[] = [
  {
    blockId: "mail.account",
    proxy: "/api/proxy/outlook/accounts",
    standaloneEndpoint: "/api/outlook/accounts",
    method: "GET",
  },
  {
    blockId: "mail.thread",
    proxy: "/api/proxy/outlook/analyze",
    standaloneEndpoint: "/api/outlook/analyze",
    method: "GET",
  },
  {
    blockId: "mail.insightThread",
    proxy: "/api/proxy/outlook/thread-insights",
    standaloneEndpoint: "/api/portal/thread-insights",
    method: "GET",
  },
  {
    blockId: "mail.taskCandidate",
    proxy: "/api/proxy/outlook/candidates",
    standaloneEndpoint: "/api/portal/push-candidates",
    method: "POST",
  },
  {
    blockId: "mail.attachment",
    proxy: "/api/proxy/outlook/attachments",
    standaloneEndpoint: "/api/portal/attachments",
    method: "GET",
  },
  {
    blockId: "mail.entityCandidate",
    proxy: "/api/proxy/outlook/entity-candidates",
    standaloneEndpoint: "/api/portal/entity-candidates",
    method: "GET",
  },
  {
    blockId: "mail.calendarHint",
    proxy: "/api/proxy/outlook/calendar-hints",
    standaloneEndpoint: "/api/portal/calendar-hints",
    method: "GET",
  },
];

/** Client-safe fetch paths keyed by portal block id (includes query params where needed). */
export const MAIL_PORTAL_BLOCK_CLIENT_PATHS: Record<
  MailPortalApiMappingRow["blockId"],
  { url: string; method: "GET" | "POST" }
> = {
  "mail.account": {
    url: "/api/proxy/outlook/accounts",
    method: "GET",
  },
  "mail.thread": {
    url: "/api/proxy/outlook/analyze?top=10&sync=cache",
    method: "GET",
  },
  "mail.insightThread": {
    url: "/api/proxy/outlook/thread-insights",
    method: "GET",
  },
  "mail.taskCandidate": {
    url: "/api/proxy/outlook/candidates",
    method: "POST",
  },
  "mail.attachment": {
    url: "/api/proxy/outlook/attachments",
    method: "GET",
  },
  "mail.entityCandidate": {
    url: "/api/proxy/outlook/entity-candidates",
    method: "GET",
  },
  "mail.calendarHint": {
    url: "/api/proxy/outlook/calendar-hints",
    method: "GET",
  },
};
