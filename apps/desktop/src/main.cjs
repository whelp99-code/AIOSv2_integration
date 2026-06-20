/**
 * AIOS Desktop - Main Process
 * Electron 메인 프로세스 - IPC, 네이티브 기능, AG-UI 이벤트 연동
 */

const path = require("node:path");
const { app, BrowserWindow, ipcMain, shell, Notification, Tray, Menu } = require("electron");

const DEFAULT_PORTAL_URL = process.env.AIOS_DESKTOP_PORTAL_URL || "http://127.0.0.1:3110";
const AG_UI_EVENTS_URL = `${DEFAULT_PORTAL_URL}/api/ops/events`;

let mainWindow = null;
let tray = null;
let isQuitting = false;

// ============================================================================
// Window Management
// ============================================================================

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  // 포털 로드
  mainWindow.loadURL(DEFAULT_PORTAL_URL).catch(() => {
    mainWindow.loadURL(
      "data:text/html;charset=utf-8," +
        encodeURIComponent(`
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:system-ui;">
          <h2 style="color:#dc2626;">⚠️ AIOS Portal is not running</h2>
          <p style="color:#6b7280;">Start it with:</p>
          <code style="background:#f3f4f6;padding:8px 16px;border-radius:6px;">pnpm integration:stack</code>
          <p style="color:#6b7280;margin-top:16px;">Or run web dev server:</p>
          <code style="background:#f3f4f6;padding:8px 16px;border-radius:6px;">pnpm --filter @aios/web dev</code>
        </div>
      `)
    );
  });

  // 외부 링크 처리
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // 창 닫기 시 트레이로 최소화
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow;
}

// ============================================================================
// System Tray
// ============================================================================

function createTray() {
  // 트레이 아이콘 생성 (macOS에서는 16x16 템플릿 이미지 권장)
  tray = new Tray(path.join(__dirname, "../assets/tray-iconTemplate.png"));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "AIOS Desktop 열기",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: "separator" },
    {
      label: "Ops Console",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.loadURL(`${DEFAULT_PORTAL_URL}/ops`);
        }
      },
    },
    {
      label: "Dashboard",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.loadURL(`${DEFAULT_PORTAL_URL}/dashboard`);
        }
      },
    },
    { type: "separator" },
    {
      label: "종료",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("AIOS Desktop");
  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.focus() : mainWindow.show();
    }
  });

  return tray;
}

// ============================================================================
// IPC Handlers
// ============================================================================

function setupIPC() {
  // 실행 이벤트 조회
  ipcMain.handle("execution:getStatus", async (_event, executionId) => {
    try {
      const response = await fetch(
        `${DEFAULT_PORTAL_URL}/api/ops/events?history=true`
      );
      if (!response.ok) return null;
      const events = await response.json();
      return events.find((e) => e.data?.executionId === executionId) ?? null;
    } catch {
      return null;
    }
  });

  // 시스템 헬스 조회
  ipcMain.handle("system:getHealth", async () => {
    try {
      const response = await fetch(`${DEFAULT_PORTAL_URL}/api/ops/health`);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  });

  // 승인 목록 조회
  ipcMain.handle("approvals:list", async () => {
    try {
      const response = await fetch(`${DEFAULT_PORTAL_URL}/api/approvals`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.approvals ?? [];
    } catch {
      return [];
    }
  });

  // 승인 처리
  ipcMain.handle("approvals:resolve", async (_event, { approvalId, status }) => {
    try {
      const response = await fetch(`${DEFAULT_PORTAL_URL}/api/approvals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, status, resolvedBy: "desktop" }),
      });
      return response.ok;
    } catch {
      return false;
    }
  });

  // 네이티브 알림
  ipcMain.handle("notification:show", async (_event, { title, body }) => {
    if (Notification.isSupported()) {
      const notification = new Notification({ title, body });
      notification.show();
      return true;
    }
    return false;
  });

  // 외부 링크 열기
  ipcMain.handle("shell:openExternal", async (_event, url) => {
    await shell.openExternal(url);
    return true;
  });

  // 앱 정보
  ipcMain.handle("app:getInfo", () => ({
    version: app.getVersion(),
    name: app.getName(),
    platform: process.platform,
    arch: process.arch,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    chromeVersion: process.versions.chrome,
  }));

  // 윈도우 제어
  ipcMain.handle("window:minimize", () => mainWindow?.minimize());
  ipcMain.handle("window:maximize", () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle("window:close", () => mainWindow?.close());
}

// ============================================================================
// App Lifecycle
// ============================================================================

app.whenReady().then(() => {
  setupIPC();
  createWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
});

// ============================================================================
// AG-UI Event Stream (메인 프로세스에서 SSE 연결 유지)
// ============================================================================

let eventSource = null;
let reconnectTimer = null;

function connectEventStream() {
  if (eventSource) {
    eventSource.close();
  }

  try {
    // Node.js에서는 EventSource 미지원이므로 polling 폴백
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${DEFAULT_PORTAL_URL}/api/health/live`);
        if (response.ok) {
          // 포털 alive
        }
      } catch {
        // 포털 unreachable
      }
    }, 30000);

    return () => clearInterval(pollInterval);
  } catch (e) {
    console.error("Event stream connection failed:", e);
    reconnectTimer = setTimeout(connectEventStream, 5000);
  }
}

// 포털 연결 시작
connectEventStream();
