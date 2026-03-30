import {
  useEffect, useRef, useState, useCallback, useMemo,
  type ReactNode,
} from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client';
import { VTuberWebSocket } from '../lib/websocket';
import { useAiState, type AiState } from '../context/ai-state-context';
import {
  WebSocketContext,
  type WsConnectionState,
  type ChatMessage,
} from '../context/websocket-context';

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { characterId } = useParams();
  const { aiState, setAiState, setBackendSynthComplete } = useAiState();

  const [wsState, setWsState] = useState<WsConnectionState>('closed');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [characterInfo, setCharacterInfo] = useState<{
    name: string;
    live2d_model?: string;
  } | null>(null);
  const [audioAnalyser, setAudioAnalyser] = useState<AnalyserNode | null>(null);

  const wsRef = useRef<VTuberWebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const aiStateRef = useRef<AiState>(aiState);

  useEffect(() => {
    aiStateRef.current = aiState;
  }, [aiState]);

  const ensureAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
      const node = audioCtxRef.current.createAnalyser();
      node.fftSize = 256;
      analyserNodeRef.current = node;
      setAudioAnalyser(node);
    }
    return { ctx: audioCtxRef.current, analyser: analyserNodeRef.current! };
  }, []);

  const playAudioBuffer = useCallback(
    (buffer: ArrayBuffer) => {
      const { ctx, analyser } = ensureAudioContext();
      ctx.decodeAudioData(buffer.slice(0))
        .then((decoded) => {
          const source = ctx.createBufferSource();
          source.buffer = decoded;
          source.connect(analyser);
          analyser.connect(ctx.destination);
          source.start();
        })
        .catch(() => {});
    },
    [ensureAudioContext],
  );

  const playAudioBase64 = useCallback(
    (base64: string) => {
      try {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        playAudioBuffer(bytes.buffer as ArrayBuffer);
      } catch {
        // ignore audio errors
      }
    },
    [playAudioBuffer],
  );

  // Connect to WebSocket when characterId changes
  useEffect(() => {
    if (!characterId) return undefined;

    let cancelled = false;
    const token = localStorage.getItem('access_token') || '';

    const connect = async () => {
      try {
        const res = await client.get('/instances');
        const instances = Array.isArray(res.data) ? res.data : res.data.items || [];
        const instance = instances.find(
          (i: Record<string, unknown>) =>
            i.character_id === characterId && i.status === 'running',
        );
        if (!instance || cancelled) return;

        const socket = new VTuberWebSocket(instance.id as string, token);

        socket.on('connected', (msg) => {
          setWsState('open');
          setCharacterInfo(
            msg.data.character as { name: string; live2d_model?: string },
          );
          setAiState('idle');
        });

        socket.on('emotion', (msg) => {
          // Emotion is handled by VTuberPage via characterInfo + Live2D
          // Broadcast via a custom event so components can listen
          window.dispatchEvent(
            new CustomEvent('aiva:emotion', { detail: msg.data.emotion }),
          );
        });

        socket.on('text-chunk', (msg) => {
          setCurrentResponse((prev) => prev + (msg.data.text as string));
        });

        socket.on('text-complete', (msg) => {
          const fullText = msg.data.full_text as string;
          setMessages((prev) => [...prev, { role: 'assistant', text: fullText }]);
          setCurrentResponse('');
        });

        socket.on('audio-chunk', (msg) => {
          const audioB64 = msg.data.audio as string;
          if (audioB64 && !msg.data.is_final) {
            playAudioBase64(audioB64);
          }
        });

        socket.on('audio-binary', (msg) => {
          const blob = msg.data.audio as Blob;
          blob.arrayBuffer().then(playAudioBuffer).catch(() => {});
        });

        socket.on('user-transcript', (msg) => {
          setMessages((prev) => [
            ...prev,
            { role: 'user', text: msg.data.text as string },
          ]);
        });

        // Control messages from backend (idle reactions, permission, etc.)
        socket.on('control', (msg) => {
          const text = msg.data.text as string;
          switch (text) {
            case 'conversation-chain-start':
              setAiState('thinking-speaking');
              setCurrentResponse('');
              break;
            case 'conversation-chain-end':
              setAiState((current: AiState) =>
                current === 'thinking-speaking' ? 'idle' : current,
              );
              break;
            default:
              break;
          }
        });

        socket.on('backend-synth-complete', () => {
          setBackendSynthComplete(true);
        });

        // Idle reactions from Phase 3.3
        socket.on('idle-reaction', (msg) => {
          window.dispatchEvent(
            new CustomEvent('aiva:idle-reaction', { detail: msg.data }),
          );
          // Show idle text as assistant message
          if (msg.data.text) {
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', text: msg.data.text as string },
            ]);
          }
        });

        // Permission requests from Phase 3.2
        socket.on('permission-request', (msg) => {
          window.dispatchEvent(
            new CustomEvent('aiva:permission-request', { detail: msg.data }),
          );
        });

        socket.connect();
        wsRef.current = socket;
        setWsState('connecting');
      } catch {
        console.error('Failed to connect WebSocket');
      }
    };

    connect();

    return () => {
      cancelled = true;
      wsRef.current?.disconnect();
      wsRef.current = null;
      setWsState('closed');
      setCharacterInfo(null);
      setMessages([]);
      setCurrentResponse('');
    };
  }, [characterId, setAiState, setBackendSynthComplete, playAudioBase64, playAudioBuffer]);

  // Public send helpers
  const send = useCallback(
    (type: string, data?: Record<string, unknown>) => {
      wsRef.current?.send(type, data);
    },
    [],
  );

  const sendTextInput = useCallback((text: string) => {
    wsRef.current?.sendTextInput(text);
  }, []);

  const sendAudioInput = useCallback((audioBase64: string) => {
    wsRef.current?.sendAudioInput(audioBase64);
  }, []);

  const sendInterrupt = useCallback(() => {
    wsRef.current?.sendInterrupt();
    setAiState('interrupted');
    setCurrentResponse('');
  }, [setAiState]);

  const contextValue = useMemo(
    () => ({
      send,
      sendTextInput,
      sendAudioInput,
      sendInterrupt,
      wsState,
      messages,
      currentResponse,
      characterInfo,
      audioAnalyser,
    }),
    [
      send,
      sendTextInput,
      sendAudioInput,
      sendInterrupt,
      wsState,
      messages,
      currentResponse,
      characterInfo,
      audioAnalyser,
    ],
  );

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}
