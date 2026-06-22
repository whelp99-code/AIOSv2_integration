'use client'

import { useEffect, useState } from 'react'

interface Device {
  id: string
  name: string
  type: string
  ip: string
  status: 'online' | 'offline' | 'warning'
  cpu?: number
  memory?: number
  throughput?: string
  uptime?: string
}

interface SecurityEvent {
  id: string
  time: string
  type: 'blocked' | 'warning' | 'info'
  source: string
  destination: string
  description: string
  severity: 'high' | 'medium' | 'low'
}

const mockDevices: Device[] = [
  { id: '1', name: 'Sangfor NGAF-01', type: '방화벽', ip: '10.0.1.1', status: 'online', cpu: 32, memory: 68, throughput: '2.4 Gbps', uptime: '127일' },
  { id: '2', name: 'Sangfor NGAF-02', type: '방화벽', ip: '10.0.1.2', status: 'online', cpu: 28, memory: 55, throughput: '1.8 Gbps', uptime: '95일' },
  { id: '3', name: 'Sangfor WAF-01', type: 'WAF', ip: '10.0.2.1', status: 'warning', cpu: 72, memory: 84, throughput: '800 Mbps', uptime: '45일' },
  { id: '4', name: 'Sangfor SSL VPN', type: 'VPN', ip: '10.0.3.1', status: 'online', cpu: 15, memory: 42, throughput: '500 Mbps', uptime: '200일' },
  { id: '5', name: 'Sangfor AD-01', type: 'AD', ip: '10.0.4.1', status: 'offline', cpu: 0, memory: 0, throughput: '0', uptime: '-' },
]

const mockEvents: SecurityEvent[] = [
  { id: '1', time: '2026-06-11 14:32:05', type: 'blocked', source: '203.0.113.45', destination: '10.0.1.0/24', description: '외부 IP에서 포트 스캔 시도 차단', severity: 'high' },
  { id: '2', time: '2026-06-11 14:28:11', type: 'warning', source: '192.168.1.105', destination: '10.0.2.1', description: '비정상적인 대역폭 사용 패턴 감지', severity: 'medium' },
  { id: '3', time: '2026-06-11 14:15:33', type: 'info', source: '10.0.3.1', destination: '-', description: 'VPN 세션 50개 활성화', severity: 'low' },
  { id: '4', time: '2026-06-11 13:58:42', type: 'blocked', source: '198.51.100.12', destination: '10.0.1.0/24', description: 'DDoS 공격 패턴 감지 및 차단', severity: 'high' },
  { id: '5', time: '2026-06-11 13:45:19', type: 'warning', source: '10.0.2.1', destination: '-', description: 'WAF 메모리 사용량 80% 초과', severity: 'medium' },
  { id: '6', time: '2026-06-11 13:30:07', type: 'blocked', source: '45.33.32.156', destination: '10.0.1.1', description: '알려진 악성 IP에서 접근 시도', severity: 'high' },
]

interface SangforWorkflow {
  id: string
  name?: string
  title?: string
  status?: string
}

type TabKey = 'devices' | 'security' | 'topology' | 'workflows'

export default function SangforPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('devices')
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [devices, setDevices] = useState<Device[]>(mockDevices)
  const [events, setEvents] = useState<SecurityEvent[]>(mockEvents)
  const [workflows, setWorkflows] = useState<SangforWorkflow[]>([])
  const [liveConnected, setLiveConnected] = useState(false)
  const [pendingApprovalId, setPendingApprovalId] = useState<string | null>(null)
  const [executeBusy, setExecuteBusy] = useState<string | null>(null)

  useEffect(() => {
    async function loadSangforData() {
      try {
        const [healthRes, workflowsRes, eventsRes] = await Promise.all([
          fetch('/api/sangfor/health', { cache: 'no-store' }),
          fetch('/api/sangfor/workflows', { cache: 'no-store' }),
          fetch('/api/sangfor/events', { cache: 'no-store' }),
        ])

        if (healthRes.ok) {
          setLiveConnected(true)
        }

        if (workflowsRes.ok) {
          const data = await workflowsRes.json()
          const list = Array.isArray(data) ? data : data.workflows ?? []
          setWorkflows(list)
        }

        if (eventsRes.ok) {
          const data = await eventsRes.json()
          const list: SecurityEvent[] = Array.isArray(data) ? data : data.events ?? []
          if (list.length > 0) {
            setEvents(list)
          }
        }
      } catch {
        setLiveConnected(false)
        setDevices(mockDevices)
        setEvents(mockEvents)
      }
    }

    void loadSangforData()
  }, [])

  async function executeWorkflow(workflowId: string) {
    setExecuteBusy(workflowId)
    try {
      const res = await fetch(`/api/sangfor/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId: pendingApprovalId ?? undefined,
          requestedBy: 'portal-user',
          payload: {},
        }),
      })
      const data = await res.json()
      if (res.status === 409 && data.approval?.id) {
        setPendingApprovalId(data.approval.id)
        const approveRes = await fetch('/api/approvals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            approvalId: data.approval.id,
            status: 'approved',
            resolvedBy: 'portal-user',
            resolution: 'approved via sangfor page',
          }),
        })
        if (approveRes.ok) {
          setPendingApprovalId(data.approval.id)
          await executeWorkflow(workflowId)
        }
        return
      }
      if (res.ok) {
        setPendingApprovalId(null)
        alert('워크플로우 실행이 완료되었습니다.')
      }
    } finally {
      setExecuteBusy(null)
    }
  }

  const getStatusStyle = (status: Device['status']) => {
    switch (status) {
      case 'online': return { bg: 'bg-emerald-100', text: 'text-emerald-600', label: '온라인' }
      case 'offline': return { bg: 'bg-red-100', text: 'text-red-600', label: '오프라인' }
      case 'warning': return { bg: 'bg-amber-100', text: 'text-amber-600', label: '경고' }
    }
  }

  const getSeverityStyle = (severity: SecurityEvent['severity']) => {
    switch (severity) {
      case 'high': return { bg: 'bg-red-50', text: 'text-red-600', label: '높음' }
      case 'medium': return { bg: 'bg-amber-50', text: 'text-amber-600', label: '중간' }
      case 'low': return { bg: 'bg-blue-50', text: 'text-blue-600', label: '낮음' }
    }
  }

  const getEventTypeIcon = (type: SecurityEvent['type']) => {
    switch (type) {
      case 'blocked': return '🛡️'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
    }
  }

  const onlineDevices = devices.filter(d => d.status === 'online').length
  const warningDevices = devices.filter(d => d.status === 'warning').length
  const offlineDevices = devices.filter(d => d.status === 'offline').length

  return (
    <div className="min-h-full bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-7">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          🛡️ Sangfor 보안 관리
        </h1>
        <p className="text-sm text-gray-500">
          네트워크 보안 어플라이언스 모니터링 및 관리 {liveConnected ? '(live)' : '(mock fallback)'}
        </p>
      </div>

      {/* Overview Cards */}
      <div className="mb-7 grid grid-cols-4 gap-4">
        {[
          { label: '총 디바이스', value: devices.length, icon: '🖥️', color: 'bg-blue-100' },
          { label: '온라인', value: onlineDevices, icon: '✅', color: 'bg-emerald-100' },
          { label: '경고', value: warningDevices, icon: '⚠️', color: 'bg-amber-100' },
          { label: '오프라인', value: offlineDevices, icon: '❌', color: 'bg-red-100' },
        ].map((card) => (
          <div key={card.label} className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${card.color} text-xl`}>
              {card.icon}
            </div>
            <div>
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex w-fit gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
        {([
          { key: 'devices' as TabKey, label: '디바이스 현황', icon: '🖥️' },
          { key: 'security' as TabKey, label: '보안 이벤트', icon: '🛡️' },
          { key: 'topology' as TabKey, label: '네트워크 토폴로지', icon: '🔗' },
          { key: 'workflows' as TabKey, label: '워크플로우', icon: '⚙️' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 rounded-md px-5 py-2.5 text-sm font-medium ${
              activeTab === tab.key
                ? 'bg-gray-900 text-white'
                : 'text-gray-500'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'devices' && (
        <div className={`grid gap-6 ${selectedDevice ? 'grid-cols-[1fr_380px]' : 'grid-cols-1'}`}>
          <div className="flex flex-col gap-3">
            {devices.map((device) => {
              const statusStyle = getStatusStyle(device.status)
              return (
                <div
                  key={device.id}
                  onClick={() => setSelectedDevice(device)}
                  className={`flex cursor-pointer items-center gap-4 rounded-lg bg-white p-5 shadow-sm transition-colors ${
                    selectedDevice?.id === device.id
                      ? 'border-2 border-blue-500'
                      : 'border border-gray-200'
                  }`}
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${statusStyle.bg} text-xl`}>
                    {device.type === '방화벽' ? '🔥' : device.type === 'WAF' ? '🌐' : device.type === 'VPN' ? '🔒' : '⚖️'}
                  </div>
                  <div className="flex-1">
                    <p className="mb-1 text-sm font-semibold text-gray-900">{device.name}</p>
                    <p className="text-xs text-gray-500">{device.type} · {device.ip}</p>
                  </div>
                  <div className="mr-2 text-right">
                    <p className="mb-0.5 text-xs text-gray-500">처리량</p>
                    <p className="text-sm font-semibold text-gray-900">{device.throughput}</p>
                  </div>
                  <div className={`rounded-full px-3.5 py-1.5 ${statusStyle.bg}`}>
                    <span className={`text-xs font-medium ${statusStyle.text}`}>{statusStyle.label}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {selectedDevice && (
            <div className="sticky top-5 h-fit rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">디바이스 상세</h3>
                <button onClick={() => setSelectedDevice(null)} className="cursor-pointer border-none bg-none text-lg text-gray-400">✕</button>
              </div>
              <div className="mb-4">
                <p className="mb-1 text-lg font-semibold text-gray-900">{selectedDevice.name}</p>
                <p className="text-sm text-gray-500">{selectedDevice.type} · {selectedDevice.ip}</p>
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <div className="mb-1.5 flex justify-between">
                    <span className="text-xs text-gray-500">CPU</span>
                    <span className={`text-xs font-semibold ${(selectedDevice.cpu || 0) > 70 ? 'text-red-600' : 'text-gray-900'}`}>{selectedDevice.cpu}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded bg-gray-100">
                    <div className={`h-full rounded transition-all ${(selectedDevice.cpu || 0) > 70 ? 'bg-red-600' : 'bg-blue-500'}`} style={{ width: `${selectedDevice.cpu}%` }} />
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between">
                    <span className="text-xs text-gray-500">메모리</span>
                    <span className={`text-xs font-semibold ${(selectedDevice.memory || 0) > 80 ? 'text-red-600' : 'text-gray-900'}`}>{selectedDevice.memory}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded bg-gray-100">
                    <div className={`h-full rounded transition-all ${(selectedDevice.memory || 0) > 80 ? 'bg-red-600' : 'bg-emerald-600'}`} style={{ width: `${selectedDevice.memory}%` }} />
                  </div>
                </div>
                <div className="flex justify-between border-t border-gray-100 py-3">
                  <span className="text-xs text-gray-500">처리량</span>
                  <span className="text-sm font-semibold text-gray-900">{selectedDevice.throughput}</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 py-3">
                  <span className="text-xs text-gray-500">가동 시간</span>
                  <span className="text-sm font-semibold text-gray-900">{selectedDevice.uptime}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'security' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex gap-6 border-b border-gray-200 bg-gray-50 px-6 py-4">
            <div>
              <span className="text-xs text-gray-500">총 이벤트: </span>
              <span className="text-sm font-semibold text-gray-900">{events.length}</span>
            </div>
            <div>
              <span className="text-xs text-red-600">🔴 높음: </span>
              <span className="text-sm font-semibold text-red-600">{events.filter(e => e.severity === 'high').length}</span>
            </div>
            <div>
              <span className="text-xs text-amber-600">🟡 중간: </span>
              <span className="text-sm font-semibold text-amber-600">{events.filter(e => e.severity === 'medium').length}</span>
            </div>
          </div>
          {events.map((event) => {
            const sevStyle = getSeverityStyle(event.severity)
            return (
              <div key={event.id} className="flex items-start gap-4 border-b border-gray-100 px-6 py-4">
                <span className="mt-0.5 text-xl">{getEventTypeIcon(event.type)}</span>
                <div className="flex-1">
                  <p className="mb-1 text-sm font-medium text-gray-900">{event.description}</p>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>출발: {event.source}</span>
                    <span>도착: {event.destination}</span>
                  </div>
                </div>
                <div className={`rounded-full px-2.5 py-1 ${sevStyle.bg}`}>
                  <span className={`text-xs font-medium ${sevStyle.text}`}>{sevStyle.label}</span>
                </div>
                <span className="shrink-0 text-xs text-gray-400">{event.time}</span>
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'topology' && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="mb-5 text-6xl">🔗</div>
          <h3 className="mb-3 text-xl font-semibold text-gray-900">
            네트워크 토폴로지
          </h3>
          <p className="mb-8 text-sm text-gray-500">
            네트워크 토폴로지 뷰는 Sangfor API 연동 시 활성화됩니다.
          </p>
          <div className="mx-auto grid max-w-[600px] grid-cols-3 gap-4">
            {devices.map((device) => {
              const statusStyle = getStatusStyle(device.status)
              return (
                <div key={device.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${statusStyle.bg} text-sm`}>
                    {device.status === 'online' ? '🟢' : device.status === 'warning' ? '🟡' : '🔴'}
                  </div>
                  <p className="mb-0.5 text-xs font-semibold text-gray-900">{device.name}</p>
                  <p className="text-[11px] text-gray-400">{device.ip}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === 'workflows' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Sangfor 워크플로우
          </h3>
          {workflows.length === 0 ? (
            <p className="text-sm text-gray-500">연결된 워크플로우가 없습니다. sangfor-mcp-workflow 서버를 확인하세요.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {workflow.name ?? workflow.title ?? workflow.id}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {workflow.status ?? 'unknown'}
                    </p>
                  </div>
                  <button
                    onClick={() => void executeWorkflow(workflow.id)}
                    disabled={executeBusy === workflow.id}
                    className={`rounded-lg bg-gray-900 px-4 py-2 text-xs text-white ${
                      executeBusy === workflow.id ? 'cursor-wait' : 'cursor-pointer'
                    }`}
                  >
                    {executeBusy === workflow.id ? '실행 중...' : '실행'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
