"use client";

import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

interface VibeSummaryItem {
  id?: string;
  name?: string;
  title?: string;
  status?: string;
  description?: string;
  type?: string;
  cron?: string;
  nextRun?: string;
}

interface PendingApproval {
  id: string;
  actionType?: string;
  target?: string;
  status?: string;
  requestedBy?: string;
  assignmentId?: string;
}

type FetchState = "loading" | "ok" | "error";

type IngestStatus =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "failure"; message: string }
  | { kind: "pending"; message: string }
  | { kind: "rejected"; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractList(data: unknown, primaryKey: string): VibeSummaryItem[] {
  if (Array.isArray(data)) {
    return data.filter(isRecord) as VibeSummaryItem[];
  }

  if (!isRecord(data)) {
    return [];
  }

  const keys = [primaryKey, "items", "data"] as const;
  for (const key of keys) {
    const candidate = data[key];
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord) as VibeSummaryItem[];
    }
  }

  return [];
}

function parseApproval(value: unknown): PendingApproval | null {
  if (!isRecord(value) || typeof value.id !== "string") {
    return null;
  }

  return {
    id: value.id,
    actionType:
      typeof value.actionType === "string" ? value.actionType : undefined,
    target: typeof value.target === "string" ? value.target : undefined,
    status: typeof value.status === "string" ? value.status : undefined,
    requestedBy:
      typeof value.requestedBy === "string" ? value.requestedBy : undefined,
    assignmentId:
      typeof value.assignmentId === "string" ? value.assignmentId : undefined,
  };
}

function parseApprovalFromResponse(data: unknown): PendingApproval | null {
  if (!isRecord(data)) {
    return null;
  }
  return parseApproval(data.approval);
}

function itemLabel(item: VibeSummaryItem): string {
  return item.name ?? item.title ?? item.id ?? "—";
}

const cardStyle: CSSProperties = {
  backgroundColor: "white",
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  border: "1px solid #e5e7eb",
};

const sectionTitleStyle: CSSProperties = {
  fontSize: "18px",
  fontWeight: 600,
  color: "#111827",
  margin: "0 0 16px 0",
};

export default function VibeCodingPage() {
  const [projects, setProjects] = useState<VibeSummaryItem[]>([]);
  const [agents, setAgents] = useState<VibeSummaryItem[]>([]);
  const [schedules, setSchedules] = useState<VibeSummaryItem[]>([]);
  const [projectsState, setProjectsState] = useState<FetchState>("loading");
  const [agentsState, setAgentsState] = useState<FetchState>("loading");
  const [schedulesState, setSchedulesState] = useState<FetchState>("loading");
  const [upstreamConnected, setUpstreamConnected] = useState(false);

  const [ragTitle, setRagTitle] = useState("");
  const [ragSourceType, setRagSourceType] = useState("markdown");
  const [ragProjectId, setRagProjectId] = useState("");
  const [ragContent, setRagContent] = useState("");
  const [pendingApproval, setPendingApproval] =
    useState<PendingApproval | null>(null);
  const [ingestStatus, setIngestStatus] = useState<IngestStatus>({
    kind: "idle",
  });
  const [ingestBusy, setIngestBusy] = useState(false);

  const loadSummaries = useCallback(async () => {
    setProjectsState("loading");
    setAgentsState("loading");
    setSchedulesState("loading");

    const [projectsRes, agentsRes, schedulesRes] = await Promise.all([
      fetch("/api/vibe-coding/projects", { cache: "no-store" }),
      fetch("/api/vibe-coding/agents", { cache: "no-store" }),
      fetch("/api/vibe-coding/learning/schedules", { cache: "no-store" }),
    ]);

    let anyOk = false;

    if (projectsRes.ok) {
      anyOk = true;
      const data: unknown = await projectsRes.json();
      setProjects(extractList(data, "projects"));
      setProjectsState("ok");
    } else {
      setProjects([]);
      setProjectsState("error");
    }

    if (agentsRes.ok) {
      anyOk = true;
      const data: unknown = await agentsRes.json();
      setAgents(extractList(data, "agents"));
      setAgentsState("ok");
    } else {
      setAgents([]);
      setAgentsState("error");
    }

    if (schedulesRes.ok) {
      anyOk = true;
      const data: unknown = await schedulesRes.json();
      setSchedules(extractList(data, "schedules"));
      setSchedulesState("ok");
    } else {
      setSchedules([]);
      setSchedulesState("error");
    }

    setUpstreamConnected(anyOk);
  }, []);

  useEffect(() => {
    void loadSummaries();
  }, [loadSummaries]);

  async function runRagIngest(approvalId?: string) {
    try {
      const res = await fetch("/api/vibe-coding/rag/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: ragTitle.trim() || "rag-ingest",
          sourceType: ragSourceType.trim() || "markdown",
          projectId: ragProjectId.trim(),
          content: ragContent,
          requestedBy: "portal-user",
          ...(approvalId ? { approvalId } : {}),
        }),
      });

      const data: unknown = await res.json();

      if (res.status === 409) {
        const approval = parseApprovalFromResponse(data);
        if (approval) {
          setPendingApproval(approval);
          setIngestStatus({
            kind: "pending",
            message: "RAG ingest requires approval before external sharing.",
          });
          return;
        }
      }

      if (
        res.status === 403 &&
        isRecord(data) &&
        data.approvalStatus === "rejected"
      ) {
        setPendingApproval(null);
        setIngestStatus({
          kind: "rejected",
          message:
            typeof data.error === "string"
              ? data.error
              : "Approval was rejected.",
        });
        return;
      }

      if (res.ok && isRecord(data) && data.success === true) {
        setPendingApproval(null);
        setIngestStatus({
          kind: "success",
          message: "RAG ingest completed successfully.",
        });
        setRagContent("");
        return;
      }

      const errorMessage =
        isRecord(data) && typeof data.error === "string"
          ? data.error
          : "Upstream unavailable or ingest failed.";
      setIngestStatus({ kind: "failure", message: errorMessage });
    } catch {
      setIngestStatus({
        kind: "failure",
        message: "Could not reach the RAG ingest API.",
      });
    }
  }

  async function submitRagIngest(approvalId?: string) {
    setIngestBusy(true);
    try {
      await runRagIngest(approvalId);
    } finally {
      setIngestBusy(false);
    }
  }

  async function handleIngestSubmit(event: FormEvent) {
    event.preventDefault();
    if (pendingApproval && ingestStatus.kind === "pending") {
      setIngestStatus({
        kind: "pending",
        message: "Resolve the pending approval before submitting again.",
      });
      return;
    }
    if (!ragContent.trim()) {
      setIngestStatus({
        kind: "failure",
        message: "Content is required for RAG ingest.",
      });
      return;
    }
    setPendingApproval(null);
    setIngestStatus({ kind: "idle" });
    await submitRagIngest();
  }

  async function handleApprove() {
    if (!pendingApproval) return;
    setIngestBusy(true);
    try {
      const approveRes = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId: pendingApproval.id,
          status: "approved",
          resolvedBy: "portal-user",
          resolution: "approved via vibe-coding page",
        }),
      });

      if (!approveRes.ok) {
        setIngestStatus({
          kind: "failure",
          message: "Failed to record approval.",
        });
        return;
      }

      await runRagIngest(pendingApproval.id);
    } finally {
      setIngestBusy(false);
    }
  }

  async function handleReject() {
    if (!pendingApproval) return;
    setIngestBusy(true);
    try {
      const rejectRes = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId: pendingApproval.id,
          status: "rejected",
          resolvedBy: "portal-user",
          resolution: "rejected via vibe-coding page",
        }),
      });

      if (!rejectRes.ok) {
        setIngestStatus({
          kind: "failure",
          message: "Failed to record rejection.",
        });
        return;
      }

      setPendingApproval(null);
      setIngestStatus({
        kind: "rejected",
        message: "RAG ingest was rejected. No upstream call was made.",
      });
    } finally {
      setIngestBusy(false);
    }
  }

  function renderFetchHint(state: FetchState): string | null {
    if (state === "loading") return "Loading…";
    if (state === "error") return "Upstream unavailable or request failed.";
    return null;
  }

  function renderStatusBanner() {
    if (ingestStatus.kind === "idle") return null;

    const styles: Record<
      Exclude<IngestStatus["kind"], "idle">,
      CSSProperties
    > = {
      success: {
        backgroundColor: "#d1fae5",
        color: "#065f46",
        border: "1px solid #6ee7b7",
      },
      failure: {
        backgroundColor: "#fee2e2",
        color: "#991b1b",
        border: "1px solid #fca5a5",
      },
      pending: {
        backgroundColor: "#fef3c7",
        color: "#92400e",
        border: "1px solid #fcd34d",
      },
      rejected: {
        backgroundColor: "#fee2e2",
        color: "#991b1b",
        border: "1px solid #fca5a5",
      },
    };

    return (
      <div
        style={{
          ...styles[ingestStatus.kind],
          padding: "12px 16px",
          borderRadius: "8px",
          marginBottom: "16px",
          fontSize: "14px",
        }}
      >
        {ingestStatus.message}
      </div>
    );
  }

  function renderSummaryList(items: VibeSummaryItem[], emptyLabel: string) {
    if (items.length === 0) {
      return (
        <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
          {emptyLabel}
        </p>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {items.map((item, index) => (
          <div
            key={item.id ?? `${itemLabel(item)}-${index}`}
            style={{
              padding: "12px 14px",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              backgroundColor: "#f9fafb",
            }}
          >
            <p
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#111827",
                margin: "0 0 4px 0",
              }}
            >
              {itemLabel(item)}
            </p>
            <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
              {[
                item.status,
                item.type,
                item.description,
                item.cron,
                item.nextRun,
              ]
                .filter(Boolean)
                .join(" · ") || "No details"}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{ padding: "32px", minHeight: "100%", backgroundColor: "#f9fafb" }}
    >
      <div style={{ marginBottom: "28px" }}>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "#111827",
            margin: "0 0 8px 0",
          }}
        >
          Vibe Coding
        </h1>
        <p style={{ fontSize: "15px", color: "#6b7280", margin: 0 }}>
          Projects, agents, learning schedules, and RAG ingest{" "}
          {upstreamConnected ? "(connected)" : "(upstream unavailable)"}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Projects</h2>
          {renderFetchHint(projectsState) && (
            <p
              style={{
                fontSize: "13px",
                color: "#6b7280",
                margin: "0 0 12px 0",
              }}
            >
              {renderFetchHint(projectsState)}
            </p>
          )}
          {renderSummaryList(projects, "No projects returned.")}
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Agents</h2>
          {renderFetchHint(agentsState) && (
            <p
              style={{
                fontSize: "13px",
                color: "#6b7280",
                margin: "0 0 12px 0",
              }}
            >
              {renderFetchHint(agentsState)}
            </p>
          )}
          {renderSummaryList(agents, "No agents returned.")}
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Learning Schedules</h2>
          {renderFetchHint(schedulesState) && (
            <p
              style={{
                fontSize: "13px",
                color: "#6b7280",
                margin: "0 0 12px 0",
              }}
            >
              {renderFetchHint(schedulesState)}
            </p>
          )}
          {renderSummaryList(schedules, "No schedules returned.")}
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={sectionTitleStyle}>RAG Ingest</h2>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 20px 0" }}>
          External sharing requires manual approval. Submit first to create a
          pending approval, then approve or reject before retry.
        </p>

        {renderStatusBanner()}

        {pendingApproval && ingestStatus.kind === "pending" && (
          <div
            style={{
              padding: "16px",
              borderRadius: "10px",
              border: "1px solid #fcd34d",
              backgroundColor: "#fffbeb",
              marginBottom: "20px",
            }}
          >
            <p
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#92400e",
                margin: "0 0 8px 0",
              }}
            >
              Pending approval
            </p>
            <div
              style={{
                fontSize: "13px",
                color: "#78350f",
                marginBottom: "12px",
              }}
            >
              <div>ID: {pendingApproval.id}</div>
              {pendingApproval.actionType && (
                <div>Action: {pendingApproval.actionType}</div>
              )}
              {pendingApproval.target && (
                <div>Target: {pendingApproval.target}</div>
              )}
              {pendingApproval.requestedBy && (
                <div>Requested by: {pendingApproval.requestedBy}</div>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => void handleApprove()}
                disabled={ingestBusy}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#059669",
                  color: "white",
                  cursor: ingestBusy ? "wait" : "pointer",
                  fontSize: "13px",
                }}
              >
                Approve &amp; ingest
              </button>
              <button
                type="button"
                onClick={() => void handleReject()}
                disabled={ingestBusy}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #fca5a5",
                  backgroundColor: "white",
                  color: "#dc2626",
                  cursor: ingestBusy ? "wait" : "pointer",
                  fontSize: "13px",
                }}
              >
                Reject
              </button>
            </div>
          </div>
        )}

        <form onSubmit={(event) => void handleIngestSubmit(event)}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            <label
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <span
                style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}
              >
                Title
              </span>
              <input
                type="text"
                value={ragTitle}
                onChange={(event) => setRagTitle(event.target.value)}
                placeholder="Document title"
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                }}
              />
            </label>

            <label
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <span
                style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}
              >
                Source type
              </span>
              <select
                value={ragSourceType}
                onChange={(event) => setRagSourceType(event.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                  backgroundColor: "white",
                }}
              >
                <option value="markdown">markdown</option>
                <option value="text">text</option>
                <option value="code">code</option>
                <option value="document">document</option>
              </select>
            </label>
          </div>

          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              marginBottom: "16px",
            }}
          >
            <span
              style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}
            >
              Project ID
            </span>
            <input
              type="text"
              value={ragProjectId}
              onChange={(event) => setRagProjectId(event.target.value)}
              placeholder="project-id"
              list="vibe-project-ids"
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                fontSize: "14px",
              }}
            />
            <datalist id="vibe-project-ids">
              {projects.map((project) =>
                project.id ? (
                  <option key={project.id} value={project.id} />
                ) : null,
              )}
            </datalist>
          </label>

          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              marginBottom: "16px",
            }}
          >
            <span
              style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}
            >
              Content
            </span>
            <textarea
              value={ragContent}
              onChange={(event) => setRagContent(event.target.value)}
              rows={8}
              placeholder="Paste content to ingest into RAG"
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                fontSize: "14px",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </label>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              type="submit"
              disabled={
                ingestBusy ||
                (pendingApproval !== null && ingestStatus.kind === "pending")
              }
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#111827",
                color: "white",
                cursor: ingestBusy ? "wait" : "pointer",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              {ingestBusy ? "Submitting…" : "Submit ingest"}
            </button>
            <button
              type="button"
              onClick={() => void loadSummaries()}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                backgroundColor: "white",
                color: "#374151",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Refresh summaries
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
