'use client';

import { useEffect, useState } from 'react';

type Approval = {
  id: string;
  title: string;
  summary: string | null;
  actionType: string;
  status: string;
  createdAt: string;
};

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch('/api/approvals');
    const data = await res.json();
    setApprovals(data.approvals ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function resolve(id: string, status: 'APPROVED' | 'REJECTED') {
    await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalId: id, status }),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Approvals</h1>
        <p className="text-sm text-slate-500">단일 승인 게이트 (ADR-APPROVAL-001)</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">로딩 중…</p>
      ) : approvals.length === 0 ? (
        <p className="rounded-xl border bg-white p-6 text-sm text-slate-500">
          대기 중인 승인이 없습니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {approvals.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 rounded-2xl border bg-white p-5 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="font-medium">{item.title}</div>
                <div className="text-sm text-slate-500">
                  {item.actionType} · {item.status}
                </div>
                {item.summary ? (
                  <p className="mt-1 text-sm text-slate-600">{item.summary}</p>
                ) : null}
              </div>
              {item.status === 'PENDING' ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => resolve(item.id, 'APPROVED')}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
                  >
                    승인
                  </button>
                  <button
                    type="button"
                    onClick={() => resolve(item.id, 'REJECTED')}
                    className="rounded-lg border px-4 py-2 text-sm"
                  >
                    거절
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
