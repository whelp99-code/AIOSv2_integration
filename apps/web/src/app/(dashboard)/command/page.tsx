'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Briefing = {
  generatedAt: string;
  mail: { connected: boolean; summary: string; href: string };
  approvals: { pending: number; summary: string; href: string };
  projects: { open: number; summary: string; href: string };
  cfo: { healthy: boolean; summary: string; href: string };
  sangfor: { healthy: boolean; summary: string; href: string };
  recentRuns: Array<{ id: string; title: string; status: string; createdAt: string }>;
};

export default function CommandPage() {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/command/briefing');
        if (!res.ok) throw new Error('briefing failed');
        const data = await res.json();
        if (!cancelled) setBriefing(data);
      } catch {
        if (!cancelled) setError('브리핑을 불러올 수 없습니다.');
      }
    }

    load();
    const es = new EventSource('/api/command/briefing/stream');
    es.onmessage = (ev) => {
      try {
        setBriefing(JSON.parse(ev.data));
      } catch {
        // ignore malformed events
      }
    };
    es.onerror = () => es.close();

    return () => {
      cancelled = true;
      es.close();
    };
  }, []);

  const cards = briefing
    ? [
        { label: 'Mail', ...briefing.mail },
        { label: 'Approvals', ...briefing.approvals },
        { label: 'Projects', ...briefing.projects },
        { label: 'CFO', ...briefing.cfo },
        { label: 'Sangfor', ...briefing.sangfor },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Command Center</h1>
        <p className="text-sm text-slate-500">
          아침 브리핑 · 5필드 요약
          {briefing?.generatedAt
            ? ` · ${new Date(briefing.generatedAt).toLocaleString()}`
            : ''}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-2xl border bg-white p-5 shadow-sm transition hover:border-slate-300"
          >
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {card.label}
            </div>
            <div className="mt-2 text-lg font-medium">{card.summary}</div>
          </Link>
        ))}
      </div>

      {briefing?.recentRuns?.length ? (
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="font-medium">최근 실행</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {briefing.recentRuns.map((run) => (
              <li key={run.id} className="flex justify-between text-slate-600">
                <span>{run.title}</span>
                <span>{run.status}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
