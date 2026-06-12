import { describe, it, expect } from 'vitest'

const WEB_URL = 'http://localhost:3100'
const API_URL = 'http://localhost:3200'

describe('Integration: Approvals API', () => {
  it('GET /api/approvals should return approvals list', async () => {
    const res = await fetch(`${WEB_URL}/api/approvals`)
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data).toHaveProperty('approvals')
    expect(Array.isArray(data.approvals)).toBe(true)
    expect(data.approvals.length).toBeGreaterThan(0)

    // Verify structure of approval items
    const approval = data.approvals[0]
    expect(approval).toHaveProperty('id')
    expect(approval).toHaveProperty('type')
    expect(approval).toHaveProperty('requester')
    expect(approval).toHaveProperty('target')
    expect(approval).toHaveProperty('status')
    expect(approval).toHaveProperty('createdAt')
    expect(['pending', 'approved', 'rejected', 'deferred']).toContain(approval.status)
  })

  it('POST /api/approvals should create new approval', async () => {
    const res = await fetch(`${WEB_URL}/api/approvals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'commit',
        requester: 'test-agent',
        target: 'test commit',
        context: { message: 'test' },
      }),
    })
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.approval).toHaveProperty('id')
    expect(data.approval.status).toBe('pending')
    expect(data.approval.type).toBe('commit')
  })

  it('POST /api/approvals should handle approve action', async () => {
    // First, get an existing approval
    const listRes = await fetch(`${WEB_URL}/api/approvals`)
    const listData = await listRes.json()
    const pendingApproval = listData.approvals.find((a: any) => a.status === 'pending')

    if (pendingApproval) {
      const res = await fetch(`${WEB_URL}/api/approvals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          approvalId: pendingApproval.id,
        }),
      })
      expect(res.ok).toBe(true)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.approval.status).toBe('approved')
    }
  })
})

describe('Integration: F-aios-v3 Health', () => {
  it('API server /health should be healthy', async () => {
    const res = await fetch(`${API_URL}/health`)
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data.status).toBe('ok')
    expect(data).toHaveProperty('version')
    expect(data).toHaveProperty('timestamp')
  })

  it('API server /api/health should be healthy', async () => {
    const res = await fetch(`${API_URL}/api/health`)
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data.status).toBe('ok')
  })

  it('F-aios-v3 proxy health should work', async () => {
    const res = await fetch(`${WEB_URL}/api/aios-v3/health`)
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data.status).toBe('ok')
    expect(data.proxy).toBe('F-aios-v3 health proxied successfully')
    expect(data.upstream).toBe('http://localhost:3200')
  })
})
