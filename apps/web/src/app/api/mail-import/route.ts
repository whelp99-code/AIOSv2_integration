import { createAiosV1ProxyHandler } from "@/lib/integrations/aios-v1-proxy-handler";

export const POST = createAiosV1ProxyHandler(
  "/api/mail/import",
  "external-share",
);
