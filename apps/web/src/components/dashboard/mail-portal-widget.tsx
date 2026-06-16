"use client";

import { useEffect, useState } from "react";
import { MAIL_PORTAL_BLOCK_CLIENT_PATHS } from "@/lib/portal/mail-api-mapping";

interface MailPortalWidgetState {
  threadCount: number;
  topThreads: string[];
  candidateCount: number;
  syncMode?: string;
  loading: boolean;
  error: string | null;
}

export function MailPortalWidget() {
  const [state, setState] = useState<MailPortalWidgetState>({
    threadCount: 0,
    topThreads: [],
    candidateCount: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function loadPortalBlocks() {
      try {
        const threadPath = MAIL_PORTAL_BLOCK_CLIENT_PATHS["mail.thread"];
        const candidatePath = MAIL_PORTAL_BLOCK_CLIENT_PATHS["mail.taskCandidate"];

        const [threadRes, candidateRes] = await Promise.all([
          fetch(threadPath.url, { method: threadPath.method }),
          fetch(candidatePath.url, { method: candidatePath.method }),
        ]);

        const threadData = threadRes.ok ? await threadRes.json() : null;
        const candidateData = candidateRes.ok ? await candidateRes.json() : null;

        const threadGroups = Array.isArray(threadData?.threadGroups)
          ? threadData.threadGroups
          : [];
        const candidates = Array.isArray(candidateData?.candidates)
          ? candidateData.candidates
          : [];

        setState({
          threadCount: threadGroups.length,
          topThreads: threadGroups
            .slice(0, 3)
            .map((group: { label?: string }) => group.label || "Untitled thread"),
          candidateCount: candidates.length,
          syncMode: threadData?.sync?.mode,
          loading: false,
          error:
            threadRes.ok && candidateRes.ok
              ? null
              : "일부 메일 포털 블록을 불러오지 못했습니다.",
        });
      } catch {
        setState({
          threadCount: 0,
          topThreads: [],
          candidateCount: 0,
          loading: false,
          error: "메일 포털 블록을 불러오는 중 오류가 발생했습니다.",
        });
      }
    }

    loadPortalBlocks();
  }, []);

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        border: "1px solid #e5e7eb",
        padding: "24px",
      }}
    >
      <h3
        style={{
          fontSize: "18px",
          fontWeight: "600",
          color: "#111827",
          margin: "0 0 16px 0",
        }}
      >
        📬 메일 포털 블록
      </h3>

      {state.error && (
        <p style={{ fontSize: "13px", color: "#dc2626", margin: "0 0 12px 0" }}>
          {state.error}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "14px", color: "#6b7280" }}>스레드</span>
          <span style={{ fontSize: "14px", color: "#111827", fontWeight: "600" }}>
            {state.loading ? "..." : `${state.threadCount}개`}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "14px", color: "#6b7280" }}>태스크 후보</span>
          <span style={{ fontSize: "14px", color: "#111827", fontWeight: "600" }}>
            {state.loading ? "..." : `${state.candidateCount}건`}
          </span>
        </div>
        {state.syncMode && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "14px", color: "#6b7280" }}>동기화</span>
            <span style={{ fontSize: "14px", color: "#111827" }}>{state.syncMode}</span>
          </div>
        )}
      </div>

      {!state.loading && state.topThreads.length > 0 && (
        <div style={{ marginTop: "16px" }}>
          <h4
            style={{
              fontSize: "14px",
              fontWeight: "600",
              color: "#111827",
              margin: "0 0 8px 0",
            }}
          >
            상위 스레드
          </h4>
          {state.topThreads.map((label) => (
            <div
              key={label}
              style={{
                padding: "8px 0",
                borderBottom: "1px solid #f3f4f6",
                fontSize: "13px",
                color: "#374151",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
