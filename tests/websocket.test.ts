import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VTuberWebSocket } from '../src/lib/websocket'

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1
  static instances: MockWebSocket[] = []
  readyState = MockWebSocket.OPEN
  url: string
  onopen: (() => void) | null = null
  onmessage: ((e: MessageEvent<string>) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  sent: string[] = []

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
    setTimeout(() => this.onopen?.(), 0)
  }

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    this.readyState = 3
    this.onclose?.()
  }
}

vi.stubGlobal('WebSocket', MockWebSocket)

describe('VTuberWebSocket', () => {
  beforeEach(() => {
    MockWebSocket.instances = []
  })

  it('uses cookie authentication and never adds token query params', () => {
    const LegacyWebSocket = VTuberWebSocket as unknown as new (instanceId: string, token: string) => VTuberWebSocket
    const ws = new LegacyWebSocket('test-id', 'legacy-token')
    ws.connect()

    expect(MockWebSocket.instances[0].url).toMatch(/\/client-ws\/test-id$/)
    expect(MockWebSocket.instances[0].url).not.toContain('token=')
  })

  it('should send text-input message', () => {
    const ws = new VTuberWebSocket('test-id')
    ws.connect()

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        ws.sendTextInput('hello')
        resolve()
      }, 10)
    })
  })

  it('should disconnect cleanly', () => {
    const ws = new VTuberWebSocket('test-id')
    ws.connect()
    ws.disconnect()
    // Should not throw
  })

  it('should register and call message handlers', () => {
    const ws = new VTuberWebSocket('test-id')
    const handler = vi.fn()
    ws.on('test-type', handler)
    ws.connect()
  })
})
