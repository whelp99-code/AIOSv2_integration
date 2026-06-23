'use client';

import { useState, useEffect } from 'react';

/**
 * CEO 일일 브리핑 대시보드
 * 
 * 아침에 접속하면 오늘의 브리핑을 한눈에 볼 수 있는 화면
 */

interface BriefingSummary {
  totalProcessed: number;
  autoHandled: number;
  requiresApproval: number;
  requiresReview: number;
  ceoActionItems: number;
  alerts: number;
}

interface ActionItem {
  id: string;
  type: 'ACTION_REQUIRED' | 'APPROVAL_PENDING' | 'INFO' | 'ALERT';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  personaType: string;
  mailId: string;
  amount?: number;
  createdAt: string;
}

interface PersonaStats {
  personaType: string;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  avgConfidence: number;
}

interface DailyBriefing {
  date: string;
  summary: BriefingSummary;
  actionItems: ActionItem[];
  approvalPending: ActionItem[];
  personaStats: PersonaStats[];
  topCategories: Array<{ category: string; count: number }>;
}

export default function BriefingPage() {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBriefing();
  }, []);

  const fetchBriefing = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/briefing/today');
      if (!response.ok) throw new Error('Failed to fetch briefing');
      const data = await response.json();
      setBriefing(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/approval/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approver: 'CEO' }),
      });
      if (!response.ok) throw new Error('Approval failed');
      await fetchBriefing(); // 새로고침
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('거부 사유를 입력하세요:');
    if (!reason) return;

    try {
      const response = await fetch(`/api/approval/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approver: 'CEO', reason }),
      });
      if (!response.ok) throw new Error('Rejection failed');
      await fetchBriefing(); // 새로고침
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rejection failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            오류: {error}
          </div>
        </div>
      </div>
    );
  }

  if (!briefing) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-gray-500">브리핑 데이터가 없습니다.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900">
            📊 CEO 일일 브리핑 - {briefing.date}
          </h1>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-4 gap-4">
          <SummaryCard title="처리" value={briefing.summary.totalProcessed} color="blue" />
          <SummaryCard title="자동 처리" value={briefing.summary.autoHandled} color="green" />
          <SummaryCard title="승인 대기" value={briefing.summary.requiresApproval} color="yellow" />
          <SummaryCard title="알림" value={briefing.summary.alerts} color="red" />
        </div>

        {/* 승인 필요 항목 */}
        {briefing.approvalPending.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">⚠️ 승인 필요</h2>
            <div className="space-y-4">
              {briefing.approvalPending.map((item) => (
                <ApprovalCard
                  key={item.id}
                  item={item}
                  onApprove={() => handleApprove(item.id)}
                  onReject={() => handleReject(item.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* 액션 아이템 */}
        {briefing.actionItems.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📋 액션 아이템</h2>
            <div className="space-y-3">
              {briefing.actionItems.map((item) => (
                <ActionItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* 페르소나별 현황 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📈 페르소나별 현황</h2>
          <div className="grid grid-cols-4 gap-4">
            {briefing.personaStats.map((stat) => (
              <PersonaStatCard key={stat.personaType} stat={stat} />
            ))}
          </div>
        </div>

        {/* 상위 카테고리 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🏷️ 상위 카테고리</h2>
          <div className="space-y-2">
            {briefing.topCategories.map((cat) => (
              <div key={cat.category} className="flex justify-between items-center">
                <span className="text-gray-700">{cat.category}</span>
                <span className="text-gray-500">{cat.count}건</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// 요약 카드 컴포넌트
function SummaryCard({ title, value, color }: { title: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="text-sm font-medium opacity-75">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

// 승인 카드 컴포넌트
function ApprovalCard({ item, onApprove, onReject }: {
  item: ActionItem;
  onApprove: () => void;
  onReject: () => void;
}) {
  const priorityColors: Record<string, string> = {
    high: 'border-red-300 bg-red-50',
    medium: 'border-yellow-300 bg-yellow-50',
    low: 'border-gray-300 bg-gray-50',
  };

  return (
    <div className={`border rounded-lg p-4 ${priorityColors[item.priority]}`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-gray-900">{item.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
          <div className="flex gap-2 mt-2">
            <span className="text-xs px-2 py-1 bg-gray-200 rounded">{item.personaType}</span>
            {item.amount && (
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                {item.amount.toLocaleString()}원
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onApprove}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            승인
          </button>
          <button
            onClick={onReject}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            거부
          </button>
        </div>
      </div>
    </div>
  );
}

// 액션 아이템 카드 컴포넌트
function ActionItemCard({ item }: { item: ActionItem }) {
  const typeIcons: Record<string, string> = {
    ACTION_REQUIRED: '🔴',
    APPROVAL_PENDING: '🟡',
    INFO: '🔵',
    ALERT: '⚠️',
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded">
      <span className="text-lg">{typeIcons[item.type]}</span>
      <div>
        <h4 className="font-medium text-gray-900">{item.title}</h4>
        <p className="text-sm text-gray-600">{item.description}</p>
        <div className="flex gap-2 mt-1">
          <span className="text-xs text-gray-500">{item.personaType}</span>
          <span className="text-xs text-gray-500">•</span>
          <span className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}

// 페르소나 통계 카드 컴포넌트
function PersonaStatCard({ stat }: { stat: PersonaStats }) {
  const successRate = stat.totalProcessed > 0
    ? Math.round((stat.successCount / stat.totalProcessed) * 100)
    : 0;

  return (
    <div className="border rounded-lg p-4">
      <div className="font-semibold text-gray-900">{stat.personaType}</div>
      <div className="text-2xl font-bold text-blue-600">{stat.totalProcessed}건</div>
      <div className="text-sm text-gray-500">
        성공률: {successRate}% | 신뢰도: {Math.round(stat.avgConfidence * 100)}%
      </div>
    </div>
  );
}
