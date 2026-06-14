import { createAiosV1ProxyHandler } from "@/lib/integrations/aios-v1-proxy-handler";

export const GET = createAiosV1ProxyHandler(
  "/api/mail/insight-threads",
  "none",
);
export const POST = createAiosV1ProxyHandler(
  "/api/mail/insight-threads",
  "external-share",
);
