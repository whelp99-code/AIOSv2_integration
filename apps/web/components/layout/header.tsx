"use client";

import { useSession } from "@/lib/auth";

export function Header() {
  const { data } = useSession();
  const session = data as any;
  const user = session?.user;

  return (
    <header className="border-b px-4 py-3 flex items-center justify-between">
      <h1 className="text-lg font-semibold">AIOS v2 Dashboard</h1>
      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">
          {user?.name || "Guest"}
        </div>
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-xs font-medium">
            {user?.name?.charAt(0) || "G"}
          </span>
        </div>
      </div>
    </header>
  );
}
