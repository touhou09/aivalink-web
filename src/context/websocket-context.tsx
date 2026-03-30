import { createContext, useContext } from 'react';

export type WsConnectionState = 'connecting' | 'open' | 'closed';

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface WebSocketContextType {
  /** Send typed JSON message */
  send: (type: string, data?: Record<string, unknown>) => void;
  /** Send user text input */
  sendTextInput: (text: string) => void;
  /** Send audio (base64 WAV) */
  sendAudioInput: (audioBase64: string) => void;
  /** Interrupt current response */
  sendInterrupt: () => void;
  /** Connection state */
  wsState: WsConnectionState;
  /** Chat messages */
  messages: ChatMessage[];
  /** Current streaming response */
  currentResponse: string;
  /** Connected character info */
  characterInfo: { name: string; live2d_model?: string } | null;
  /** Audio analyser for lip sync */
  audioAnalyser: AnalyserNode | null;
}

export const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
