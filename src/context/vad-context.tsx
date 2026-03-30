import {
  createContext,
  useContext,
  useRef,
  useCallback,
  useEffect,

  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { MicVAD } from '@ricky0123/vad-web';
import { useAiState, type AiState } from './ai-state-context';
import { useWebSocket } from './websocket-context';

export interface VADSettings {
  positiveSpeechThreshold: number;
  negativeSpeechThreshold: number;
  redemptionFrames: number;
}

interface VADContextType {
  micOn: boolean;
  startMic: () => Promise<void>;
  stopMic: () => void;
  settings: VADSettings;
  updateSettings: (s: VADSettings) => void;
}

const DEFAULT_SETTINGS: VADSettings = {
  positiveSpeechThreshold: 50,
  negativeSpeechThreshold: 35,
  redemptionFrames: 35,
};

const VADContext = createContext<VADContextType | null>(null);

function float32ToWavBase64(float32: Float32Array, sampleRate: number): string {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = float32.length * (bitsPerSample / 8);
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function VADProvider({ children }: { children: ReactNode }) {
  const vadRef = useRef<MicVAD | null>(null);
  const previousAiStateRef = useRef<AiState>('idle');
  const isProcessingRef = useRef(false);

  const [micOn, setMicOn] = useState(false);
  const [settings, setSettings] = useState<VADSettings>(DEFAULT_SETTINGS);
  // useReducer reserved for future force-update needs

  const { aiState, setAiState } = useAiState();
  const { sendAudioInput, sendInterrupt } = useWebSocket();

  // Stable refs for callbacks
  const aiStateRef = useRef<AiState>(aiState);
  const setAiStateRef = useRef(setAiState);
  const sendAudioInputRef = useRef(sendAudioInput);
  const sendInterruptRef = useRef(sendInterrupt);

  useEffect(() => { aiStateRef.current = aiState; }, [aiState]);
  useEffect(() => { setAiStateRef.current = setAiState; }, [setAiState]);
  useEffect(() => { sendAudioInputRef.current = sendAudioInput; }, [sendAudioInput]);
  useEffect(() => { sendInterruptRef.current = sendInterrupt; }, [sendInterrupt]);

  const handleSpeechStart = useCallback(() => {
    previousAiStateRef.current = aiStateRef.current;
    isProcessingRef.current = true;
  }, []);

  const handleSpeechRealStart = useCallback(() => {
    if (previousAiStateRef.current === 'thinking-speaking') {
      sendInterruptRef.current();
    }
    setAiStateRef.current('listening');
  }, []);

  const handleSpeechEnd = useCallback((audio: Float32Array) => {
    if (!isProcessingRef.current) return;
    isProcessingRef.current = false;

    // Use 16000 as default VAD sample rate
    const base64 = float32ToWavBase64(audio, 16000);
    sendAudioInputRef.current(base64);
    setAiStateRef.current('thinking-speaking');
  }, []);

  const handleVADMisfire = useCallback(() => {
    if (!isProcessingRef.current) return;
    isProcessingRef.current = false;
    setAiStateRef.current(previousAiStateRef.current);
  }, []);

  const stopMic = useCallback(() => {
    if (vadRef.current) {
      vadRef.current.pause();
      vadRef.current.destroy();
      vadRef.current = null;
    }
    setMicOn(false);
    isProcessingRef.current = false;
  }, []);

  const startMic = useCallback(async () => {
    try {
      if (vadRef.current) {
        vadRef.current.start();
      } else {
        const newVAD = await MicVAD.new({
          model: 'v5',
          preSpeechPadMs: 300,
          positiveSpeechThreshold: settings.positiveSpeechThreshold / 100,
          negativeSpeechThreshold: settings.negativeSpeechThreshold / 100,
          redemptionMs: settings.redemptionFrames * 30, // ~30ms per frame
          onSpeechStart: handleSpeechStart,
          onSpeechRealStart: handleSpeechRealStart,
          onSpeechEnd: handleSpeechEnd,
          onVADMisfire: handleVADMisfire,
        });
        vadRef.current = newVAD;
        newVAD.start();
      }
      setMicOn(true);
    } catch (error) {
      console.error('Failed to start VAD:', error);
    }
  }, [settings, handleSpeechStart, handleSpeechRealStart, handleSpeechEnd, handleVADMisfire]);

  const updateSettings = useCallback(
    (newSettings: VADSettings) => {
      setSettings(newSettings);
      if (vadRef.current) {
        stopMic();
        setTimeout(() => { startMic(); }, 100);
      }
    },
    [stopMic, startMic],
  );

  // Cleanup on unmount
  useEffect(() => () => { stopMic(); }, [stopMic]);

  const contextValue = useMemo(
    () => ({ micOn, startMic, stopMic, settings, updateSettings }),
    [micOn, startMic, stopMic, settings, updateSettings],
  );

  return (
    <VADContext.Provider value={contextValue}>
      {children}
    </VADContext.Provider>
  );
}

export function useVAD() {
  const context = useContext(VADContext);
  if (!context) {
    throw new Error('useVAD must be used within a VADProvider');
  }
  return context;
}
