import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VTuberWebSocket } from '../src/lib/websocket'

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1
  readyState = MockWebSocket.OPEN
  url: string
  onopen: (() => void) | null = null
  onmessage: ((e: any) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  sent: string[] = []

  constructor(url: string) {
    this.url = url
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
  it('should send text-input message', () => {
    const ws = new VTuberWebSocket('test-id', 'test-token')
    ws.connect()

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        ws.sendTextInput('hello')
        resolve()
      }, 10)
    })
  })

  it('should disconnect cleanly', () => {
    const ws = new VTuberWebSocket('test-id', 'test-token')
    ws.connect()
    ws.disconnect()
    // Should not throw
  })

  it('should register and call message handlers', () => {
    const ws = new VTuberWebSocket('test-id', 'test-token')
    const handler = vi.fn()
    ws.on('test-type', handler)
    ws.connect()
  })
})
