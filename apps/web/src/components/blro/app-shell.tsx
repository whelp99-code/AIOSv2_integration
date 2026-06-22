'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  ['Command', '/command'],
  ['Approvals', '/approvals'],
  ['Mail', '/mail'],
  ['Finance', '/finance'],
  ['Sangfor', '/sangfor'],
  ['Presales', '/presales'],
  ['Settings', '/settings'],
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-4 px-6">
          <div className="font-semibold">BLRO Company Operating OS</div>
          <div className="text-xs text-slate-500">C-Stack · localhost:3110</div>
        </div>
      </header>
      <div className="grid grid-cols-[220px_1fr]">
        <aside className="min-h-[calc(100vh-56px)] border-r bg-white p-4">
          <nav className="space-y-1">
            {nav.map(([label, href]) => {
              const active = pathname === href || pathname?.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`block rounded-xl px-3 py-2 text-sm ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
