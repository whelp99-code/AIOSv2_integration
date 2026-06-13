import { createAiosV1ProxyHandler } from '@/lib/integrations/aios-v1-proxy-handler';
import { GateRequirement } from '@aios/proxy-core';

export const GET = createAiosV1ProxyHandler('/api/customers/[id]', 'none');
export const PUT = createAiosV1ProxyHandler('/api/customers/[id]', 'data-mutation');
export const DELETE = createAiosV1ProxyHandler('/api/customers/[id]', 'data-mutation');