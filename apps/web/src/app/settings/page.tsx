"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface SettingSection {
  id: string;
  title: string;
  icon: string;
}

const sections: SettingSection[] = [
  { id: "profile", title: "프로필", icon: "👤" },
  { id: "notifications", title: "알림", icon: "🔔" },
  { id: "appearance", title: "외관", icon: "🎨" },
  { id: "integrations", title: "연동 관리", icon: "🔗" },
  { id: "security", title: "보안", icon: "🔒" },
  { id: "about", title: "정보", icon: "ℹ️" },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const [activeSection, setActiveSection] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Profile settings
  const [displayName, setDisplayName] = useState(session?.user?.name || "");
  const [email, setEmail] = useState(session?.user?.email || "");

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [workflowAlerts, setWorkflowAlerts] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);

  // Appearance settings
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");
  const [language, setLanguage] = useState("ko");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  type IntegrationReachability = "ok" | "degraded" | "unreachable" | "planned";
  interface IntegrationProjectHealth {
    id: string;
    name: string;
    status: IntegrationReachability;
  }
  const [integrationHealth, setIntegrationHealth] = useState<
    IntegrationProjectHealth[]
  >([]);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [githubConnected, setGithubConnected] = useState<boolean | null>(null);
  const [slackConnected, setSlackConnected] = useState<boolean | null>(null);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setDisplayName(session.user.name || "");
      setEmail(session.user.email || "");
    }
  }, [session]);

  useEffect(() => {
    if (activeSection !== "integrations") return;

    async function loadIntegrationHealth() {
      setIntegrationsLoading(true);
      try {
        const [healthRes, outlookRes, githubRes, slackRes] = await Promise.all([
          fetch("/api/integrations/health", { cache: "no-store" }),
          fetch("/api/proxy/outlook/status", { cache: "no-store" }),
          fetch("/api/github", { cache: "no-store" }),
          fetch("/api/slack/status", { cache: "no-store" }),
        ]);

        const healthData = await healthRes.json().catch(() => null);
        if (healthData?.projects) {
          setIntegrationHealth(healthData.projects);
        } else if (!healthRes.ok) {
          setIntegrationHealth([]);
        }

        if (outlookRes.ok) {
          const outlookData = await outlookRes.json();
          setOutlookConnected(Boolean(outlookData.connected));
        } else {
          setOutlookConnected(false);
        }

        if (githubRes.ok) {
          const githubData = await githubRes.json();
          setGithubConnected(Boolean(githubData.connected));
        } else {
          setGithubConnected(false);
        }

        if (slackRes.ok) {
          const slackData = await slackRes.json();
          setSlackConnected(Boolean(slackData.connected));
        } else {
          setSlackConnected(false);
        }
      } catch {
        setIntegrationHealth([]);
        setOutlookConnected(false);
        setGithubConnected(false);
        setSlackConnected(false);
      } finally {
        setIntegrationsLoading(false);
      }
    }

    void loadIntegrationHealth();
  }, [activeSection]);

  function getProjectStatus(id: string): IntegrationReachability | null {
    return (
      integrationHealth.find((project) => project.id === id)?.status ?? null
    );
  }

  function statusLabel(status: IntegrationReachability | null): string {
    if (status === "ok") return "✅ 연결됨";
    if (status === "degraded") return "⚠️ 저하됨";
    if (status === "planned") return "📋 계획됨";
    return "미연결";
  }

  function statusColors(status: IntegrationReachability | null) {
    if (status === "ok") return { bg: "bg-emerald-100", color: "text-emerald-600" };
    if (status === "degraded") return { bg: "bg-amber-100", color: "text-amber-600" };
    if (status === "planned") return { bg: "bg-indigo-100", color: "text-indigo-600" };
    return { bg: "bg-gray-100", color: "text-gray-500" };
  }

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const ToggleSwitch = ({
    enabled,
    onChange,
  }: {
    enabled: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative h-[26px] w-12 shrink-0 cursor-pointer rounded-full border-none transition-colors ${
        enabled ? "bg-blue-500" : "bg-gray-300"
      }`}
    >
      <div
        className={`absolute top-0.5 h-[22px] w-[22px] rounded-full bg-white shadow-md transition-all ${
          enabled ? "left-6" : "left-0.5"
        }`}
      />
    </button>
  );

  const SettingRow = ({
    label,
    description,
    children,
  }: {
    label: string;
    description?: string;
    children: React.ReactNode;
  }) => (
    <div className="flex items-center justify-between border-b border-gray-100 py-4">
      <div className="mr-6 flex-1">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description && (
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        )}
      </div>
      {children}
    </div>
  );

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar */}
      <div className="w-[260px] shrink-0 border-r border-gray-200 bg-white p-6">
        <h2 className="mb-6 ml-4 text-xl font-bold text-gray-900">⚙️ 설정</h2>
        <nav className="flex flex-col gap-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-left text-sm font-medium ${
                activeSection === section.id
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500"
              }`}
            >
              <span className="text-base">{section.icon}</span>
              {section.title}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 px-10">
        {/* Profile */}
        {activeSection === "profile" && (
          <div>
            <h3 className="mb-2 text-2xl font-bold text-gray-900">프로필 설정</h3>
            <p className="mb-8 text-sm text-gray-500">계정 정보를 관리합니다.</p>

            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-5">
                <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-blue-100 text-3xl font-bold text-blue-600">
                  {(session?.user?.name || "U")[0].toUpperCase()}
                </div>
                <div>
                  <p className="mb-1 text-lg font-semibold text-gray-900">
                    {session?.user?.name || "사용자"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {session?.user?.email || ""}
                  </p>
                </div>
              </div>

              <div className="mb-5">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">표시 이름</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full max-w-[400px] rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none"
                />
              </div>

              <div className="mb-5">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full max-w-[400px] rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Notifications */}
        {activeSection === "notifications" && (
          <div>
            <h3 className="mb-2 text-2xl font-bold text-gray-900">알림 설정</h3>
            <p className="mb-8 text-sm text-gray-500">알림 수신 방법을 설정합니다.</p>

            <div className="rounded-xl border border-gray-200 bg-white px-6 py-2 shadow-sm">
              <SettingRow label="이메일 알림" description="중요한 업데이트를 이메일로 받습니다.">
                <ToggleSwitch enabled={emailNotifications} onChange={setEmailNotifications} />
              </SettingRow>
              <SettingRow label="푸시 알림" description="브라우저 푸시 알림을 받습니다.">
                <ToggleSwitch enabled={pushNotifications} onChange={setPushNotifications} />
              </SettingRow>
              <SettingRow label="워크플로우 알림" description="워크플로우 상태 변경 시 알림을 받습니다.">
                <ToggleSwitch enabled={workflowAlerts} onChange={setWorkflowAlerts} />
              </SettingRow>
              <SettingRow label="보안 알림" description="보안 이벤트 발생 시 즉시 알림을 받습니다.">
                <ToggleSwitch enabled={securityAlerts} onChange={setSecurityAlerts} />
              </SettingRow>
            </div>
          </div>
        )}

        {/* Appearance */}
        {activeSection === "appearance" && (
          <div>
            <h3 className="mb-2 text-2xl font-bold text-gray-900">외관 설정</h3>
            <p className="mb-8 text-sm text-gray-500">인터페이스 모양을 사용자 정의합니다.</p>

            <div className="mb-6 rounded-xl border border-gray-200 bg-white px-6 py-2 shadow-sm">
              <SettingRow label="테마" description="인터페이스 색상 테마를 선택합니다.">
                <div className="flex gap-2">
                  {(["light", "dark", "system"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`rounded-lg px-4 py-2 text-xs font-medium ${
                        theme === t
                          ? "border-2 border-blue-500 bg-blue-50 text-blue-600"
                          : "border border-gray-200 bg-white text-gray-500"
                      }`}
                    >
                      {t === "light" ? "☀️ 라이트" : t === "dark" ? "🌙 다크" : "💻 시스템"}
                    </button>
                  ))}
                </div>
              </SettingRow>
              <SettingRow label="언어" description="인터페이스 표시 언어를 선택합니다.">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                >
                  <option value="ko">한국어</option>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                </select>
              </SettingRow>
              <SettingRow label="사이드바 접기" description="사이드바를 기본적으로 접힌 상태로 표시합니다.">
                <ToggleSwitch enabled={sidebarCollapsed} onChange={setSidebarCollapsed} />
              </SettingRow>
            </div>
          </div>
        )}

        {/* Integrations */}
        {activeSection === "integrations" && (
          <div>
            <h3 className="mb-2 text-2xl font-bold text-gray-900">연동 관리</h3>
            <p className="mb-8 text-sm text-gray-500">외부 서비스 연동을 관리합니다.</p>

            <div className="flex flex-col gap-3">
              {integrationsLoading && (
                <p className="text-sm text-gray-500">연동 상태를 불러오는 중...</p>
              )}
              {[
                { key: "outlook", name: "Microsoft Outlook", desc: "이메일 연동", icon: "📧", status: outlookConnected ? ("ok" as const) : null },
                { key: "aios-v1", name: "AIOS v1", desc: "태스크 및 고객 관리", icon: "🤖", status: getProjectStatus("aios-v1") },
                { key: "f-aios-v3-core", name: "F-aios-v3", desc: "AI 엔진 연동", icon: "⚡", status: getProjectStatus("f-aios-v3-core") },
                { key: "sangfor-mcp-workflow", name: "Sangfor", desc: "보안 어플라이언스 관리", icon: "🛡️", status: getProjectStatus("sangfor-mcp-workflow") },
                { key: "vibe-coding-os", name: "vibe-coding-os", desc: "지식 및 에이전트 프레임워크", icon: "🧠", status: getProjectStatus("vibe-coding-os") },
                { key: "whelp99", name: "whelp99 MCP", desc: "MCP 확장 (filesystem probe)", icon: "🔧", status: getProjectStatus("whelp99-code-sangfor-engineer-mcp") },
                { key: "github", name: "GitHub", desc: "코드 저장소 연동", icon: "🐙", status: githubConnected === null ? null : githubConnected ? ("ok" as const) : ("unreachable" as const) },
                { key: "slack", name: "Slack", desc: "팀 커뮤니케이션", icon: "💬", status: slackConnected === null ? null : slackConnected ? ("ok" as const) : ("unreachable" as const) },
              ].map((integration) => {
                const colors = statusColors(integration.status);
                return (
                  <div key={integration.key} className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-xl">
                      {integration.icon}
                    </div>
                    <div className="flex-1">
                      <p className="mb-0.5 text-sm font-semibold text-gray-900">{integration.name}</p>
                      <p className="text-xs text-gray-500">{integration.desc}</p>
                    </div>
                    <div className={`rounded-full px-3.5 py-1.5 ${colors.bg}`}>
                      <span className={`text-xs font-medium ${colors.color}`}>{statusLabel(integration.status)}</span>
                    </div>
                    <button className="cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs text-gray-700">
                      {integration.status === "ok" ? "관리" : "연결"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Security */}
        {activeSection === "security" && (
          <div>
            <h3 className="mb-2 text-2xl font-bold text-gray-900">보안 설정</h3>
            <p className="mb-8 text-sm text-gray-500">계정 보안을 관리합니다.</p>

            <div className="mb-6 rounded-xl border border-gray-200 bg-white px-6 py-2 shadow-sm">
              <SettingRow label="비밀번호 변경" description="마지막 변경: 30일 전">
                <button className="cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs text-gray-700">변경</button>
              </SettingRow>
              <SettingRow label="2단계 인증" description="추가 보안 계층을 활성화합니다.">
                <ToggleSwitch enabled={false} onChange={() => {}} />
              </SettingRow>
              <SettingRow label="세션 관리" description="활성 세션을 확인하고 관리합니다.">
                <button className="cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs text-gray-700">세션 보기</button>
              </SettingRow>
              <SettingRow label="API 키 관리" description="외부 서비스 접근을 위한 API 키를 관리합니다.">
                <button className="cursor-pointer rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs text-gray-700">관리</button>
              </SettingRow>
            </div>
          </div>
        )}

        {/* About */}
        {activeSection === "about" && (
          <div>
            <h3 className="mb-2 text-2xl font-bold text-gray-900">정보</h3>
            <p className="mb-8 text-sm text-gray-500">시스템 정보 및 라이선스.</p>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-900 text-2xl font-bold text-white">
                  AI
                </div>
                <div>
                  <p className="mb-1 text-xl font-bold text-gray-900">AIOSv2 Integration</p>
                  <p className="text-sm text-gray-500">AIOS 통합 플랫폼</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {[
                  { label: "버전", value: "v2.1.0" },
                  { label: "빌드", value: "2026.06.11" },
                  { label: "프레임워크", value: "Next.js 14 + Turborepo" },
                  { label: "런타임", value: "Node.js 20" },
                  { label: "라이선스", value: "Enterprise" },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between border-b border-gray-100 py-2.5">
                    <span className="text-sm text-gray-500">{item.label}</span>
                    <span className="text-sm font-medium text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Save Button (for applicable sections) */}
        {["profile", "notifications", "appearance"].includes(activeSection) && (
          <div className="mt-7 flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`rounded-lg px-6 py-3 text-sm font-semibold text-white ${
                saving ? "cursor-not-allowed bg-gray-400" : "bg-gray-900"
              }`}
            >
              {saving ? "저장 중..." : "저장"}
            </button>
            {saved && (
              <span className="text-sm font-medium text-emerald-600">✅ 저장되었습니다</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
