/**
 * Sangfor Domain Events
 * Sangfor 도메인 이벤트
 */

export interface PolicyCreatedEvent {
  type: 'policy.created';
  policyId: string;
  policyName: string;
  policyType: string;
  timestamp: Date;
}

export interface PolicyToggledEvent {
  type: 'policy.toggled';
  policyId: string;
  enabled: boolean;
  timestamp: Date;
}

export interface DeviceStatusChangedEvent {
  type: 'device.status_changed';
  deviceId: string;
  previousStatus: string;
  currentStatus: string;
  timestamp: Date;
}

export interface ThreatDetectedEvent {
  type: 'threat.detected';
  alertId: string;
  alertType: string;
  severity: string;
  source: string;
  timestamp: Date;
}

export interface ThreatResolvedEvent {
  type: 'threat.resolved';
  alertId: string;
  timestamp: Date;
}

export type SangforEvent =
  | PolicyCreatedEvent
  | PolicyToggledEvent
  | DeviceStatusChangedEvent
  | ThreatDetectedEvent
  | ThreatResolvedEvent;

export type SangforEventHandler = (event: SangforEvent) => void | Promise<void>;
