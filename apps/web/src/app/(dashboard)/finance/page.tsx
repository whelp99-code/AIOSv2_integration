'use client';

import { useEffect, useState } from 'react';

type CfoHealth = { status?: string; service?: string };

export default function FinancePage() {
  const [health, setHealth] = useState<CfoHealth | null>(null);
  const [drafts, setDrafts] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    fetch('/api/cfo/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: 'unavailable' }));

    fetch('/api/cfo/invoices?status=draft')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setDrafts(d.items ?? d.invoices ?? []))
      .catch(() => setDrafts([]));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Finance</h1>
        <p className="text-sm text-slate-500">CFO-AIOS 프록시 · 승인 전 read-only</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-xs uppercase text-slate-500">CFO 상태</div>
          <div className="mt-2 text-lg font-medium">
            {health?.status ?? '확인 중'}
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-xs uppercase text-slate-500">Invoice Draft</div>
          <div className="mt-2 text-lg font-medium">{drafts.length}건</div>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-xs uppercase text-slate-500">COST_ACTION</div>
          <div className="mt-2 text-sm text-slate-600">
            등록은 /approvals 승인 후 처리
          </div>
        </div>
      </div>

      {drafts.length > 0 ? (
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="font-medium">Draft Invoices</h2>
          <pre className="mt-3 overflow-auto text-xs text-slate-600">
            {JSON.stringify(drafts.slice(0, 3), null, 2)}
          </pre>
        </section>
      ) : null}
    </div>
  );
}
