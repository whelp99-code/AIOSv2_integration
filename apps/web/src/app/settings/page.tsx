'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

interface SettingSection {
  id: string
  title: string
  icon: string
}

const sections: SettingSection[] = [
  { id: 'profile', title: '프로필', icon: '👤' },
  { id: 'notifications', title: '알림', icon: '🔔' },
  { id: 'appearance', title: '외관', icon: '🎨' },
  { id: 'integrations', title: '연동 관리', icon: '🔗' },
  { id: 'security', title: '보안', icon: '🔒' },
  { id: 'about', title: '정보', icon: 'ℹ️' },
]

export default function SettingsPage() {
  const { data: session } = useSession()
  const [activeSection, setActiveSection] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Profile settings
  const [displayName, setDisplayName] = useState(session?.user?.name || '')
  const [email, setEmail] = useState(session?.user?.email || '')

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [workflowAlerts, setWorkflowAlerts] = useState(true)
  const [securityAlerts, setSecurityAlerts] = useState(true)

  // Appearance settings
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light')
  const [language, setLanguage] = useState('ko')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    if (session?.user) {
      setDisplayName(session.user.name || '')
      setEmail(session.user.email || '')
    }
  }, [session])

  const handleSave = async () => {
    setSaving(true)
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 800))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!enabled)}
      style={{
        width: '48px',
        height: '26px',
        borderRadius: '13px',
        border: 'none',
        cursor: 'pointer',
        backgroundColor: enabled ? '#3b82f6' : '#d1d5db',
        position: 'relative',
        transition: 'background-color 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        backgroundColor: 'white',
        position: 'absolute',
        top: '2px',
        left: enabled ? '24px' : '2px',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )

  const SettingRow = ({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) => (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 0',
      borderBottom: '1px solid #f3f4f6',
    }}>
      <div style={{ flex: 1, marginRight: '24px' }}>
        <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827', margin: 0 }}>{label}</p>
        {description && <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>{description}</p>}
      </div>
      {children}
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: '#f9fafb' }}>
      {/* Sidebar */}
      <div style={{
        width: '260px',
        backgroundColor: 'white',
        borderRight: '1px solid #e5e7eb',
        padding: '24px 16px',
        flexShrink: 0,
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: '0 0 24px 16px' }}>
          ⚙️ 설정
        </h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                backgroundColor: activeSection === section.id ? '#f3f4f6' : 'transparent',
                color: activeSection === section.id ? '#111827' : '#6b7280',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '16px' }}>{section.icon}</span>
              {section.title}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
        {/* Profile */}
        {activeSection === 'profile' && (
          <div>
            <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 8px 0' }}>프로필 설정</h3>
            <p style={{ fontSize: '15px', color: '#6b7280', margin: '0 0 32px 0' }}>계정 정보를 관리합니다.</p>

            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              border: '1px solid #e5e7eb',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                <div style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  backgroundColor: '#dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  fontWeight: '700',
                  color: '#2563eb',
                }}>
                  {(session?.user?.name || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 4px 0' }}>{session?.user?.name || '사용자'}</p>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{session?.user?.email || ''}</p>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>표시 이름</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  style={{
                    width: '100%',
                    maxWidth: '400px',
                    padding: '10px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    maxWidth: '400px',
                    padding: '10px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Notifications */}
        {activeSection === 'notifications' && (
          <div>
            <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 8px 0' }}>알림 설정</h3>
            <p style={{ fontSize: '15px', color: '#6b7280', margin: '0 0 32px 0' }}>알림 수신 방법을 설정합니다.</p>

            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '8px 24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              border: '1px solid #e5e7eb',
            }}>
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
        {activeSection === 'appearance' && (
          <div>
            <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 8px 0' }}>외관 설정</h3>
            <p style={{ fontSize: '15px', color: '#6b7280', margin: '0 0 32px 0' }}>인터페이스 모양을 사용자 정의합니다.</p>

            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '8px 24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              border: '1px solid #e5e7eb',
              marginBottom: '24px',
            }}>
              <SettingRow label="테마" description="인터페이스 색상 테마를 선택합니다.">
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['light', 'dark', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: theme === t ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        backgroundColor: theme === t ? '#eff6ff' : 'white',
                        color: theme === t ? '#2563eb' : '#6b7280',
                      }}
                    >
                      {t === 'light' ? '☀️ 라이트' : t === 'dark' ? '🌙 다크' : '💻 시스템'}
                    </button>
                  ))}
                </div>
              </SettingRow>
              <SettingRow label="언어" description="인터페이스 표시 언어를 선택합니다.">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                  }}
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
        {activeSection === 'integrations' && (
          <div>
            <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 8px 0' }}>연동 관리</h3>
            <p style={{ fontSize: '15px', color: '#6b7280', margin: '0 0 32px 0' }}>외부 서비스 연동을 관리합니다.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { name: 'Microsoft Outlook', desc: '이메일 연동', icon: '📧', connected: true, color: '#0078d4' },
                { name: 'AIOS v1', desc: '태스크 및 고객 관리', icon: '🤖', connected: true, color: '#6366f1' },
                { name: 'F-aios-v3', desc: 'AI 엔진 연동', icon: '⚡', connected: true, color: '#059669' },
                { name: 'Sangfor', desc: '보안 어플라이언스 관리', icon: '🛡️', connected: false, color: '#dc2626' },
                { name: 'GitHub', desc: '코드 저장소 연동', icon: '🐙', connected: false, color: '#111827' },
                { name: 'Slack', desc: '팀 커뮤니케이션', icon: '💬', connected: false, color: '#4a154b' },
              ].map((integration) => (
                <div key={integration.name} style={{
                  backgroundColor: 'white',
                  borderRadius: '10px',
                  padding: '20px 24px',
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
                    backgroundColor: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                  }}>
                    {integration.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0 0 2px 0' }}>{integration.name}</p>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{integration.desc}</p>
                  </div>
                  <div style={{
                    padding: '6px 14px',
                    borderRadius: '16px',
                    backgroundColor: integration.connected ? '#d1fae5' : '#f3f4f6',
                  }}>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: '500',
                      color: integration.connected ? '#059669' : '#6b7280',
                    }}>
                      {integration.connected ? '✅ 연결됨' : '미연결'}
                    </span>
                  </div>
                  <button style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    fontSize: '13px',
                    backgroundColor: 'white',
                    color: '#374151',
                  }}>
                    {integration.connected ? '관리' : '연결'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Security */}
        {activeSection === 'security' && (
          <div>
            <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 8px 0' }}>보안 설정</h3>
            <p style={{ fontSize: '15px', color: '#6b7280', margin: '0 0 32px 0' }}>계정 보안을 관리합니다.</p>

            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '8px 24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              border: '1px solid #e5e7eb',
              marginBottom: '24px',
            }}>
              <SettingRow label="비밀번호 변경" description="마지막 변경: 30일 전">
                <button style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  fontSize: '13px',
                  backgroundColor: 'white',
                  color: '#374151',
                }}>
                  변경
                </button>
              </SettingRow>
              <SettingRow label="2단계 인증" description="추가 보안 계층을 활성화합니다.">
                <ToggleSwitch enabled={false} onChange={() => {}} />
              </SettingRow>
              <SettingRow label="세션 관리" description="활성 세션을 확인하고 관리합니다.">
                <button style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  fontSize: '13px',
                  backgroundColor: 'white',
                  color: '#374151',
                }}>
                  세션 보기
                </button>
              </SettingRow>
              <SettingRow label="API 키 관리" description="외부 서비스 접근을 위한 API 키를 관리합니다.">
                <button style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  fontSize: '13px',
                  backgroundColor: 'white',
                  color: '#374151',
                }}>
                  관리
                </button>
              </SettingRow>
            </div>
          </div>
        )}

        {/* About */}
        {activeSection === 'about' && (
          <div>
            <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 8px 0' }}>정보</h3>
            <p style={{ fontSize: '15px', color: '#6b7280', margin: '0 0 32px 0' }}>시스템 정보 및 라이선스.</p>

            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              border: '1px solid #e5e7eb',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  backgroundColor: '#111827',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  color: 'white',
                  fontWeight: '700',
                }}>
                  AI
                </div>
                <div>
                  <p style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: '0 0 4px 0' }}>AIOSv2 Integration</p>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>AIOS 통합 플랫폼</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: '버전', value: 'v2.1.0' },
                  { label: '빌드', value: '2026.06.11' },
                  { label: '프레임워크', value: 'Next.js 14 + Turborepo' },
                  { label: '런타임', value: 'Node.js 20' },
                  { label: '라이선스', value: 'Enterprise' },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>{item.label}</span>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Save Button (for applicable sections) */}
        {['profile', 'notifications', 'appearance'].includes(activeSection) && (
          <div style={{ marginTop: '28px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '12px 24px',
                backgroundColor: saving ? '#9ca3af' : '#111827',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              {saving ? '저장 중...' : '저장'}
            </button>
            {saved && (
              <span style={{ fontSize: '14px', color: '#059669', fontWeight: '500' }}>
                ✅ 저장되었습니다
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
