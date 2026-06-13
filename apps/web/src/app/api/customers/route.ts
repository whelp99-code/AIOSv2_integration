import { createAiosV1ProxyHandler } from '@/lib/integrations/aios-v1-proxy-handler';
import { GateRequirement } from '@aios/proxy-core';

export const GET = createAiosV1ProxyHandler('/api/customers', 'none');
export const POST = createAiosV1ProxyHandler('/api/customers', 'data-mutation');