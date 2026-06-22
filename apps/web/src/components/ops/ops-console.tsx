"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

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
    healthy: { bg: "bg-emerald-100", text: "text-emerald-600", dot: "bg-emerald-600" },
    degraded: { bg: "bg-amber-100", text: "text-amber-600", dot: "bg-amber-600" },
    unreachable: { bg: "bg-red-100", text: "text-red-600", dot: "bg-red-600" },
    planned: { bg: "bg-indigo-100", text: "text-indigo-600", dot: "bg-indigo-600" },
    unknown: { bg: "bg-gray-100", text: "text-gray-500", dot: "bg-gray-400" },
  };
  const c = colors[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`h-2 w-2 rounded-full ${c.dot}`} />
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
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">
              {service.displayName}
            </h3>
            {isCritical && (
              <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                CRITICAL
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {service.baseUrl} : {service.port}
          </p>
        </div>
        <HealthBadge status={service.liveness} label="Liveness" />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1 text-[11px] uppercase text-gray-400">Liveness</p>
          <HealthBadge status={service.liveness} />
        </div>
        <div>
          <p className="mb-1 text-[11px] uppercase text-gray-400">Readiness</p>
          <HealthBadge status={service.readiness} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          Latency: {service.latencyMs ? `${service.latencyMs}ms` : "N/A"} •
          Last: {formatTime(service.lastChecked)}
        </div>
        <button
          onClick={onCheckNow}
          disabled={systemDown}
          className={`rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 ${
            systemDown ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          }`}
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
    pending: { bg: "bg-amber-100", text: "text-amber-600" },
    approved: { bg: "bg-emerald-100", text: "text-emerald-600" },
    rejected: { bg: "bg-red-100", text: "text-red-600" },
    deferred: { bg: "bg-indigo-100", text: "text-indigo-600" },
  };
  const c = statusColors[approval.status];

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm border-l-4 ${c.text.replace("text-", "border-l-")}`}>
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="mb-1 text-sm font-semibold text-gray-900">
            {approval.actionType.toUpperCase()}: {approval.target}
          </p>
          <p className="text-xs text-gray-500">
            Session: {approval.sessionId} • Assignment: {approval.assignmentId}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${c.bg} ${c.text}`}>
          {approval.status}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">
          Type: {approval.type}
        </span>
        <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">
          Requested by: {approval.requestedBy}
        </span>
        <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">
          {new Date(approval.createdAt).toLocaleString("ko-KR")}
        </span>
      </div>

      {approval.status === "pending" && (
        <div className="flex gap-2">
          <button
            onClick={onApprove}
            className="flex-1 cursor-pointer rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
          >
            승인
          </button>
          <button
            onClick={onReject}
            className="flex-1 cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-red-600"
          >
            반려
          </button>
          <button
            onClick={onDefer}
            className="flex-1 cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-indigo-600"
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
    "health" | "approvals" | "dispatch" | "evidence"
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
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-base text-gray-500">Ops Console 로딩 중...</div>
      </div>
    );
  }

  const pendingApprovals = approvals.filter((a) => a.status === "pending");
  const resolvedApprovals = approvals.filter((a) => a.status !== "pending");

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              🎛️ Unified Ops Console
            </h1>
            <p className="text-sm text-gray-500">
              헬스 모니터링 • 승인 게이트 • 디스패치 • Evidence 통합 관리
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">
              마지막 업데이트:{" "}
              {lastUpdate ? lastUpdate.toLocaleTimeString("ko-KR") : "—"}
            </span>
            <button
              onClick={() =>
                Promise.all([fetchHealth(), fetchApprovals(), fetchSummary()])
              }
              className="cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-xs"
            >
              전체 새로고침
            </button>
          </div>
        </div>

        {/* System Status Summary */}
        {systemHealth && (
          <div
            className={`inline-flex items-center gap-3 rounded-lg px-5 py-3 ${
              systemHealth.status === "healthy"
                ? "bg-emerald-100"
                : systemHealth.status === "degraded"
                  ? "bg-amber-100"
                  : "bg-red-100"
            }`}
          >
            <HealthBadge status={systemHealth.status} label="전체 시스템" />
            <span className="text-xs text-gray-700">
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
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-1">
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
              className={`relative -mb-px cursor-pointer border-b-2 px-5 py-2.5 text-sm font-medium ${
                activeTab === tab.id
                  ? "border-blue-500 bg-white text-blue-500 font-semibold"
                  : "border-transparent text-gray-500"
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    activeTab === tab.id
                      ? "bg-blue-100 text-blue-500"
                      : "bg-gray-100 text-gray-500"
                  }`}
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
          <div className="grid grid-cols-[repeat(auto-fill,minmax(380px,1fr))] gap-5">
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

      {/* Approvals Tab */}
      {activeTab === "approvals" && (
        <div>
          {pendingApprovals.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-15 text-center">
              <div className="mb-4 text-5xl">✅</div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                대기 중인 승인 없음
              </h3>
              <p className="text-sm text-gray-500">
                모든 승인 요청이 처리되었습니다.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-gray-900">
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
            <details className="mt-8">
              <summary className="cursor-pointer border-t border-gray-200 pt-5 text-base font-semibold text-gray-700">
                처리된 승인 내역 ({resolvedApprovals.length}건)
              </summary>
              <div className="mt-4 flex flex-col gap-3">
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
        <div className="grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-6">
          {/* Agent Dispatch */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              🤖 Agent Dispatch
            </h3>
            <p className="mb-5 text-xs text-gray-500">
              opencode 또는 Cursor Agent에 repo-local 작업을 전달합니다. 위험
              action은 승인 대기 상태로 전환됩니다.
            </p>
            <div className="mb-3 grid grid-cols-2 gap-3">
              <label className="text-xs font-medium text-gray-700">
                Tool
                <select
                  value={dispatchTool}
                  onChange={(event) =>
                    setDispatchTool(event.target.value as typeof dispatchTool)
                  }
                  className="mt-1.5 w-full rounded-md border border-gray-300 px-2 py-2"
                >
                  <option value="cursor-agent">Cursor Agent</option>
                  <option value="opencode">opencode</option>
                </select>
              </label>
              <label className="text-xs font-medium text-gray-700">
                Mode
                <select
                  value={dispatchMode}
                  onChange={(event) =>
                    setDispatchMode(event.target.value as typeof dispatchMode)
                  }
                  className="mt-1.5 w-full rounded-md border border-gray-300 px-2 py-2"
                >
                  <option value="verify">verify</option>
                  <option value="plan">plan</option>
                  <option value="implement">implement</option>
                </select>
              </label>
            </div>
            <label className="mb-3 block text-xs font-medium text-gray-700">
              Prompt
              <textarea
                value={dispatchPrompt}
                onChange={(event) => setDispatchPrompt(event.target.value)}
                placeholder="예: Verify Phase 1 Ops Console summary route and report issues only."
                rows={5}
                className="mt-1.5 w-full resize-y rounded-lg border border-gray-300 px-2.5 py-2.5"
              />
            </label>
            <label className="mb-3 block text-xs font-medium text-gray-700">
              Target files
              <input
                value={dispatchTargets}
                onChange={(event) => setDispatchTargets(event.target.value)}
                placeholder="apps/web/src/app/api/ops/summary/route.ts, tests/integration.test.ts"
                className="mt-1.5 w-full rounded-md border border-gray-300 px-2 py-2"
              />
            </label>
            <label className="mb-4 block text-xs font-medium text-gray-700">
              Approval action
              <select
                value={dispatchApprovalAction}
                onChange={(event) =>
                  setDispatchApprovalAction(event.target.value)
                }
                className="mt-1.5 w-full rounded-md border border-gray-300 px-2 py-2"
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
              className="w-full cursor-pointer rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Dispatch 실행
            </button>
            {dispatchStatus && (
              <p className="mt-3 text-xs text-gray-700">{dispatchStatus}</p>
            )}
            {opsSummary && (
              <div className="mt-4 flex flex-wrap gap-2">
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
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-5 text-lg font-semibold text-gray-900">
              ⚡ 빠른 실행
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "메일 동기화", action: "mail-sync", icon: "📧" },
                { label: "워크플로우 실행", action: "workflow-execute", icon: "⚡" },
                { label: "상그포 컴플라이언스", action: "sangfor-compliance", icon: "🛡️" },
                { label: "GitHub 동기화", action: "github-sync", icon: "🐙" },
                { label: "AIOS v1 헬스체크", action: "aios-v1-health", icon: "🏥" },
                { label: "전체 서비스 체크", action: "all-health", icon: "🔄" },
              ].map((item) => (
                <button
                  key={item.action}
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-5 transition-all hover:bg-gray-100"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-xs font-medium text-gray-700">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Service Management */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-5 text-lg font-semibold text-gray-900">
              🔧 서비스 관리
            </h3>
            <div className="flex flex-col gap-3">
              {systemHealth?.services.map((service) => (
                <div
                  key={service.name}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <HealthBadge status={service.liveness} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {service.displayName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {service.baseUrl}:{service.port}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => checkService(service.name)}
                    className="cursor-pointer rounded-md border border-gray-300 bg-white px-3.5 py-1.5 text-xs"
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
        <div className="grid grid-cols-[repeat(auto-fit,minmax(420px,1fr))] gap-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-5 text-lg font-semibold text-gray-900">
              📎 최신 Evidence
            </h3>
            <div className="flex flex-col gap-3">
              {(opsSummary?.evidence ?? []).map((item) => (
                <Link
                  key={item.path}
                  href={`/${item.path}`}
                  className="block rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5 no-underline text-gray-900"
                >
                  <div className="text-sm font-semibold">{item.title}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {item.path} •{" "}
                    {item.updatedAt
                      ? new Date(item.updatedAt).toLocaleString("ko-KR")
                      : "unknown"}
                  </div>
                </Link>
              ))}
              {(opsSummary?.evidence.length ?? 0) === 0 && (
                <p className="text-sm text-gray-500">
                  표시할 evidence 문서가 없습니다.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-5 text-lg font-semibold text-gray-900">
              🧭 최근 Assignments
            </h3>
            <div className="flex flex-col gap-3">
              {(opsSummary?.sessions ?? []).flatMap((session) =>
                session.assignments.slice(0, 5).map((assignment) => (
                  <div
                    key={`${session.id}-${assignment.id}`}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5"
                  >
                    <div className="flex justify-between gap-3">
                      <div className="text-sm font-semibold text-gray-900">
                        {assignment.title}
                      </div>
                      <span className="text-xs text-gray-500">
                        {assignment.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {session.title} • {assignment.assignedTo} •{" "}
                      {new Date(assignment.updatedAt).toLocaleString("ko-KR")}
                    </div>
                  </div>
                )),
              )}
              {(opsSummary?.sessions.length ?? 0) === 0 && (
                <p className="text-sm text-gray-500">
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
