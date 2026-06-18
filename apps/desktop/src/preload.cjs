/**
 * AIOS Desktop - Preload Script
 * 렌더러 프로세스에 안전한 API 노출
 */

const { contextBridge, ipcRenderer } = require("electron");

// ============================================================================
// AG-UI Event Stream (렌더러 측)
// ============================================================================

class AGUIEventStream {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.eventSource = null;
    this.listeners = new Map();
    this.connected = false;
  }

  connect() {
    if (this.eventSource) {
      this.disconnect();
    }

    this.eventSource = new EventSource(`${this.baseUrl}/api/ops/events`);

    this.eventSource.onopen = () => {
      this.connected = true;
      this.emit("connected", { timestamp: new Date().toISOString() });
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit(data.type, data);
        this.emit("any", data);
      } catch (e) {
        console.error("AG-UI event parse error:", e);
      }
    };

    this.eventSource.onerror = () => {
      this.connected = false;
      this.emit("error", { timestamp: new Date().toISOString() });
      
      // 자동 재연결
      setTimeout(() => {
        if (!this.connected) {
          this.connect();
        }
      }, 3000);
    };

    // 실행 이벤트 타입별 리스닝
    const executionEvents = [
      "execution.start",
      "execution.progress",
      "execution.output",
      "execution.error",
      "execution.complete",
      "execution.cancel",
    ];

    for (const eventType of executionEvents) {
      this.eventSource.addEventListener(eventType, (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(eventType, data);
        } catch (e) {
          console.error(`AG-UI ${eventType} parse error:`, e);
        }
      });
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.connected = false;
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // unsubscribe 함수 반환
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (e) {
        console.error(`AG-UI listener error for ${event}:`, e);
      }
    });
  }

  isConnected() {
    return this.connected;
  }
}

// ============================================================================
// Context Bridge
// ============================================================================

contextBridge.exposeInMainWorld("aiosDesktop", {
  // 실행 관리
  execution: {
    getStatus: (executionId) => ipcRenderer.invoke("execution:getStatus", executionId),
  },

  // 시스템 헬스
  system: {
    getHealth: () => ipcRenderer.invoke("system:getHealth"),
  },

  // 승인 관리
  approvals: {
    list: () => ipcRenderer.invoke("approvals:list"),
    resolve: (approvalId, status) =>
      ipcRenderer.invoke("approvals:resolve", { approvalId, status }),
  },

  // 네이티브 기능
  notification: {
    show: (title, body) => ipcRenderer.invoke("notification:show", { title, body }),
  },

  shell: {
    openExternal: (url) => ipcRenderer.invoke("shell:openExternal", url),
  },

  // 앱 정보
  app: {
    getInfo: () => ipcRenderer.invoke("app:getInfo"),
  },

  // 윈도우 제어
  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    close: () => ipcRenderer.invoke("window:close"),
  },

  // AG-UI Event Stream
  agUI: {
    createStream: (baseUrl) => new AGUIEventStream(baseUrl || window.location.origin),
  },
});

// ============================================================================
// DOM Ready 시그널
// ============================================================================

window.addEventListener("DOMContentLoaded", () => {
  console.log("[AIOS Desktop] Preload loaded");
});
