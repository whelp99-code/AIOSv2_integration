// Approval Gate for integration operations
// Controls when human approval is required for actions

export type ApprovalLevel = "none" | "low" | "medium" | "high" | "critical";

export interface ApprovalRequest {
  id: string;
  action: string;
  description: string;
  level: ApprovalLevel;
  requestedBy: string;
  requestedAt: Date;
  status: "pending" | "approved" | "rejected" | "expired";
}

export interface ApprovalGateConfig {
  requireApprovalFor: ApprovalLevel[];
  timeoutMs: number;
  approvers: string[];
}

const defaultConfig: ApprovalGateConfig = {
  requireApprovalFor: ["high", "critical"],
  timeoutMs: 24 * 60 * 60 * 1000, // 24 hours
  approvers: [],
};

export class ApprovalGate {
  private config: ApprovalGateConfig;
  private pendingRequests: Map<string, ApprovalRequest> = new Map();

  constructor(config: Partial<ApprovalGateConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  requiresApproval(level: ApprovalLevel): boolean {
    return this.config.requireApprovalFor.includes(level);
  }

  async requestApproval(
    action: string,
    description: string,
    level: ApprovalLevel,
    requestedBy: string
  ): Promise<ApprovalRequest> {
    const request: ApprovalRequest = {
      id: crypto.randomUUID(),
      action,
      description,
      level,
      requestedBy,
      requestedAt: new Date(),
      status: "pending",
    };

    if (!this.requiresApproval(level)) {
      request.status = "approved";
      return request;
    }

    this.pendingRequests.set(request.id, request);
    return request;
  }

  approve(requestId: string): boolean {
    const request = this.pendingRequests.get(requestId);
    if (request && request.status === "pending") {
      request.status = "approved";
      return true;
    }
    return false;
  }

  reject(requestId: string): boolean {
    const request = this.pendingRequests.get(requestId);
    if (request && request.status === "pending") {
      request.status = "rejected";
      return true;
    }
    return false;
  }

  getRequest(requestId: string): ApprovalRequest | undefined {
    return this.pendingRequests.get(requestId);
  }

  getPendingRequests(): ApprovalRequest[] {
    return Array.from(this.pendingRequests.values()).filter(
      (r) => r.status === "pending"
    );
  }
}

export const approvalGate = new ApprovalGate();
