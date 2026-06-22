"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// KPI Sparkline Chart
interface SparklineData {
  date: string;
  value: number;
}

export function KpiSparkline({
  data,
  color = "#3b82f6",
  height = 60,
}: {
  data: SparklineData[];
  color?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`gradient-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#gradient-${color.replace("#", "")})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Workflow Status Donut Chart
interface WorkflowStatusData {
  name: string;
  value: number;
  color: string;
}

export function WorkflowStatusChart({ data }: { data: WorkflowStatusData[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value: string) => <span className="text-sm text-gray-600">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Weekly Activity Chart
interface ActivityData {
  day: string;
  tasks: number;
  approvals: number;
}

export function WeeklyActivityChart({ data }: { data: ActivityData[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 12, fill: "#6b7280" }}
          axisLine={{ stroke: "#e5e7eb" }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#6b7280" }}
          axisLine={{ stroke: "#e5e7eb" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          }}
        />
        <Legend
          verticalAlign="top"
          height={36}
          formatter={(value: string) => <span className="text-sm text-gray-600">{value}</span>}
        />
        <Bar dataKey="tasks" fill="#3b82f6" radius={[4, 4, 0, 0]} name="작업" />
        <Bar dataKey="approvals" fill="#10b981" radius={[4, 4, 0, 0]} name="승인" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// System Health Gauge
export function SystemHealthGauge({
  healthy,
  total,
}: {
  healthy: number;
  total: number;
}) {
  const percentage = total > 0 ? Math.round((healthy / total) * 100) : 0;
  const color =
    percentage >= 80 ? "#10b981" : percentage >= 50 ? "#f59e0b" : "#ef4444";

  const data = [
    { name: "정상", value: healthy, color: "#10b981" },
    { name: "비정상", value: total - healthy, color: "#ef4444" },
  ];

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width={120} height={120}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={55}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="text-center -mt-16">
        <p className="text-2xl font-bold" style={{ color }}>
          {percentage}%
        </p>
        <p className="text-xs text-gray-500">시스템 가용성</p>
      </div>
    </div>
  );
}
