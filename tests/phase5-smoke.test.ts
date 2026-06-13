import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { AddressInfo } from 'node:net'
import { createServer, type Server } from 'node:http'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let server: Server
let apiBaseUrl = ''
let existingWhelp99Path: string
let missingWhelp99Path: string

let customersGet: typeof import('../apps/web/src/app/api/customers/route').GET
let sangforEventsGet: typeof import('../apps/web/src/app/api/sangfor/events/route').GET

beforeAll(async () => {
  vi.stubEnv('NODE_ENV', 'development')

  const tempRoot = await mkdtemp(join(tmpdir(), 'phase5-smoke-'))
  existingWhelp99Path = join(tempRoot, 'whelp99-existing')
  missingWhelp99Path = join(tempRoot, 'whelp99-missing')
  await mkdir(existingWhelp99Path, { recursive: true })

  const [customersRoute, eventsRoute, { createApp }] = await Promise.all([
    import('../apps/web/src/app/api/customers/route'),
    import('../apps/web/src/app/api/sangfor/events/route'),
    import('../apps/api/src/index'),
  ])

  customersGet = customersRoute.GET
  sangforEventsGet = eventsRoute.GET

  const app = createApp()
  server = createServer(app)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
  const address = server.address() as AddressInfo
  apiBaseUrl = `http://127.0.0.1:${address.port}`
})

afterAll(async () => {
  vi.unstubAllEnvs()
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) { reject(error); return }
        resolve()
      })
    })
  }
})

describe('Phase 5: AIOS v1 customers proxy smoke', () => {
  it('GET /api/customers should proxy to AIOS v1 upstream', async () => {
    const mockCustomers = [
      { id: 'c-1', name: 'Acme Corp', status: 'active' },
      { id: 'c-2', name: 'Globex Inc', status: 'active' },
    ]

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockCustomers), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const res = await customersGet(new Request('http://localhost/api/customers'))
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data).toHaveLength(2)
    expect(data[0].id).toBe('c-1')
    fetchSpy.mockRestore()
  })

  it('GET /api/customers with search should forward query params', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify([{ id: 'c-1', name: 'Acme Corp' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const res = await customersGet(new Request('http://localhost/api/customers?search=acme'))
    expect(res.ok).toBe(true)
    const calledUrl = fetchSpy.mock.calls[0][0] as string
    expect(calledUrl).toContain('/api/customers?search=acme')
    fetchSpy.mockRestore()
  })

  it('GET /api/customers should return error response when upstream fails', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
      new Error('ECONNREFUSED'),
    )

    const res = await customersGet(new Request('http://localhost/api/customers'))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Customers proxy error')
    expect(data.details).toContain('ECONNREFUSED')
    fetchSpy.mockRestore()
  })
})

describe('Phase 5: Sangfor events proxy smoke', () => {
  it('GET /api/sangfor/events should proxy to sangfor-mcp-workflow upstream', async () => {
    const mockEvents = [
      { id: 'evt-1', type: 'intrusion-detected', severity: 'high', timestamp: new Date().toISOString() },
      { id: 'evt-2', type: 'policy-violation', severity: 'medium', timestamp: new Date().toISOString() },
    ]

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockEvents), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const res = await sangforEventsGet(new Request('http://localhost/api/sangfor/events'))
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data).toHaveLength(2)
    expect(data[0].type).toBe('intrusion-detected')
    fetchSpy.mockRestore()
  })

  it('GET /api/sangfor/events should return error when upstream unreachable', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
      new Error('connect ECONNREFUSED'),
    )

    const res = await sangforEventsGet(new Request('http://localhost/api/sangfor/events'))
    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Sangfor events proxy error')
    fetchSpy.mockRestore()
  })
})

describe('Phase 5: whelp99 health bridge smoke', () => {
  it('GET /api/whelp99/health should return planned or unreachable', async () => {
    const res = await fetch(`${apiBaseUrl}/api/whelp99/health`)
    const data = await res.json()

    expect(data).toHaveProperty('id', 'whelp99-code-sangfor-engineer-mcp')
    expect(data).toHaveProperty('status')
    expect(['planned', 'unreachable']).toContain(data.status)
    expect(data).toHaveProperty('upstream')
    expect(data).toHaveProperty('details')
  })

  it('GET /api/whelp99/health should return planned when workspace path exists', async () => {
    const origPath = process.env.WHELP99_MCP_PATH
    process.env.WHELP99_MCP_PATH = existingWhelp99Path

    const res = await fetch(`${apiBaseUrl}/api/whelp99/health`)
    const data = await res.json()
    expect(data.status).toBe('planned')
    expect(data.id).toBe('whelp99-code-sangfor-engineer-mcp')

    if (origPath === undefined) {
      delete process.env.WHELP99_MCP_PATH
    } else {
      process.env.WHELP99_MCP_PATH = origPath
    }
  })

  it('GET /api/whelp99/health should return unreachable when workspace path missing', async () => {
    const origPath = process.env.WHELP99_MCP_PATH
    process.env.WHELP99_MCP_PATH = missingWhelp99Path

    const res = await fetch(`${apiBaseUrl}/api/whelp99/health`)
    const data = await res.json()
    expect(data.status).toBe('unreachable')
    expect(data.id).toBe('whelp99-code-sangfor-engineer-mcp')

    if (origPath === undefined) {
      delete process.env.WHELP99_MCP_PATH
    } else {
      process.env.WHELP99_MCP_PATH = origPath
    }
  })
})
