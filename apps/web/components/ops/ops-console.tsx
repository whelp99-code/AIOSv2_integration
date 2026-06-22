"use client";

import { useState, useEffect } from "react";

interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
}

export function OpsConsole() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // Simulated logs
    const mockLogs: LogEntry[] = [
      { timestamp: new Date().toISOString(), level: "info", message: "System initialized" },
      { timestamp: new Date().toISOString(), level: "info", message: "Connected to services" },
    ];
    setLogs(mockLogs);
  }, []);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Operations Console</h3>
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`px-3 py-1 rounded text-sm ${
            isRunning ? "bg-red-500 text-white" : "bg-green-500 text-white"
          }`}
        >
          {isRunning ? "Stop" : "Start"}
        </button>
      </div>
      <div className="font-mono text-sm space-y-1 max-h-96 overflow-y-auto">
        {logs.map((log, i) => (
          <div key={i} className={`flex gap-2 ${
            log.level === "error" ? "text-red-500" :
            log.level === "warn" ? "text-yellow-500" : "text-green-500"
          }`}>
            <span className="text-muted-foreground">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
            <span className="uppercase text-xs font-bold">[{log.level}]</span>
            <span>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
