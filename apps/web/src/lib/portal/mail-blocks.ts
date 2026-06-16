import { fetchMailIntelligence } from "@/lib/integrations/mail-intelligence-proxy";
import { MAIL_PORTAL_API_MAPPING } from "./mail-api-mapping";

export type PortalBlockId =
  | "mail.account"
  | "mail.thread"
  | "mail.insightThread"
  | "mail.taskCandidate"
  | "mail.attachment"
  | "mail.entityCandidate"
  | "mail.calendarHint";

export interface MailAccountBlockData {
  accounts?: unknown[];
  activeAccountId?: string | null;
}

export interface MailThreadGroup {
  key: string;
  label: string;
  count: number;
  messageIds?: string[];
}

export interface MailThreadBlockData {
  connected?: boolean;
  threadGroups?: MailThreadGroup[];
  sync?: {
    mode?: string;
    newCount?: number;
    totalCached?: number;
    lastSyncedAt?: string;
  };
}

export interface MailTaskCandidateBlockData {
  candidates?: unknown[];
}

export interface MailInsightThreadBlockData {
  threads?: unknown[];
  count?: number;
}

export interface MailAttachmentBlockData {
  attachments?: unknown[];
  entries?: unknown[];
}

export interface MailEntityCandidateBlockData {
  candidates?: unknown[];
  count?: number;
}

export interface MailCalendarHintBlockData {
  calendar?: unknown[];
  count?: number;
}

export type PortalBlockFetcher<T = unknown> = () => Promise<T>;

export interface PortalBlockDefinition<T = unknown> {
  id: PortalBlockId;
  proxyPath: string;
  standaloneEndpoint: string;
  method: "GET" | "POST";
  fetch: PortalBlockFetcher<T>;
}

const registry = new Map<string, PortalBlockDefinition>();

export function registerPortalBlock<T>(
  id: PortalBlockId,
  definition: Omit<PortalBlockDefinition<T>, "id">,
): void {
  registry.set(id, { id, ...definition });
}

export function getMailPortalBlocks(): PortalBlockDefinition[] {
  return Array.from(registry.values());
}

export function getMailPortalBlock(
  id: string,
): PortalBlockDefinition | undefined {
  return registry.get(id);
}

export async function resolvePortalBlock<T = unknown>(
  id: string,
): Promise<T | null> {
  const block = registry.get(id);
  if (!block) return null;
  return (await block.fetch()) as T;
}

function mappingFor(blockId: PortalBlockId) {
  const row = MAIL_PORTAL_API_MAPPING.find(
    (entry) => entry.blockId === blockId,
  );
  if (!row) {
    throw new Error(`Missing API mapping for portal block: ${blockId}`);
  }
  return row;
}

registerPortalBlock<MailAccountBlockData>("mail.account", {
  proxyPath: "/api/proxy/outlook/accounts",
  standaloneEndpoint: mappingFor("mail.account").standaloneEndpoint,
  method: "GET",
  fetch: async () => {
    const { response, data } = await fetchMailIntelligence(
      "/api/outlook/accounts",
      { method: "GET" },
    );
    if (!response.ok) {
      throw new Error(`mail.account fetch failed: ${response.status}`);
    }
    return data as MailAccountBlockData;
  },
});

registerPortalBlock<MailThreadBlockData>("mail.thread", {
  proxyPath: "/api/proxy/outlook/analyze?top=10&sync=cache",
  standaloneEndpoint: mappingFor("mail.thread").standaloneEndpoint,
  method: "GET",
  fetch: async () => {
    const { response, data } = await fetchMailIntelligence(
      "/api/outlook/analyze?top=10&sync=cache",
      { method: "GET", signal: AbortSignal.timeout(60_000) },
    );
    if (!response.ok) {
      throw new Error(`mail.thread fetch failed: ${response.status}`);
    }
    return data as MailThreadBlockData;
  },
});

registerPortalBlock<MailInsightThreadBlockData>("mail.insightThread", {
  proxyPath: "/api/proxy/outlook/thread-insights",
  standaloneEndpoint: mappingFor("mail.insightThread").standaloneEndpoint,
  method: "GET",
  fetch: async () => {
    const { response, data } = await fetchMailIntelligence(
      "/api/portal/thread-insights",
      { method: "GET" },
    );
    if (!response.ok) {
      throw new Error(`mail.insightThread fetch failed: ${response.status}`);
    }
    return data as MailInsightThreadBlockData;
  },
});

registerPortalBlock<MailTaskCandidateBlockData>("mail.taskCandidate", {
  proxyPath: "/api/proxy/outlook/candidates",
  standaloneEndpoint: mappingFor("mail.taskCandidate").standaloneEndpoint,
  method: "POST",
  fetch: async () => {
    const { response, data } = await fetchMailIntelligence(
      "/api/portal/push-candidates",
      { method: "POST" },
    );
    if (!response.ok) {
      throw new Error(`mail.taskCandidate fetch failed: ${response.status}`);
    }
    return data as MailTaskCandidateBlockData;
  },
});

registerPortalBlock<MailAttachmentBlockData>("mail.attachment", {
  proxyPath: "/api/proxy/outlook/attachments",
  standaloneEndpoint: mappingFor("mail.attachment").standaloneEndpoint,
  method: "GET",
  fetch: async () => {
    const { response, data } = await fetchMailIntelligence(
      "/api/portal/attachments",
      { method: "GET" },
    );
    if (!response.ok) {
      throw new Error(`mail.attachment fetch failed: ${response.status}`);
    }
    return data as MailAttachmentBlockData;
  },
});

registerPortalBlock<MailEntityCandidateBlockData>("mail.entityCandidate", {
  proxyPath: "/api/proxy/outlook/entity-candidates",
  standaloneEndpoint: mappingFor("mail.entityCandidate").standaloneEndpoint,
  method: "GET",
  fetch: async () => {
    const { response, data } = await fetchMailIntelligence(
      "/api/portal/entity-candidates?top=30&sync=cache",
      { method: "GET" },
    );
    if (!response.ok) {
      throw new Error(`mail.entityCandidate fetch failed: ${response.status}`);
    }
    return data as MailEntityCandidateBlockData;
  },
});

registerPortalBlock<MailCalendarHintBlockData>("mail.calendarHint", {
  proxyPath: "/api/proxy/outlook/calendar-hints",
  standaloneEndpoint: mappingFor("mail.calendarHint").standaloneEndpoint,
  method: "GET",
  fetch: async () => {
    const { response, data } = await fetchMailIntelligence(
      "/api/portal/calendar-hints?top=30&sync=cache",
      { method: "GET" },
    );
    if (!response.ok) {
      throw new Error(`mail.calendarHint fetch failed: ${response.status}`);
    }
    return data as MailCalendarHintBlockData;
  },
});
