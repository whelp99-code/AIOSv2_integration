"use client";

import { useCallback, useEffect, useState } from "react";

type HubTab =
  | "inbox"
  | "candidates"
  | "insights"
  | "attachments"
  | "entities"
  | "calendar"
  | "reply";

interface ThreadGroup {
  key: string;
  label: string;
  count: number;
  messageIds: string[];
  userReplied?: boolean;
  aiGrouped?: boolean;
  participants?: string[];
}

interface AnalyzeMessage {
  id: string;
  subject?: string;
  from?: string;
  fromName?: string;
  receivedAt?: string;
  bodyPreview?: string;
  isRead?: boolean;
  mailFolder?: string;
}

interface AnalyzePayload {
  connected?: boolean;
  messages?: AnalyzeMessage[];
  threadGroups?: ThreadGroup[];
  sync?: {
    mode?: string;
    newCount?: number;
    totalCached?: number;
    lastSyncedAt?: string;
    deltaLink?: boolean | string | null;
  };
  result?: {
    messageInsights?: Array<{
      id: string;
      summary?: string[];
      status?: string;
    }>;
  };
}

interface OutlookStatus {
  connected: boolean;
  mailboxUser?: string;
  aiProvider?: string;
}

type AttachmentRef = {
  id?: string;
  name?: string;
  subject?: string;
  fromAddress?: string;
  category?: string;
  proxyPath?: string;
};

interface TaskCandidate {
  mailMessageId?: string;
  title?: string;
  summary?: string;
}

interface InsightThread {
  threadKey?: string;
  threadTitle?: string;
  summary?: string;
  status?: string;
  effectiveStatus?: string;
  messageCount?: number;
  nextActions?: Array<{ recommendedAction?: string; owner?: string }>;
  participantDomains?: string[];
}

interface EntityCandidate {
  domain?: string;
  email?: string;
  candidateName?: string;
  entityRole?: string;
  confidence?: number;
  messageCount?: number;
  sampleSubjects?: string[];
}

interface CalendarHint {
  title?: string;
  when?: string;
  owner?: string;
  lane?: string;
  messageId?: string;
}

interface MailAccount {
  id: string;
  email?: string;
  displayName?: string;
  isActive?: boolean;
  connected?: boolean;
}

interface ReplyDraft {
  subject?: string;
  body?: string;
  to?: string[];
  messageId?: string;
  tone?: string;
}

async function fetchWithFallback<T>(
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; data: T | null; error?: string }> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) {
      return { ok: false, data: null, error: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, data: null, error: "Mail Intelligence unavailable" };
  }
}

export default function MailPage() {
  const [hubTab, setHubTab] = useState<HubTab>("inbox");
  const [analyze, setAnalyze] = useState<AnalyzePayload | null>(null);
  const [status, setStatus] = useState<OutlookStatus | null>(null);
  const [candidates, setCandidates] = useState<TaskCandidate[]>([]);
  const [insights, setInsights] = useState<InsightThread[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRef[]>([]);
  const [entityCandidates, setEntityCandidates] = useState<EntityCandidate[]>(
    [],
  );
  const [calendarHints, setCalendarHints] = useState<CalendarHint[]>([]);
  const [replyDraft, setReplyDraft] = useState<ReplyDraft | null>(null);
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [selectedThread, setSelectedThread] = useState<ThreadGroup | null>(
    null,
  );
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabError, setTabError] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState<string | null>(null);
  const [mailUnavailable, setMailUnavailable] = useState(false);

  const fetchAccounts = useCallback(async () => {
    const result = await fetchWithFallback<{
      accounts?: MailAccount[];
      activeAccountId?: string;
    }>("/api/proxy/outlook/accounts");
    if (result.ok && result.data) {
      setAccounts(result.data.accounts || []);
      setActiveAccountId(result.data.activeAccountId || null);
    }
  }, []);

  const fetchInbox = useCallback(async () => {
    const [statusRes, analyzeRes] = await Promise.all([
      fetchWithFallback<OutlookStatus>("/api/proxy/outlook/status"),
      fetchWithFallback<AnalyzePayload>(
        "/api/proxy/outlook/analyze?top=50&sync=auto",
      ),
    ]);
    if (statusRes.ok && statusRes.data) setStatus(statusRes.data);
    if (analyzeRes.ok && analyzeRes.data) {
      setAnalyze(analyzeRes.data);
      setMailUnavailable(false);
      setError(null);
    } else {
      setAnalyze({ messages: [], threadGroups: [] });
      setMailUnavailable(true);
      setError(analyzeRes.error || "메일 분석을 불러오지 못했습니다.");
    }
    await fetchAccounts();
  }, [fetchAccounts]);

  const fetchReplyDraft = useCallback(async (messageId: string) => {
    setDraftLoading(true);
    setReplyDraft(null);
    const result = await fetchWithFallback<ReplyDraft & { draft?: ReplyDraft }>(
      `/api/proxy/outlook/reply-draft?messageId=${encodeURIComponent(messageId)}`,
    );
    if (result.ok && result.data) {
      const draft = result.data.draft || result.data;
      setReplyDraft(draft);
    } else {
      setReplyDraft({
        messageId,
        body: "",
        subject: "(회신 초안을 불러올 수 없습니다)",
      });
    }
    setDraftLoading(false);
  }, []);

  const fetchTabData = useCallback(
    async (tab: HubTab) => {
      setTabLoading(true);
      setTabError(null);
      try {
        if (tab === "inbox") {
          await fetchInbox();
          return;
        }
        if (tab === "candidates") {
          const result = await fetchWithFallback<{
            candidates?: TaskCandidate[];
          }>("/api/proxy/outlook/candidates", { method: "POST" });
          setCandidates(result.ok ? result.data?.candidates || [] : []);
          if (!result.ok) setTabError(result.error || "후보 로드 실패");
          return;
        }
        if (tab === "insights") {
          const result = await fetchWithFallback<{ threads?: InsightThread[] }>(
            "/api/proxy/outlook/thread-insights",
          );
          setInsights(result.ok ? result.data?.threads || [] : []);
          if (!result.ok) setTabError(result.error || "인사이트 로드 실패");
          return;
        }
        if (tab === "attachments") {
          await fetch("/api/proxy/outlook/attachments/sync?top=10", {
            method: "POST",
          }).catch(() => null);
          const result = await fetchWithFallback<{
            attachments?: AttachmentRef[];
            entries?: AttachmentRef[];
          }>("/api/proxy/outlook/attachments");
          const list = result.data?.attachments || result.data?.entries || [];
          setAttachments(result.ok ? list : []);
          if (!result.ok) setTabError(result.error || "첨부 로드 실패");
          return;
        }
        if (tab === "entities") {
          const result = await fetchWithFallback<{
            candidates?: EntityCandidate[];
          }>("/api/proxy/outlook/entity-candidates");
          setEntityCandidates(result.ok ? result.data?.candidates || [] : []);
          if (!result.ok) setTabError(result.error || "엔티티 로드 실패");
          return;
        }
        if (tab === "calendar") {
          const result = await fetchWithFallback<{ calendar?: CalendarHint[] }>(
            "/api/proxy/outlook/calendar-hints",
          );
          setCalendarHints(result.ok ? result.data?.calendar || [] : []);
          if (!result.ok) setTabError(result.error || "일정 힌트 로드 실패");
          return;
        }
      } finally {
        setTabLoading(false);
      }
    },
    [fetchInbox],
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchTabData(hubTab);
    } catch {
      setError("데이터를 가져올 수 없습니다.");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [fetchTabData, hubTab]);

  useEffect(() => {
    refresh();
  }, [hubTab, refresh]);

  useEffect(() => {
    if (selectedMessageId) {
      fetchReplyDraft(selectedMessageId);
    } else {
      setReplyDraft(null);
    }
  }, [selectedMessageId, fetchReplyDraft]);

  const threadGroups = analyze?.threadGroups || [];
  const messagesById = new Map((analyze?.messages || []).map((m) => [m.id, m]));

  const selectedMessages = selectedThread
    ? ((selectedThread.messageIds || [])
        .map((id) => messagesById.get(id))
        .filter(Boolean) as AnalyzeMessage[])
    : [];

  const threadInsight = insights.find(
    (t) => t.threadKey === selectedThread?.key,
  );
  const threadEntities = entityCandidates.filter(
    (e) =>
      selectedThread?.participants?.some(
        (p) => e.domain && p.includes(e.domain),
      ) ||
      (e.sampleSubjects || []).some((s) =>
        selectedMessages.some(
          (m) => m.subject && s.includes(m.subject.slice(0, 20)),
        ),
      ),
  );
  const threadCandidates = candidates.filter((c) =>
    selectedThread?.messageIds?.includes(c.mailMessageId || ""),
  );
  const threadCalendar = calendarHints.filter((h) =>
    selectedThread?.messageIds?.includes(h.messageId || ""),
  );

  async function switchAccount(accountId: string) {
    if (!accountId || accountId === activeAccountId || switchingAccount) return;
    setSwitchingAccount(true);
    try {
      const res = await fetch("/api/proxy/outlook/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveAccountId(data.activeAccountId || accountId);
        if (data.status) setStatus(data.status);
        await fetchTabData(hubTab);
      }
    } finally {
      setSwitchingAccount(false);
    }
  }

  async function requestSendDraft() {
    if (!replyDraft) return;
    setPendingApproval("발송 승인 요청 중...");
    const res = await fetch("/api/mail/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: replyDraft.to?.[0] || "draft@example.com",
        subject: replyDraft.subject || selectedMessages[0]?.subject || "Re:",
        body: replyDraft.body || "",
        requestedBy: "mail-hub",
      }),
    });
    const data = await res.json();
    if (res.status === 409) {
      setPendingApproval(
        `승인 대기 (409): ${data.approval?.id || data.error || "pending"}`,
      );
    } else if (res.ok) {
      setPendingApproval("승인 후 발송 완료");
    } else {
      setPendingApproval(data.error || "발송 실패");
    }
  }

  async function promoteEntityCandidate(entity: EntityCandidate) {
    const res = await fetch("/api/lifecycle/customers/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityRole: entity.entityRole === "partner" ? "partner" : "customer",
        domain: entity.domain,
        candidateName: entity.candidateName,
        sourceThreadKey: selectedThread?.key || "unknown",
        sampleSubjects: entity.sampleSubjects,
        confidence: entity.confidence,
        requestedBy: "mail-hub",
      }),
    });
    if (res.ok) {
      setPendingApproval(
        `CRM 후보 생성됨 (${entity.domain || entity.candidateName})`,
      );
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "#6b7280" }}>
        메일 허브 로딩 중...
      </div>
    );
  }

  const tabStyle = (tab: HubTab) => ({
    padding: "8px 14px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer" as const,
    fontWeight: 600,
    backgroundColor: hubTab === tab ? "#111827" : "#f3f4f6",
    color: hubTab === tab ? "#fff" : "#374151",
  });

  const tabLabels: Record<HubTab, string> = {
    inbox: "Inbox",
    candidates: "Candidates",
    insights: "Insights",
    attachments: "첨부",
    entities: "Entities",
    calendar: "Calendar",
    reply: "Reply draft",
  };

  return (
    <div style={{ display: "flex", height: "100%", background: "#f9fafb" }}>
      <div
        style={{
          width: 420,
          borderRight: "1px solid #e5e7eb",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: 20, borderBottom: "1px solid #e5e7eb" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 20 }}>메일 허브</h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
                {status?.connected
                  ? status.mailboxUser || "연결됨"
                  : "연결 안됨"}
                {mailUnavailable ? " · Mail Intelligence degraded" : ""}
                {analyze?.sync?.lastSyncedAt
                  ? ` · ${analyze.sync.mode || "sync"} · 신규 ${analyze.sync.newCount ?? 0} · 캐시 ${analyze.sync.totalCached ?? 0}`
                  : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing || tabLoading}
              style={{ padding: "8px 12px" }}
            >
              {refreshing || tabLoading ? "..." : "새로고침"}
            </button>
          </div>
          {accounts.length > 1 && (
            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 12, color: "#6b7280", marginRight: 8 }}>
                계정
              </label>
              <select
                value={activeAccountId || ""}
                disabled={switchingAccount}
                onChange={(e) => switchAccount(e.target.value)}
                style={{
                  fontSize: 13,
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid #e5e7eb",
                }}
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.displayName || account.email || account.id}
                    {account.connected === false ? " (미연결)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div
            style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}
          >
            {(
              [
                "inbox",
                "candidates",
                "insights",
                "attachments",
                "entities",
                "calendar",
                "reply",
              ] as HubTab[]
            ).map((tab) => (
              <button
                key={tab}
                type="button"
                style={tabStyle(tab)}
                onClick={() => setHubTab(tab)}
              >
                {tabLabels[tab]}
              </button>
            ))}
          </div>
          {error && (
            <p style={{ color: "#dc2626", fontSize: 13, marginTop: 8 }}>
              {error}
            </p>
          )}
          {tabError && hubTab !== "inbox" && (
            <p style={{ color: "#d97706", fontSize: 12, marginTop: 8 }}>
              {tabError}
            </p>
          )}
          {pendingApproval && (
            <p style={{ color: "#2563eb", fontSize: 12, marginTop: 8 }}>
              {pendingApproval}
            </p>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {tabLoading && (
            <p style={{ padding: 24, color: "#6b7280" }}>
              탭 데이터 로딩 중...
            </p>
          )}

          {!tabLoading &&
            hubTab === "inbox" &&
            (threadGroups.length === 0 ? (
              <p style={{ padding: 24, color: "#6b7280" }}>
                스레드가 없습니다.
              </p>
            ) : (
              threadGroups.map((group) => (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => {
                    setSelectedThread(group);
                    const lastMsg =
                      group.messageIds?.[group.messageIds.length - 1];
                    setSelectedMessageId(lastMsg || null);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "14px 20px",
                    border: "none",
                    borderBottom: "1px solid #f3f4f6",
                    background:
                      selectedThread?.key === group.key ? "#eff6ff" : "#fff",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {group.label}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                    {group.count}통{group.userReplied ? " · 회신함" : ""}
                    {group.aiGrouped ? " · AI" : ""}
                  </div>
                </button>
              ))
            ))}

          {!tabLoading &&
            hubTab === "reply" &&
            (draftLoading ? (
              <p style={{ padding: 24, color: "#6b7280" }}>
                회신 초안 로딩 중...
              </p>
            ) : !selectedMessageId ? (
              <p style={{ padding: 24, color: "#6b7280" }}>
                Inbox에서 스레드를 선택하세요.
              </p>
            ) : (
              <div style={{ padding: 20 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  {replyDraft?.subject || "Re:"}
                </div>
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    fontSize: 13,
                    color: "#374151",
                    background: "#f9fafb",
                    padding: 12,
                    borderRadius: 8,
                  }}
                >
                  {replyDraft?.body || "(빈 초안)"}
                </pre>
              </div>
            ))}

          {!tabLoading &&
            hubTab === "candidates" &&
            (candidates.length === 0 ? (
              <p style={{ padding: 24, color: "#6b7280" }}>후보가 없습니다.</p>
            ) : (
              candidates.map((c, i) => (
                <div
                  key={c.mailMessageId || i}
                  style={{
                    padding: "14px 20px",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {c.summary}
                  </div>
                </div>
              ))
            ))}

          {!tabLoading &&
            hubTab === "insights" &&
            (insights.length === 0 ? (
              <p style={{ padding: 24, color: "#6b7280" }}>
                인사이트 스레드가 없습니다.
              </p>
            ) : (
              insights.map((t, i) => (
                <div
                  key={t.threadKey || i}
                  style={{
                    padding: "14px 20px",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{t.threadTitle}</div>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>
                      {t.effectiveStatus || t.status || "active"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                    {t.messageCount ? `${t.messageCount}통 · ` : ""}
                    {t.participantDomains?.length
                      ? t.participantDomains.join(", ")
                      : ""}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                    {t.summary}
                  </div>
                </div>
              ))
            ))}

          {!tabLoading &&
            hubTab === "attachments" &&
            (attachments.length === 0 ? (
              <p style={{ padding: 24, color: "#6b7280" }}>
                첨부 아카이브가 비어 있습니다.
              </p>
            ) : (
              attachments.map((a, i) => (
                <div
                  key={a.id || i}
                  style={{
                    padding: "14px 20px",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{a.name || a.id}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {[a.fromAddress, a.subject, a.category]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
              ))
            ))}

          {!tabLoading &&
            hubTab === "entities" &&
            (entityCandidates.length === 0 ? (
              <p style={{ padding: 24, color: "#6b7280" }}>
                엔티티 후보가 없습니다.
              </p>
            ) : (
              entityCandidates.map((entity, i) => (
                <div
                  key={entity.domain || entity.email || i}
                  style={{
                    padding: "14px 20px",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>
                      {entity.candidateName || entity.domain}
                    </div>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>
                      {entity.entityRole || "customer"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                    {entity.domain || entity.email}
                    {entity.confidence != null
                      ? ` · ${Math.round(entity.confidence * 100)}%`
                      : ""}
                  </div>
                  <button
                    type="button"
                    onClick={() => promoteEntityCandidate(entity)}
                    style={{ marginTop: 8, fontSize: 12 }}
                  >
                    CRM 후보 생성
                  </button>
                </div>
              ))
            ))}

          {!tabLoading &&
            hubTab === "calendar" &&
            (calendarHints.length === 0 ? (
              <p style={{ padding: 24, color: "#6b7280" }}>
                일정 힌트가 없습니다.
              </p>
            ) : (
              calendarHints.map((item, i) => (
                <div
                  key={item.messageId || i}
                  style={{
                    padding: "14px 20px",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{item.title || "일정"}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                    {[item.when, item.owner, item.lane]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
              ))
            ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
        {selectedThread ? (
          <>
            <h3 style={{ marginTop: 0 }}>{selectedThread.label}</h3>
            <p style={{ color: "#6b7280", fontSize: 13 }}>
              참여: {(selectedThread.participants || []).join(", ")}
            </p>

            {threadInsight && (
              <div
                style={{
                  marginBottom: 16,
                  padding: 12,
                  background: "#fff",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              >
                <strong>Thread insight</strong>
                <p
                  style={{ fontSize: 13, color: "#374151", margin: "8px 0 0" }}
                >
                  {threadInsight.summary}
                </p>
              </div>
            )}

            {threadEntities.length > 0 && (
              <div
                style={{
                  marginBottom: 16,
                  padding: 12,
                  background: "#fff",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              >
                <strong>Entity candidates ({threadEntities.length})</strong>
                {threadEntities.map((e, i) => (
                  <div key={i} style={{ fontSize: 12, marginTop: 4 }}>
                    {e.candidateName || e.domain}
                  </div>
                ))}
              </div>
            )}

            {threadCandidates.length > 0 && (
              <div
                style={{
                  marginBottom: 16,
                  padding: 12,
                  background: "#fff",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              >
                <strong>Task candidates ({threadCandidates.length})</strong>
                {threadCandidates.map((c, i) => (
                  <div key={i} style={{ fontSize: 12, marginTop: 4 }}>
                    {c.title}
                  </div>
                ))}
              </div>
            )}

            {threadCalendar.length > 0 && (
              <div
                style={{
                  marginBottom: 16,
                  padding: 12,
                  background: "#fff",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              >
                <strong>Calendar hints</strong>
                {threadCalendar.map((c, i) => (
                  <div key={i} style={{ fontSize: 12, marginTop: 4 }}>
                    {c.title} — {c.when}
                  </div>
                ))}
              </div>
            )}

            {replyDraft && (
              <div
                style={{
                  marginBottom: 16,
                  padding: 12,
                  background: "#fef3c7",
                  borderRadius: 8,
                  border: "1px solid #fcd34d",
                }}
              >
                <strong>Reply draft</strong>
                <p style={{ fontSize: 13, margin: "8px 0 0" }}>
                  {replyDraft.subject}
                </p>
                <pre
                  style={{ whiteSpace: "pre-wrap", fontSize: 12, marginTop: 8 }}
                >
                  {replyDraft.body?.slice(0, 300)}
                </pre>
              </div>
            )}

            <h4>스레드 타임라인</h4>
            {selectedMessages.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMessageId(m.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  marginBottom: 16,
                  padding: 12,
                  background: selectedMessageId === m.id ? "#eff6ff" : "#fff",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {m.mailFolder === "sentitems" ? "보낸" : "받은"} ·{" "}
                  {m.fromName || m.from} ·{" "}
                  {m.receivedAt
                    ? new Date(m.receivedAt).toLocaleString("ko-KR")
                    : ""}
                </div>
                <div style={{ fontWeight: 600, marginTop: 4 }}>{m.subject}</div>
                <div style={{ fontSize: 13, color: "#374151", marginTop: 6 }}>
                  {m.bodyPreview}
                </div>
              </button>
            ))}
            {!selectedThread.userReplied && replyDraft && (
              <button
                type="button"
                onClick={requestSendDraft}
                style={{ marginTop: 12, padding: "10px 16px" }}
              >
                발송 (승인 게이트)
              </button>
            )}
          </>
        ) : (
          <p style={{ color: "#6b7280" }}>스레드를 선택하세요.</p>
        )}
      </div>
    </div>
  );
}
