import { describe, expect, it, vi } from 'vitest'
import {
  buildAgentNotification,
  notifyAgentEvent,
  type AgentActivityEvent,
} from '../src/services/agentActivityNotifications'

function event(overrides: Partial<AgentActivityEvent> = {}): AgentActivityEvent {
  return {
    id: 'event-1',
    character_id: 'character-1',
    event_type: 'message.assistant',
    source: 'websocket',
    payload: { content_redacted: true, content_length: 24 },
    summary: null,
    created_at: '2026-05-06T00:00:00Z',
    ...overrides,
  }
}

describe('agent activity notifications', () => {
  it('builds a redacted desktop notification for new assistant events', () => {
    const notification = buildAgentNotification('아이라', event(), null)

    expect(notification).toEqual({
      title: '아이라',
      body: 'Assistant 메시지 · 24자',
      eventId: 'event-1',
      eventType: 'message.assistant',
      characterName: '아이라',
    })
  })

  it('does not notify for repeated events or user messages', () => {
    expect(buildAgentNotification('아이라', event(), 'event-1')).toBeNull()
    expect(buildAgentNotification('아이라', event({ event_type: 'message.user' }), null)).toBeNull()
  })

  it('sends notifications through the Electron preload API when available', async () => {
    const notify = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('window', { api: { agent: { notify } } })

    await notifyAgentEvent({
      title: '아이라',
      body: '새 활동',
      eventId: 'event-1',
      eventType: 'memory.saved',
      characterName: '아이라',
    })

    expect(notify).toHaveBeenCalledWith({
      title: '아이라',
      body: '새 활동',
      eventId: 'event-1',
      eventType: 'memory.saved',
      characterName: '아이라',
    })
  })
})
