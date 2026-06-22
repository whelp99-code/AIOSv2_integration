"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/integrations", label: "Integrations" },
  { href: "/automations", label: "Automations" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r h-screen p-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold">AIOS v2</h2>
        <p className="text-xs text-muted-foreground">Integration Platform</p>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-3 py-2 rounded-md text-sm ${
              pathname === item.href
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
