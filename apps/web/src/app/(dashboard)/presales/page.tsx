'use client';

import { useEffect, useState } from 'react';

type Opportunity = {
  customerName: string;
  level: string;
  signals: string[];
  recommendedAction: string;
};

export default function PresalesPage() {
  const [items, setItems] = useState<Opportunity[]>([]);

  useEffect(() => {
    fetch('/api/presales/opportunities')
      .then((r) => r.json())
      .then((d) => setItems(d.opportunities ?? []))
      .catch(() => setItems([]));
  }, []);

  const templates = [
    '방화벽 도입 제안서',
    'WAF PoC 계획서',
    'VPN 확장 제안',
    '컴플라이언스 점검 리포트',
    '유지보수 갱신 견적',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Presales</h1>
        <p className="text-sm text-slate-500">
          제안 기회 규칙 엔진 · Proposal Desk 템플릿 5종
        </p>
      </div>

      <section className="rounded-2xl border bg-white p-5">
        <h2 className="font-medium">Proposal Desk 템플릿</h2>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {templates.map((t) => (
            <li key={t} className="rounded-lg border px-3 py-2 text-sm">
              {t}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h2 className="font-medium">기회 신호</h2>
        {items.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">신호 없음 (seed 후 표시)</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {items.map((o) => (
              <li key={o.customerName} className="rounded-lg border p-3 text-sm">
                <div className="font-medium">
                  {o.customerName} · {o.level}
                </div>
                <div className="text-slate-500">{o.recommendedAction}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
