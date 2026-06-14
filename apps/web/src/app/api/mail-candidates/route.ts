import { createAiosV1ProxyHandler } from "@/lib/integrations/aios-v1-proxy-handler";

export const GET = createAiosV1ProxyHandler("/api/mail/candidates", "none");
export const POST = createAiosV1ProxyHandler(
  "/api/mail/candidates",
  "external-share",
);
