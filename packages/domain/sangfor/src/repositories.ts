import type { SecurityPolicy, NetworkDevice, ThreatAlert } from './entities';

export interface SecurityPolicyRepository {
  findById(id: string): Promise<SecurityPolicy | null>;
  findAll(options?: { type?: string; enabled?: boolean }): Promise<SecurityPolicy[]>;
  save(policy: SecurityPolicy): Promise<void>;
  update(id: string, updates: Partial<SecurityPolicy>): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface NetworkDeviceRepository {
  findById(id: string): Promise<NetworkDevice | null>;
  findAll(options?: { type?: string; status?: string }): Promise<NetworkDevice[]>;
  save(device: NetworkDevice): Promise<void>;
  update(id: string, updates: Partial<NetworkDevice>): Promise<void>;
}

export interface ThreatAlertRepository {
  findById(id: string): Promise<ThreatAlert | null>;
  findAll(options?: { severity?: string; resolved?: boolean; limit?: number }): Promise<ThreatAlert[]>;
  save(alert: ThreatAlert): Promise<void>;
  resolve(id: string): Promise<void>;
}
