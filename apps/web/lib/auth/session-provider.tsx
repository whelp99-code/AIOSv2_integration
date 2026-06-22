"use client";

import { createContext, useContext, ReactNode } from "react";

interface SessionContextType {
  user: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
});

export function SessionProvider({ children }: { children: ReactNode }) {
  // TODO: Implement actual session logic
  return (
    <SessionContext.Provider
      value={{ user: null, isAuthenticated: false, isLoading: false }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
