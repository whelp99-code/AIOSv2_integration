/**
 * Sangfor Service
 * Sangfor 보안 정책 유스케이스 서비스 (sangfor-mcp 재활용)
 */

import type {
  SecurityPolicy, SecurityPolicyRepository,
  NetworkDevice, NetworkDeviceRepository,
  ThreatAlert, ThreatAlertRepository,
} from '@aios/domain/sangfor';
import type { MCPClient } from '@aios/infrastructure/mcp';

export class SangforService {
  constructor(
    private policyRepo: SecurityPolicyRepository,
    private deviceRepo: NetworkDeviceRepository,
    private alertRepo: ThreatAlertRepository,
    private mcp: MCPClient
  ) {}

  // Security Policies
  async getPolicies(options?: { type?: string; enabled?: boolean }): Promise<SecurityPolicy[]> {
    return this.policyRepo.findAll(options);
  }

  async getPolicyById(id: string): Promise<SecurityPolicy | null> {
    return this.policyRepo.findById(id);
  }

  async createPolicy(data: Omit<SecurityPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<SecurityPolicy> {
    const now = new Date().toISOString();
    const policy: SecurityPolicy = { ...data, id: `policy_${Date.now()}`, createdAt: now, updatedAt: now };
    await this.policyRepo.save(policy);
    return policy;
  }

  async togglePolicy(id: string): Promise<void> {
    const policy = await this.policyRepo.findById(id);
    if (policy) {
      await this.policyRepo.update(id, { enabled: !policy.enabled, updatedAt: new Date().toISOString() });
    }
  }

  // Devices
  async getDevices(options?: { type?: string; status?: string }): Promise<NetworkDevice[]> {
    return this.deviceRepo.findAll(options);
  }

  async getDeviceById(id: string): Promise<NetworkDevice | null> {
    return this.deviceRepo.findById(id);
  }

  // Threat Alerts
  async getAlerts(options?: { severity?: string; resolved?: boolean }): Promise<ThreatAlert[]> {
    return this.alertRepo.findAll(options);
  }

  async resolveAlert(id: string): Promise<void> {
    await this.alertRepo.resolve(id);
  }

  async getAlertStats(): Promise<{ total: number; unresolved: number; critical: number }> {
    const alerts = await this.alertRepo.findAll();
    return {
      total: alerts.length,
      unresolved: alerts.filter((a) => !a.resolved).length,
      critical: alerts.filter((a) => a.severity === 'critical' && !a.resolved).length,
    };
  }
}
