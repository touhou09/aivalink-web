type MessageHandler = (msg: { type: string; data: Record<string, unknown> }) => void;

export class VTuberWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private maxReconnectDelay = 30000;
  private reconnectAttempt = 0;
  private shouldReconnect = true;

  constructor(instanceId: string) {
    const base = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
    this.url = base + '/client-ws/' + instanceId;
  }

  connect() {
    this.shouldReconnect = true;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
    };

    this.ws.onmessage = (event) => {
      if (event.data instanceof Blob) {
        // Binary audio frame
        const handlers = this.handlers.get('audio-binary') || [];
        handlers.forEach((h) => h({ type: 'audio-binary', data: { audio: event.data } }));
        return;
      }
      try {
        const msg = JSON.parse(event.data);
        const handlers = this.handlers.get(msg.type) || [];
        handlers.forEach((h) => h(msg));
        const allHandlers = this.handlers.get('*') || [];
        allHandlers.forEach((h) => h(msg));
      } catch {
        // ignore parse errors
      }
    };

    this.ws.onclose = () => {
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  on(type: string, handler: MessageHandler) {
    const existing = this.handlers.get(type) || [];
    existing.push(handler);
    this.handlers.set(type, existing);
    return () => {
      const handlers = this.handlers.get(type) || [];
      this.handlers.set(type, handlers.filter((h) => h !== handler));
    };
  }

  send(type: string, data: Record<string, unknown> = {}) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }

  sendTextInput(text: string) {
    this.send('text-input', { text });
  }

  sendAudioInput(audioBase64: string) {
    this.send('audio-input', { audio: audioBase64 });
  }

  sendInterrupt() {
    this.send('interrupt');
  }

  sendPing() {
    this.send('ping');
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  private scheduleReconnect() {
    const delay = Math.min(1000 * 2 ** this.reconnectAttempt, this.maxReconnectDelay);
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }
}
