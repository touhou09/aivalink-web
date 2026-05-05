export interface AgentActivityEvent {
  id: string;
  character_id: string;
  event_type: string;
  source: string;
  payload: Record<string, unknown>;
  summary: string | null;
  created_at: string;
}

export interface AgentNotificationPayload {
  title: string;
  body: string;
  eventId: string;
  eventType: string;
  characterName: string;
}

interface ElectronAgentAPI {
  notify?: (payload: AgentNotificationPayload) => Promise<{ ok: boolean }>;
}

interface ElectronWindow {
  api?: {
    agent?: ElectronAgentAPI;
  };
}

const EVENT_LABELS: Record<string, string> = {
  'message.assistant': 'Assistant 메시지',
  'emotion.updated': '감정 갱신',
  'memory.saved': '메모리 저장',
  'local.request.previewed': '로컬 요청 대기',
  'local.request.approved': '로컬 요청 승인됨',
  'local.bridge.connected': '로컬 브리지 연결됨',
  'local.bridge.stopped': '로컬 브리지 중지됨',
};

function eventLabel(eventType: string) {
  if (EVENT_LABELS[eventType]) return EVENT_LABELS[eventType];
  if (eventType.startsWith('local.')) return '로컬 이벤트';
  if (eventType.startsWith('tool.')) return '도구 이벤트';
  return 'Agent 이벤트';
}

function isNotifiable(event: AgentActivityEvent) {
  if (event.event_type === 'message.user') return false;
  return event.event_type === 'message.assistant'
    || event.event_type === 'emotion.updated'
    || event.event_type === 'memory.saved'
    || event.event_type.startsWith('local.');
}

export function buildAgentNotification(
  characterName: string,
  event: AgentActivityEvent | undefined,
  lastSeenEventId: string | null,
): AgentNotificationPayload | null {
  if (!event || event.id === lastSeenEventId || !isNotifiable(event)) return null;

  const label = eventLabel(event.event_type);
  const contentLength = event.payload?.content_length;
  const body = typeof contentLength === 'number'
    ? `${label} · ${contentLength}자`
    : event.summary || label;

  return {
    title: characterName,
    body,
    eventId: event.id,
    eventType: event.event_type,
    characterName,
  };
}

export async function notifyAgentEvent(payload: AgentNotificationPayload): Promise<boolean> {
  const electronWindow = globalThis.window as ElectronWindow | undefined;
  const notify = electronWindow?.api?.agent?.notify;
  if (!notify) return false;
  const result = await notify(payload);
  return result.ok;
}
