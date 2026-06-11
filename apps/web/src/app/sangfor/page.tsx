'use client'

import { useState } from 'react'

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

type TabKey = 'devices' | 'security' | 'topology'

export default function SangforPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('devices')
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)

  const getStatusStyle = (status: Device['status']) => {
    switch (status) {
      case 'online': return { bg: '#d1fae5', text: '#059669', label: '온라인' }
      case 'offline': return { bg: '#fee2e2', text: '#dc2626', label: '오프라인' }
      case 'warning': return { bg: '#fef3c7', text: '#d97706', label: '경고' }
    }
  }

  const getSeverityStyle = (severity: SecurityEvent['severity']) => {
    switch (severity) {
      case 'high': return { bg: '#fef2f2', text: '#dc2626', label: '높음' }
      case 'medium': return { bg: '#fef3c7', text: '#d97706', label: '중간' }
      case 'low': return { bg: '#dbeafe', text: '#2563eb', label: '낮음' }
    }
  }

  const getEventTypeIcon = (type: SecurityEvent['type']) => {
    switch (type) {
      case 'blocked': return '🛡️'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
    }
  }

  const onlineDevices = mockDevices.filter(d => d.status === 'online').length
  const warningDevices = mockDevices.filter(d => d.status === 'warning').length
  const offlineDevices = mockDevices.filter(d => d.status === 'offline').length

  return (
    <div style={{ padding: '32px', minHeight: '100%', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: '0 0 8px 0' }}>
          🛡️ Sangfor 보안 관리
        </h1>
        <p style={{ fontSize: '15px', color: '#6b7280', margin: 0 }}>
          네트워크 보안 어플라이언스 모니터링 및 관리
        </p>
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: '총 디바이스', value: mockDevices.length, icon: '🖥️', color: '#dbeafe' },
          { label: '온라인', value: onlineDevices, icon: '✅', color: '#d1fae5' },
          { label: '경고', value: warningDevices, icon: '⚠️', color: '#fef3c7' },
          { label: '오프라인', value: offlineDevices, icon: '❌', color: '#fee2e2' },
        ].map((card) => (
          <div key={card.label} style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            border: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              backgroundColor: card.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
            }}>
              {card.icon}
            </div>
            <div>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{card.label}</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: '4px 0 0 0' }}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', backgroundColor: 'white', borderRadius: '10px', padding: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', width: 'fit-content' }}>
        {([
          { key: 'devices' as TabKey, label: '디바이스 현황', icon: '🖥️' },
          { key: 'security' as TabKey, label: '보안 이벤트', icon: '🛡️' },
          { key: 'topology' as TabKey, label: '네트워크 토폴로지', icon: '🔗' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: activeTab === tab.key ? '#111827' : 'transparent',
              color: activeTab === tab.key ? 'white' : '#6b7280',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'devices' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedDevice ? '1fr 380px' : '1fr', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {mockDevices.map((device) => {
              const statusStyle = getStatusStyle(device.status)
              return (
                <div
                  key={device.id}
                  onClick={() => setSelectedDevice(device)}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '10px',
                    padding: '20px 24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    border: selectedDevice?.id === device.id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '10px',
                    backgroundColor: statusStyle.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                  }}>
                    {device.type === '방화벽' ? '🔥' : device.type === 'WAF' ? '🌐' : device.type === 'VPN' ? '🔒' : '⚖️'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0 0 4px 0' }}>{device.name}</p>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{device.type} · {device.ip}</p>
                  </div>
                  <div style={{ textAlign: 'right', marginRight: '8px' }}>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 2px 0' }}>처리량</p>
                    <p style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: 0 }}>{device.throughput}</p>
                  </div>
                  <div style={{
                    padding: '6px 14px',
                    borderRadius: '16px',
                    backgroundColor: statusStyle.bg,
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: statusStyle.text }}>{statusStyle.label}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {selectedDevice && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              border: '1px solid #e5e7eb',
              height: 'fit-content',
              position: 'sticky',
              top: '20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>디바이스 상세</h3>
                <button onClick={() => setSelectedDevice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#9ca3af' }}>✕</button>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 4px 0' }}>{selectedDevice.name}</p>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{selectedDevice.type} · {selectedDevice.ip}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>CPU</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: (selectedDevice.cpu || 0) > 70 ? '#dc2626' : '#111827' }}>{selectedDevice.cpu}%</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${selectedDevice.cpu}%`, backgroundColor: (selectedDevice.cpu || 0) > 70 ? '#dc2626' : '#3b82f6', borderRadius: '4px', transition: 'width 0.3s' }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>메모리</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: (selectedDevice.memory || 0) > 80 ? '#dc2626' : '#111827' }}>{selectedDevice.memory}%</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${selectedDevice.memory}%`, backgroundColor: (selectedDevice.memory || 0) > 80 ? '#dc2626' : '#059669', borderRadius: '4px', transition: 'width 0.3s' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>처리량</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{selectedDevice.throughput}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>가동 시간</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{selectedDevice.uptime}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'security' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
            <div style={{ display: 'flex', gap: '24px' }}>
              <div>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>총 이벤트: </span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{mockEvents.length}</span>
              </div>
              <div>
                <span style={{ fontSize: '13px', color: '#dc2626' }}>🔴 높음: </span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626' }}>{mockEvents.filter(e => e.severity === 'high').length}</span>
              </div>
              <div>
                <span style={{ fontSize: '13px', color: '#d97706' }}>🟡 중간: </span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#d97706' }}>{mockEvents.filter(e => e.severity === 'medium').length}</span>
              </div>
            </div>
          </div>
          {mockEvents.map((event) => {
            const sevStyle = getSeverityStyle(event.severity)
            return (
              <div key={event.id} style={{
                padding: '16px 24px',
                borderBottom: '1px solid #f3f4f6',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
              }}>
                <span style={{ fontSize: '20px', marginTop: '2px' }}>{getEventTypeIcon(event.type)}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827', margin: '0 0 4px 0' }}>{event.description}</p>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#9ca3af' }}>
                    <span>출발: {event.source}</span>
                    <span>도착: {event.destination}</span>
                  </div>
                </div>
                <div style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  backgroundColor: sevStyle.bg,
                }}>
                  <span style={{ fontSize: '12px', fontWeight: '500', color: sevStyle.text }}>{sevStyle.label}</span>
                </div>
                <span style={{ fontSize: '12px', color: '#9ca3af', flexShrink: 0 }}>{event.time}</span>
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'topology' && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '48px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔗</div>
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: '0 0 12px 0' }}>
            네트워크 토폴로지
          </h3>
          <p style={{ fontSize: '15px', color: '#6b7280', margin: '0 0 32px 0' }}>
            네트워크 토폴로지 뷰는 Sangfor API 연동 시 활성화됩니다.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            maxWidth: '600px',
            margin: '0 auto',
          }}>
            {mockDevices.map((device) => {
              const statusStyle = getStatusStyle(device.status)
              return (
                <div key={device.id} style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#f9fafb',
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: statusStyle.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 8px auto',
                    fontSize: '14px',
                  }}>
                    {device.status === 'online' ? '🟢' : device.status === 'warning' ? '🟡' : '🔴'}
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: '0 0 2px 0' }}>{device.name}</p>
                  <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>{device.ip}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
