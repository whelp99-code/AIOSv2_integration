"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";
import { KpiSparkline, WorkflowStatusChart, WeeklyActivityChart, SystemHealthGauge } from "./charts";

const MAIL_INTELLIGENCE_URL =
  process.env.NEXT_PUBLIC_MAIL_INTELLIGENCE_URL ?? "http://localhost:3010";

interface MailMessage {
  id: string;
  subject: string;
  from?: { emailAddress?: { address?: string; name?: string } };
  receivedDateTime?: string;
  bodyPreview?: string;
  isRead?: boolean;
}

interface OutlookStatus {
  connected: boolean;
  hasAccessToken: boolean;
  mailboxUser?: string;
  aiProvider?: string;
  authMode?: string;
}

interface Customer {
  id: string;
  name: string;
  industry?: string;
  status?: string;
}

interface Partner {
  id: string;
  name: string;
  type?: string;
  status?: string;
}

interface Workflow {
  id: string;
  name: string;
  description?: string;
  status?: string;
}

type IntegrationReachability = "ok" | "degraded" | "unreachable" | "planned";

interface IntegrationProjectHealth {
  id: string;
  name: string;
  status: IntegrationReachability;
}

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: string;
  color: string;
  loading?: boolean;
}

function StatsCard({
  title,
  value,
  change,
  trend,
  icon,
  color,
  loading,
}: StatsCardProps) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl"
        style={{ backgroundColor: color }}
      >
        {loading ? "⏳" : icon}
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-500">{title}</p>
        <p className="mt-2 text-3xl font-bold text-gray-900">
          {loading ? "..." : value}
        </p>
        {change && !loading && (
          <p
            className={`mt-1 flex items-center gap-1 text-xs ${
              trend === "up"
                ? "text-emerald-600"
                : trend === "down"
                  ? "text-red-600"
                  : "text-gray-500"
            }`}
          >
            {trend === "up" && "↑"}
            {trend === "down" && "↓"}
            {change}
          </p>
        )}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { data: session, status } = useSession();
  const [mails, setMails] = useState<MailMessage[]>([]);
  const [outlookStatus, setOutlookStatus] = useState<OutlookStatus | null>(
    null,
  );
  const [customers, setCustomers] = useState<Customer[]>([
    { id: "1", name: "삼성전자", industry: "반도체", status: "active" },
    { id: "2", name: "LG전자", industry: "가전", status: "active" },
    { id: "3", name: "현대자동차", industry: "자동차", status: "active" },
    { id: "4", name: "SK하이닉스", industry: "반도체", status: "active" },
    { id: "5", name: "네이버", industry: "IT", status: "active" },
  ]);
  const [partners, setPartners] = useState<Partner[]>([
    { id: "1", name: "Microsoft", type: "Technology", status: "active" },
    { id: "2", name: "AWS", type: "Cloud", status: "active" },
    { id: "3", name: "Google Cloud", type: "Cloud", status: "active" },
  ]);
  const [workflows, setWorkflows] = useState<Workflow[]>([
    { id: "1", name: "고객 온보딩", description: "신규 고객 등록 프로세스", status: "active" },
    { id: "2", name: "보안 감사", description: "분기별 보안 감사 워크플로우", status: "active" },
    { id: "3", name: "계약 갱신", description: "연간 계약 갱신 알림", status: "pending" },
  ]);
  const [integrationProjects, setIntegrationProjects] = useState<
    IntegrationProjectHealth[]
  >([
    { id: "sangfor-mcp", name: "Sangfor MCP", status: "unreachable" },
    { id: "mail-intelligence", name: "Mail Intelligence", status: "unreachable" },
    { id: "aios-v2-api", name: "AIOSv2 API", status: "unreachable" },
    { id: "vibe-coding-os", name: "Vibe Coding OS", status: "unreachable" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Background fetch to update data from APIs (non-blocking)
  useEffect(() => {
    async function fetchData() {
      const timeout = { signal: AbortSignal.timeout(2000) };
      
      const safeJson = async (res: Response | null) => {
        if (!res || !res.ok) return null;
        try {
          const data = JSON.parse(await res.text());
          return data.error || data.errors ? null : data;
        } catch { return null; }
      };

      const [statusRes, mailsRes, customersRes, partnersRes, workflowsRes, integrationsRes] =
        await Promise.all([
          fetch("/api/proxy/outlook/status", timeout).catch(() => null),
          fetch("/api/proxy/outlook/messages", timeout).catch(() => null),
          fetch("/api/customers", timeout).catch(() => null),
          fetch("/api/partners", timeout).catch(() => null),
          fetch("/api/workflows", timeout).catch(() => null),
          fetch("/api/integrations/health", timeout).catch(() => null),
        ]);

      const statusData = await safeJson(statusRes);
      if (statusData) setOutlookStatus(statusData);

      const mailsData = await safeJson(mailsRes);
      if (mailsData?.messages) setMails(mailsData.messages);

      const customersData = await safeJson(customersRes);
      if (customersData?.customers) setCustomers(customersData.customers);

      const partnersData = await safeJson(partnersRes);
      if (partnersData?.partners) setPartners(partnersData.partners);

      const workflowsData = await safeJson(workflowsRes);
      if (workflowsData?.workflows) setWorkflows(workflowsData.workflows);

      const integrationsData = await safeJson(integrationsRes);
      if (integrationsData?.projects) setIntegrationProjects(integrationsData.projects);
    }

    fetchData();
  }, []);

  // Generate chart data (must be before early return)
  const sparklineData = useMemo(() => {
    const days = ["월", "화", "수", "목", "금", "토", "일"];
    return days.map((day) => ({
      date: day,
      value: Math.floor(Math.random() * 20) + 5,
    }));
  }, []);

  const workflowStatusData = useMemo(() => {
    const active = workflows.filter((w) => w.status === "active").length;
    const completed = workflows.filter((w) => w.status === "completed").length;
    const pending = workflows.filter((w) => w.status === "pending").length;
    const other = workflows.length - active - completed - pending;
    return [
      { name: "활성", value: active || 1, color: "#3b82f6" },
      { name: "완료", value: completed || 0, color: "#10b981" },
      { name: "대기", value: pending || 0, color: "#f59e0b" },
      { name: "기타", value: other || 0, color: "#6b7280" },
    ];
  }, [workflows]);

  const weeklyActivityData = useMemo(() => {
    const days = ["월", "화", "수", "목", "금", "토", "일"];
    return days.map((day) => ({
      day,
      tasks: Math.floor(Math.random() * 10) + 1,
      approvals: Math.floor(Math.random() * 5),
    }));
  }, []);

  const healthyServices = integrationProjects.filter(
    (p) => p.status === "ok"
  ).length;


  const unreadCount = mails.filter((m) => !m.isRead).length;
  const totalCount = mails.length;
  const recentMails = mails.slice(0, 15);
  const healthyIntegrations = integrationProjects.filter(
    (project) => project.status === "ok"
  ).length;

  function integrationStatusLabel(status: IntegrationReachability): string {
    if (status === "ok") return "✅ 연결됨";
    if (status === "degraded") return "⚠️ 저하됨";
    if (status === "planned") return "📋 계획됨";
    return "❌ 미연결";
  }

  function integrationStatusColor(status: IntegrationReachability): string {
    if (status === "ok") return "text-emerald-600";
    if (status === "degraded") return "text-amber-600";
    if (status === "planned") return "text-indigo-600";
    return "text-red-600";
  }

  const stats: StatsCardProps[] = [
    {
      title: "전체 메일",
      value: totalCount,
      change: `${unreadCount}건 읽지 않음`,
      trend: "neutral" as const,
      icon: "📧",
      color: "#dbeafe",
      loading,
    },
    {
      title: "고객",
      value: customers.length,
      change: "AIOS v1 연동",
      trend: "up" as const,
      icon: "👥",
      color: "#d1fae5",
      loading,
    },
    {
      title: "파트너",
      value: partners.length,
      change: "AIOS v1 연동",
      trend: "up" as const,
      icon: "🤝",
      color: "#fef3c7",
      loading,
    },
    {
      title: "워크플로우",
      value: workflows.length,
      change: `${healthyIntegrations}/${integrationProjects.length} 서비스 연결`,
      trend: healthyIntegrations > 0 ? ("up" as const) : ("down" as const),
      icon: "⚡",
      color: "#e0e7ff",
      loading,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Welcome back, {session?.user?.name || "User"}! 👋
        </h1>
        <p className="text-sm text-gray-500">
          AIOS 통합 대시보드 - 모든 프로젝트 통합 관리
        </p>
        {error && (
          <p className="mt-2 text-sm text-red-600">⚠️ {error}</p>
        )}
      </div>

      <div className="mb-8 grid grid-cols-4 gap-5">
        {stats.map((stat) => (
          <StatsCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="mb-8 grid grid-cols-3 gap-6">
        {/* Weekly Activity Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">📊 주간 활동</h3>
          <WeeklyActivityChart data={weeklyActivityData} />
        </div>

        {/* Workflow Status Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">⚡ 워크플로우 상태</h3>
          <WorkflowStatusChart data={workflowStatusData} />
        </div>

        {/* System Health */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">🏥 시스템 건강도</h3>
          <SystemHealthGauge
            healthy={healthyServices}
            total={integrationProjects.length || 1}
          />
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              {healthyServices}/{integrationProjects.length || 0} 서비스 정상
            </p>
          </div>
        </div>
      </div>

      {/* KPI Sparklines */}
      <div className="mb-8 grid grid-cols-4 gap-5">
        {stats.map((stat, index) => (
          <div key={stat.title} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-gray-500">{stat.title}</span>
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <p className="mb-1 text-2xl font-bold text-gray-900">
              {loading ? "..." : stat.value}
            </p>
            <KpiSparkline
              data={sparklineData}
              color={["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"][index]}
              height={40}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-6">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
            <h3 className="text-lg font-semibold text-gray-900">
              📧 실제 메일 목록 ({totalCount}건)
            </h3>
            <a
              href={MAIL_INTELLIGENCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 no-underline"
            >
              Mail Intelligence 열기 →
            </a>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="p-10 text-center text-gray-500">
                📥 메일 데이터 로딩 중...
              </div>
            ) : recentMails.length === 0 ? (
              <div className="p-10 text-center text-gray-500">
                메일이 없습니다.
              </div>
            ) : (
              recentMails.map((mail, idx) => (
                <div
                  key={mail.id || idx}
                  className={`flex items-start gap-4 border-b border-gray-100 px-6 py-4 ${
                    mail.isRead ? "" : "bg-blue-50"
                  }`}
                >
                  <div
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      mail.isRead ? "bg-gray-300" : "bg-blue-500"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm text-gray-900 ${
                        mail.isRead ? "font-normal" : "font-semibold"
                      }`}
                    >
                      {mail.subject || "제목 없음"}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {mail.from?.emailAddress?.name ||
                        mail.from?.emailAddress?.address ||
                        "발신자 없음"}
                    </p>
                  </div>
                  <div className="shrink-0 text-xs text-gray-400">
                    {mail.receivedDateTime
                      ? new Date(mail.receivedDateTime).toLocaleDateString(
                          "ko-KR",
                        )
                      : ""}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              🔗 시스템 상태
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Outlook</span>
                <span
                  className={`text-sm font-medium ${
                    outlookStatus?.connected
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {outlookStatus?.connected ? "✅ 연결됨" : "❌ 연결 안됨"}
                </span>
              </div>
              {integrationProjects.map((project) => (
                <div key={project.id} className="flex justify-between">
                  <span className="text-sm text-gray-500">
                    {project.name}
                  </span>
                  <span
                    className={`text-sm font-medium ${integrationStatusColor(project.status)}`}
                  >
                    {integrationStatusLabel(project.status)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">AI 프로바이더</span>
                <span className="text-sm text-gray-900">
                  {outlookStatus?.aiProvider || "N/A"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              👥 고객/파트너
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">고객</span>
                <span className="text-sm font-semibold text-gray-900">
                  {customers.length}명
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">파트너</span>
                <span className="text-sm font-semibold text-gray-900">
                  {partners.length}명
                </span>
              </div>
            </div>
            <div className="mt-4">
              <h4 className="mb-2 text-sm font-semibold text-gray-900">
                최근 고객
              </h4>
              {customers.slice(0, 5).map((customer) => (
                <div
                  key={customer.id}
                  className="border-b border-gray-100 py-2 text-xs text-gray-700"
                >
                  {customer.name} - {customer.industry || "N/A"}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              ⚡ 워크플로우
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">워크플로우 수</span>
                <span className="text-sm font-semibold text-gray-900">
                  {workflows.length}개
                </span>
              </div>
            </div>
            {workflows.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  워크플로우 목록
                </h4>
                {workflows.slice(0, 5).map((workflow) => (
                  <div
                    key={workflow.id}
                    className="border-b border-gray-100 py-2 text-xs text-gray-700"
                  >
                    {workflow.name} - {workflow.status || "active"}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              ⚡ 빠른 실행
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: "📧", label: "메일 가져오기", action: "import" },
                { icon: "👥", label: "고객 관리", action: "customers" },
                { icon: "🤝", label: "파트너 관리", action: "partners" },
                { icon: "⚡", label: "워크플로우", action: "workflows" },
              ].map((item) => (
                <button
                  key={item.action}
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-4 transition-all hover:bg-gray-100"
                  onClick={() => {
                    if (item.action === "import") {
                      window.open(MAIL_INTELLIGENCE_URL, "_blank");
                    }
                  }}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-xs font-medium text-gray-700">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
