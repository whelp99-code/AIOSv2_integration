"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ExecutionTracker } from "./execution-tracker";

interface ServiceHealth {
  name: string;
  displayName: string;
  port: number;
  liveness: HealthStatus;
  readiness: HealthStatus;
  latencyMs?: number;
  lastChecked: number;
  baseUrl: string;
  critical: boolean;
}

type HealthStatus =
  | "healthy"
  | "degraded"
  | "unreachable"
  | "planned"
  | "unknown";

interface SystemHealth {
  status: HealthStatus;
  services: ServiceHealth[];
}

interface ApprovalRequest {
  id: string;
  type: string;
  sessionId: string;
  assignmentId: string;
  requestedBy: string;
  actionType: string;
  target: string;
  status: "pending" | "approved" | "rejected" | "deferred";
  createdAt: string;
  context: Record<string, unknown>;
}

interface DispatchAction {
  type: "workflow" | "agent" | "command";
  target: string;
  payload: Record<string, unknown>;
}

interface EvidenceLink {
  title: string;
  path: string;
  updatedAt?: string;
}

interface CollaborationAssignmentSummary {
  id: string;
  title: string;
  assignedTo: string;
  status: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

interface CollaborationSessionSummary {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  assignments: CollaborationAssignmentSummary[];
}

interface OpsSummary {
  evidence: EvidenceLink[];
  sessions: CollaborationSessionSummary[];
  dispatch: {
    cursorAgentAvailable: boolean;
    opencodeAvailable: boolean;
    cursorAgentStatus: string;
    opencodeStatus: string;
  };
}

function HealthBadge({
  status,
  label,
}: {
  status: HealthStatus;
  label?: string;
}) {
  const colors: Record<
    HealthStatus,
    { bg: string; text: string; dot: string }
  > = {
    healthy: { bg: "#d1fae5", text: "#059669", dot: "#059669" },
    degraded: { bg: "#fef3c7", text: "#d97706", dot: "#d97706" },
    unreachable: { bg: "#fee2e2", text: "#dc2626", dot: "#dc2626" },
    planned: { bg: "#e0e7ff", text: "#4f46e5", dot: "#4f46e5" },
    unknown: { bg: "#f3f4f6", text: "#6b7280", dot: "#9ca3af" },
  };
  const c = colors[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        borderRadius: "9999px",
        fontSize: "12px",
        fontWeight: 500,
        backgroundColor: c.bg,
        color: c.text,
      }}
    >
      <span
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          backgroundColor: c.dot,
          boxShadow: `0 0 0 2px ${c.bg}`,
        }}
      />
      {label || status}
    </span>
  );
}

function ServiceCard({
  service,
  onCheckNow,
}: {
  service: ServiceHealth;
  onCheckNow: () => void;
}) {
  const systemDown = service.liveness === "unreachable";
  const isCritical = service.critical;

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        border: "1px solid #e5e7eb",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "12px",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <h3
              style={{
                fontSize: "16px",
                fontWeight: "600",
                color: "#111827",
                margin: 0,
              }}
            >
              {service.displayName}
            </h3>
            {isCritical && (
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  color: "#dc2626",
                  backgroundColor: "#fef2f2",
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
              >
                CRITICAL
              </span>
            )}
          </div>
          <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
            {service.baseUrl} : {service.port}
          </p>
        </div>
        <HealthBadge status={service.liveness} label="Liveness" />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "11px",
              color: "#9ca3af",
              margin: "0 0 4px 0",
              textTransform: "uppercase",
            }}
          >
            Liveness
          </p>
          <HealthBadge status={service.liveness} />
        </div>
        <div>
          <p
            style={{
              fontSize: "11px",
              color: "#9ca3af",
              margin: "0 0 4px 0",
              textTransform: "uppercase",
            }}
          >
            Readiness
          </p>
          <HealthBadge status={service.readiness} />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: "12px", color: "#6b7280" }}>
          Latency: {service.latencyMs ? `${service.latencyMs}ms` : "N/A"} •
          Last: {formatTime(service.lastChecked)}
        </div>
        <button
          onClick={onCheckNow}
          disabled={systemDown}
          style={{
            fontSize: "12px",
            padding: "6px 12px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            backgroundColor: "white",
            color: "#374151",
            cursor: systemDown ? "not-allowed" : "pointer",
            opacity: systemDown ? 0.5 : 1,
          }}
        >
          재확인
        </button>
      </div>
    </div>
  );
}

function ApprovalCard({
  approval,
  onApprove,
  onReject,
  onDefer,
}: {
  approval: ApprovalRequest;
  onApprove: () => void;
  onReject: () => void;
  onDefer: () => void;
}) {
  const statusColors = {
    pending: { bg: "#fef3c7", text: "#d97706" },
    approved: { bg: "#d1fae5", text: "#059669" },
    rejected: { bg: "#fee2e2", text: "#dc2626" },
    deferred: { bg: "#e0e7ff", text: "#4f46e5" },
  };
  const c = statusColors[approval.status];

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        border: "1px solid #e5e7eb",
        borderLeft: `4px solid ${c.text}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "12px",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "14px",
              fontWeight: "600",
              color: "#111827",
              margin: "0 0 4px 0",
            }}
          >
            {approval.actionType.toUpperCase()}: {approval.target}
          </p>
          <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
            Session: {approval.sessionId} • Assignment: {approval.assignmentId}
          </p>
        </div>
        <span
          style={{
            padding: "4px 10px",
            borderRadius: "9999px",
            fontSize: "11px",
            fontWeight: 600,
            backgroundColor: c.bg,
            color: c.text,
            textTransform: "capitalize",
          }}
        >
          {approval.status}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "12px",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            color: "#6b7280",
            backgroundColor: "#f3f4f6",
            padding: "4px 8px",
            borderRadius: "4px",
          }}
        >
          Type: {approval.type}
        </span>
        <span
          style={{
            fontSize: "12px",
            color: "#6b7280",
            backgroundColor: "#f3f4f6",
            padding: "4px 8px",
            borderRadius: "4px",
          }}
        >
          Requested by: {approval.requestedBy}
        </span>
        <span
          style={{
            fontSize: "12px",
            color: "#6b7280",
            backgroundColor: "#f3f4f6",
            padding: "4px 8px",
            borderRadius: "4px",
          }}
        >
          {new Date(approval.createdAt).toLocaleString("ko-KR")}
        </span>
      </div>

      {approval.status === "pending" && (
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={onApprove}
            style={{
              flex: 1,
              padding: "8px 16px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#059669",
              color: "white",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            승인
          </button>
          <button
            onClick={onReject}
            style={{
              flex: 1,
              padding: "8px 16px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              backgroundColor: "white",
              color: "#dc2626",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            반려
          </button>
          <button
            onClick={onDefer}
            style={{
              flex: 1,
              padding: "8px 16px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              backgroundColor: "white",
              color: "#4f46e5",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            보류
          </button>
        </div>
      )}
    </div>
  );
}

function formatTime(ts: number): string {
  if (!ts) return "Never";
  const diff = Date.now() - ts;
  if (diff < 60000) return `${Math.floor(diff / 1000)}초 전`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  return new Date(ts).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OpsConsole() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [opsSummary, setOpsSummary] = useState<OpsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "health" | "approvals" | "executions" | "dispatch" | "evidence"
  >("health");
  const eventSourceRef = useRef<EventSource | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [dispatchTool, setDispatchTool] = useState<"opencode" | "cursor-agent">(
    "cursor-agent",
  );
  const [dispatchMode, setDispatchMode] = useState<
    "plan" | "implement" | "verify"
  >("verify");
  const [dispatchPrompt, setDispatchPrompt] = useState("");
  const [dispatchTargets, setDispatchTargets] = useState("");
  const [dispatchApprovalAction, setDispatchApprovalAction] = useState("");
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  // Fetch system health
  const fetchHealth = async () => {
    try {
      const res = await fetch("/api/ops/health");
      if (res.ok) {
        const data = await res.json();
        setSystemHealth(data);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error("Health fetch failed:", err);
    }
  };

  // Fetch approvals
  const fetchApprovals = async () => {
    try {
      const res = await fetch("/api/approvals");
      if (res.ok) {
        const data = await res.json();
        setApprovals(data.approvals || []);
      }
    } catch (err) {
      console.error("Approvals fetch failed:", err);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch("/api/ops/summary", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setOpsSummary(data);
      }
    } catch (err) {
      console.error("Ops summary fetch failed:", err);
    }
  };

  // Check single service
  const checkService = async (name: string) => {
    try {
      const res = await fetch(
        `/api/ops/health/check?name=${encodeURIComponent(name)}`,
      );
      if (res.ok) {
        await fetchHealth();
      }
    } catch (err) {
      console.error("Service check failed:", err);
    }
  };

  // Approval actions
  const handleApprovalAction = async (
    approvalId: string,
    status: "approved" | "rejected" | "deferred",
  ) => {
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, status, resolvedBy: "ops-console" }),
      });
      if (res.ok) {
        await Promise.all([fetchApprovals(), fetchSummary()]);
      }
    } catch (err) {
      console.error("Approval action failed:", err);
    }
  };

  const handleDispatch = async () => {
    const prompt = dispatchPrompt.trim();
    if (!prompt) {
      setDispatchStatus("프롬프트를 입력해야 합니다.");
      return;
    }

    setDispatchStatus("실행 중...");
    try {
      const res = await fetch("/api/ops/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: dispatchTool,
          mode: dispatchMode,
          prompt,
          targetFiles: dispatchTargets
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          approvalAction: dispatchApprovalAction || undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setDispatchStatus(
          `승인 대기: ${data.approval?.id ?? "approval created"}`,
        );
      } else if (res.ok) {
        setDispatchStatus(`완료: ${data.assignment?.status ?? "done"}`);
        setDispatchPrompt("");
      } else {
        setDispatchStatus(data.error ?? "디스패치 실패");
      }
      await Promise.all([fetchApprovals(), fetchSummary()]);
    } catch (err) {
      setDispatchStatus(err instanceof Error ? err.message : "디스패치 실패");
    }
  };

  // Setup SSE stream
  useEffect(() => {
    if (activeTab !== "health") return;

    eventSourceRef.current = new EventSource("/api/ops/health/stream");

    eventSourceRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "health-update") {
          setSystemHealth((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              services: prev.services.map((s) =>
                s.name === data.service ? { ...s, ...data.result } : s,
              ),
            };
          });
          setLastUpdate(new Date());
        }
      } catch (e) {
        console.error("SSE parse error:", e);
      }
    };

    eventSourceRef.current.onerror = () => {
      console.warn("SSE connection error, will retry...");
    };

    return () => {
      eventSourceRef.current?.close();
    };
  }, [activeTab]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchHealth(), fetchApprovals(), fetchSummary()]);
      setLoading(false);
    };
    init();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "400px",
        }}
      >
        <div style={{ fontSize: "16px", color: "#6b7280" }}>
          Ops Console 로딩 중...
        </div>
      </div>
    );
  }

  const pendingApprovals = approvals.filter((a) => a.status === "pending");
  const resolvedApprovals = approvals.filter((a) => a.status !== "pending");

  return (
    <div
      style={{
        padding: "32px",
        backgroundColor: "#f9fafb",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: "700",
                color: "#111827",
                margin: "0 0 8px 0",
              }}
            >
              🎛️ Unified Ops Console
            </h1>
            <p style={{ fontSize: "15px", color: "#6b7280", margin: 0 }}>
              헬스 모니터링 • 승인 게이트 • 디스패치 • Evidence 통합 관리
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontSize: "13px", color: "#6b7280" }}>
              마지막 업데이트:{" "}
              {lastUpdate ? lastUpdate.toLocaleTimeString("ko-KR") : "—"}
            </span>
            <button
              onClick={() =>
                Promise.all([fetchHealth(), fetchApprovals(), fetchSummary()])
              }
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                backgroundColor: "white",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              전체 새로고침
            </button>
          </div>
        </div>

        {/* System Status Summary */}
        {systemHealth && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 20px",
              borderRadius: "10px",
              backgroundColor:
                systemHealth.status === "healthy"
                  ? "#d1fae5"
                  : systemHealth.status === "degraded"
                    ? "#fef3c7"
                    : "#fee2e2",
            }}
          >
            <HealthBadge status={systemHealth.status} label="전체 시스템" />
            <span style={{ fontSize: "13px", color: "#374151" }}>
              {systemHealth.services.filter((s) => s.critical).length}개
              크리티컬 서비스 중
              {
                systemHealth.services.filter(
                  (s) => s.critical && s.liveness === "healthy",
                ).length
              }
              개 정상
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: "24px", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", gap: "4px" }}>
          {[
            {
              id: "health",
              label: "🏥 헬스 모니터링",
              count: systemHealth?.services.length,
            },
            {
              id: "approvals",
              label: "🛡️ 승인 게이트",
              count: pendingApprovals.length,
            },
            {
              id: "executions",
              label: "⚡ 실행 추적",
              count: null,
            },
            {
              id: "dispatch",
              label: "🚀 디스패치",
              count:
                opsSummary?.sessions.reduce(
                  (count, session) =>
                    count +
                    session.assignments.filter(
                      (assignment) => assignment.status !== "done",
                    ).length,
                  0,
                ) ?? null,
            },
            {
              id: "evidence",
              label: "📎 Evidence",
              count: opsSummary?.evidence.length ?? null,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              style={{
                padding: "10px 20px",
                border: "none",
                backgroundColor: activeTab === tab.id ? "white" : "transparent",
                borderBottom:
                  activeTab === tab.id
                    ? "2px solid #3b82f6"
                    : "2px solid transparent",
                color: activeTab === tab.id ? "#3b82f6" : "#6b7280",
                fontWeight: activeTab === tab.id ? 600 : 500,
                fontSize: "14px",
                cursor: "pointer",
                position: "relative",
                bottom: "-1px",
              }}
            >
              {tab.label}
              {tab.count !== null && (
                <span
                  style={{
                    marginLeft: "8px",
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    fontSize: "11px",
                    fontWeight: 600,
                    backgroundColor:
                      activeTab === tab.id ? "#dbeafe" : "#f3f4f6",
                    color: activeTab === tab.id ? "#3b82f6" : "#6b7280",
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Health Tab */}
      {activeTab === "health" && systemHealth && (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
              gap: "20px",
            }}
          >
            {systemHealth.services.map((service) => (
              <ServiceCard
                key={service.name}
                service={service}
                onCheckNow={() => checkService(service.name)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Executions Tab */}
      {activeTab === "executions" && (
        <div>
          <ExecutionTracker />
        </div>
      )}

      {/* Approvals Tab */}
      {activeTab === "approvals" && (
        <div>
          {pendingApprovals.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                backgroundColor: "white",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#111827",
                  margin: "0 0 8px 0",
                }}
              >
                대기 중인 승인 없음
              </h3>
              <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                모든 승인 요청이 처리되었습니다.
              </p>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#111827",
                  margin: 0,
                }}
              >
                ⏳ 대기 중인 승인 ({pendingApprovals.length}건)
              </h3>
              {pendingApprovals.map((approval) => (
                <ApprovalCard
                  key={approval.id}
                  approval={approval}
                  onApprove={() =>
                    handleApprovalAction(approval.id, "approved")
                  }
                  onReject={() => handleApprovalAction(approval.id, "rejected")}
                  onDefer={() => handleApprovalAction(approval.id, "deferred")}
                />
              ))}
            </div>
          )}

          {resolvedApprovals.length > 0 && (
            <details style={{ marginTop: "32px" }}>
              <summary
                style={{
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#374151",
                  padding: "12px 0",
                  borderTop: "1px solid #e5e7eb",
                  marginTop: "20px",
                }}
              >
                처리된 승인 내역 ({resolvedApprovals.length}건)
              </summary>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  marginTop: "16px",
                }}
              >
                {resolvedApprovals.slice(0, 20).map((approval) => (
                  <ApprovalCard
                    key={approval.id}
                    approval={approval}
                    onApprove={() => {}}
                    onReject={() => {}}
                    onDefer={() => {}}
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Dispatch Tab */}
      {activeTab === "dispatch" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
            gap: "24px",
          }}
        >
          {/* Agent Dispatch */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              border: "1px solid #e5e7eb",
            }}
          >
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#111827",
                margin: "0 0 8px 0",
              }}
            >
              🤖 Agent Dispatch
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "#6b7280",
                margin: "0 0 20px 0",
              }}
            >
              opencode 또는 Cursor Agent에 repo-local 작업을 전달합니다. 위험
              action은 승인 대기 상태로 전환됩니다.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                marginBottom: "12px",
              }}
            >
              <label
                style={{ fontSize: "13px", color: "#374151", fontWeight: 500 }}
              >
                Tool
                <select
                  value={dispatchTool}
                  onChange={(event) =>
                    setDispatchTool(event.target.value as typeof dispatchTool)
                  }
                  style={{
                    width: "100%",
                    marginTop: "6px",
                    padding: "8px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                  }}
                >
                  <option value="cursor-agent">Cursor Agent</option>
                  <option value="opencode">opencode</option>
                </select>
              </label>
              <label
                style={{ fontSize: "13px", color: "#374151", fontWeight: 500 }}
              >
                Mode
                <select
                  value={dispatchMode}
                  onChange={(event) =>
                    setDispatchMode(event.target.value as typeof dispatchMode)
                  }
                  style={{
                    width: "100%",
                    marginTop: "6px",
                    padding: "8px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                  }}
                >
                  <option value="verify">verify</option>
                  <option value="plan">plan</option>
                  <option value="implement">implement</option>
                </select>
              </label>
            </div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                color: "#374151",
                fontWeight: 500,
                marginBottom: "12px",
              }}
            >
              Prompt
              <textarea
                value={dispatchPrompt}
                onChange={(event) => setDispatchPrompt(event.target.value)}
                placeholder="예: Verify Phase 1 Ops Console summary route and report issues only."
                rows={5}
                style={{
                  width: "100%",
                  marginTop: "6px",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  resize: "vertical",
                }}
              />
            </label>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                color: "#374151",
                fontWeight: 500,
                marginBottom: "12px",
              }}
            >
              Target files
              <input
                value={dispatchTargets}
                onChange={(event) => setDispatchTargets(event.target.value)}
                placeholder="apps/web/src/app/api/ops/summary/route.ts, tests/integration.test.ts"
                style={{
                  width: "100%",
                  marginTop: "6px",
                  padding: "8px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                }}
              />
            </label>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                color: "#374151",
                fontWeight: 500,
                marginBottom: "16px",
              }}
            >
              Approval action
              <select
                value={dispatchApprovalAction}
                onChange={(event) =>
                  setDispatchApprovalAction(event.target.value)
                }
                style={{
                  width: "100%",
                  marginTop: "6px",
                  padding: "8px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                }}
              >
                <option value="">none</option>
                <option value="delete">delete</option>
                <option value="send">send</option>
                <option value="deploy">deploy</option>
                <option value="external-share">external-share</option>
                <option value="data-mutation">data-mutation</option>
                <option value="device-control">device-control</option>
              </select>
            </label>
            <button
              onClick={handleDispatch}
              disabled={
                (dispatchTool === "cursor-agent" &&
                  opsSummary?.dispatch.cursorAgentAvailable === false) ||
                (dispatchTool === "opencode" &&
                  opsSummary?.dispatch.opencodeAvailable === false)
              }
              style={{
                width: "100%",
                padding: "10px 16px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#111827",
                color: "white",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Dispatch 실행
            </button>
            {dispatchStatus && (
              <p
                style={{
                  fontSize: "13px",
                  color: "#374151",
                  margin: "12px 0 0 0",
                }}
              >
                {dispatchStatus}
              </p>
            )}
            {opsSummary && (
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "16px",
                  flexWrap: "wrap",
                }}
              >
                <HealthBadge
                  status={
                    opsSummary.dispatch.cursorAgentAvailable
                      ? "healthy"
                      : "unreachable"
                  }
                  label={`Cursor Agent: ${opsSummary.dispatch.cursorAgentStatus}`}
                />
                <HealthBadge
                  status={
                    opsSummary.dispatch.opencodeAvailable
                      ? "healthy"
                      : "unreachable"
                  }
                  label={`opencode: ${opsSummary.dispatch.opencodeStatus}`}
                />
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              border: "1px solid #e5e7eb",
            }}
          >
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#111827",
                margin: "0 0 20px 0",
              }}
            >
              ⚡ 빠른 실행
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              {[
                { label: "메일 동기화", action: "mail-sync", icon: "📧" },
                {
                  label: "워크플로우 실행",
                  action: "workflow-execute",
                  icon: "⚡",
                },
                {
                  label: "상그포 컴플라이언스",
                  action: "sangfor-compliance",
                  icon: "🛡️",
                },
                { label: "GitHub 동기화", action: "github-sync", icon: "🐙" },
                {
                  label: "AIOS v1 헬스체크",
                  action: "aios-v1-health",
                  icon: "🏥",
                },
                { label: "전체 서비스 체크", action: "all-health", icon: "🔄" },
              ].map((item) => (
                <button
                  key={item.action}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    padding: "20px",
                    borderRadius: "10px",
                    border: "1px solid #e5e7eb",
                    backgroundColor: "#fafafa",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <span style={{ fontSize: "24px" }}>{item.icon}</span>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Service Management */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              border: "1px solid #e5e7eb",
            }}
          >
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#111827",
                margin: "0 0 20px 0",
              }}
            >
              🔧 서비스 관리
            </h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {systemHealth?.services.map((service) => (
                <div
                  key={service.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    backgroundColor: "#f9fafb",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <HealthBadge status={service.liveness} />
                    <div>
                      <p
                        style={{
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "#111827",
                          margin: 0,
                        }}
                      >
                        {service.displayName}
                      </p>
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          margin: 0,
                        }}
                      >
                        {service.baseUrl}:{service.port}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => checkService(service.name)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "6px",
                      border: "1px solid #d1d5db",
                      backgroundColor: "white",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    체크 실행
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Evidence Tab */}
      {activeTab === "evidence" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
            gap: "24px",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              border: "1px solid #e5e7eb",
            }}
          >
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#111827",
                margin: "0 0 20px 0",
              }}
            >
              📎 최신 Evidence
            </h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {(opsSummary?.evidence ?? []).map((item) => (
                <Link
                  key={item.path}
                  href={`/${item.path}`}
                  style={{
                    display: "block",
                    padding: "14px 16px",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    textDecoration: "none",
                    color: "#111827",
                    backgroundColor: "#f9fafb",
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: 600 }}>
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginTop: "4px",
                    }}
                  >
                    {item.path} •{" "}
                    {item.updatedAt
                      ? new Date(item.updatedAt).toLocaleString("ko-KR")
                      : "unknown"}
                  </div>
                </Link>
              ))}
              {(opsSummary?.evidence.length ?? 0) === 0 && (
                <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                  표시할 evidence 문서가 없습니다.
                </p>
              )}
            </div>
          </div>

          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              border: "1px solid #e5e7eb",
            }}
          >
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#111827",
                margin: "0 0 20px 0",
              }}
            >
              🧭 최근 Assignments
            </h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {(opsSummary?.sessions ?? []).flatMap((session) =>
                session.assignments.slice(0, 5).map((assignment) => (
                  <div
                    key={`${session.id}-${assignment.id}`}
                    style={{
                      padding: "14px 16px",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      backgroundColor: "#f9fafb",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "#111827",
                        }}
                      >
                        {assignment.title}
                      </div>
                      <span style={{ fontSize: "12px", color: "#6b7280" }}>
                        {assignment.status}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        marginTop: "4px",
                      }}
                    >
                      {session.title} • {assignment.assignedTo} •{" "}
                      {new Date(assignment.updatedAt).toLocaleString("ko-KR")}
                    </div>
                  </div>
                )),
              )}
              {(opsSummary?.sessions.length ?? 0) === 0 && (
                <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                  표시할 collaboration session이 없습니다.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
