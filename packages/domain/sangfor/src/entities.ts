/**
 * Sangfor Domain Entities
 * Sangfor 정책 도메인 엔티티 (sangfor-mcp 재활용)
 */

import { z } from 'zod';

export const SecurityPolicyTypeSchema = z.enum(['firewall', 'vpn', 'access', 'ids', 'waf']);
export type SecurityPolicyType = z.infer<typeof SecurityPolicyTypeSchema>;

export const SecurityPolicySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: SecurityPolicyTypeSchema,
  description: z.string().optional(),
  rules: z.array(z.object({
    id: z.string(),
    action: z.enum(['allow', 'deny', 'log', 'alert']),
    source: z.string().optional(),
    destination: z.string().optional(),
    port: z.string().optional(),
    protocol: z.string().optional(),
    priority: z.number().default(0),
  })),
  enabled: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type SecurityPolicy = z.infer<typeof SecurityPolicySchema>;

export const NetworkDeviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['firewall', 'switch', 'router', 'ap', 'endpoint']),
  ipAddress: z.string(),
  status: z.enum(['online', 'offline', 'warning', 'error']),
  firmware: z.string().optional(),
  lastSeen: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type NetworkDevice = z.infer<typeof NetworkDeviceSchema>;

export const ThreatAlertSchema = z.object({
  id: z.string(),
  type: z.enum(['intrusion', 'malware', 'anomaly', 'policy_violation']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  source: z.string(),
  description: z.string(),
  timestamp: z.string().datetime(),
  resolved: z.boolean().default(false),
  resolvedAt: z.string().datetime().optional(),
});
export type ThreatAlert = z.infer<typeof ThreatAlertSchema>;
