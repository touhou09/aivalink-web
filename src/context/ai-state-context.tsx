import {
  createContext,
  useState,
  useContext,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';

export type AiState =
  | 'idle'
  | 'thinking-speaking'
  | 'interrupted'
  | 'loading'
  | 'listening'
  | 'waiting';

interface AiStateContextType {
  aiState: AiState;
  setAiState: {
    (state: AiState): void;
    (updater: (current: AiState) => AiState): void;
  };
  backendSynthComplete: boolean;
  setBackendSynthComplete: (v: boolean) => void;
  isIdle: boolean;
  isThinkingSpeaking: boolean;
  isInterrupted: boolean;
  isLoading: boolean;
  isListening: boolean;
  isWaiting: boolean;
  resetState: () => void;
}

const AiStateContext = createContext<AiStateContextType | null>(null);

export function AiStateProvider({ children }: { children: ReactNode }) {
  const [aiState, setAiStateInternal] = useState<AiState>('loading');
  const [backendSynthComplete, setBackendSynthComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setAiState = useCallback(
    (next: AiState | ((current: AiState) => AiState)) => {
      setAiStateInternal((current) => {
        const resolved = typeof next === 'function' ? next(current) : next;

        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }

        if (resolved === 'waiting' && current !== 'thinking-speaking') {
          timerRef.current = setTimeout(() => {
            setAiStateInternal('idle');
            timerRef.current = null;
          }, 2000);
          return 'waiting';
        }

        if (resolved === 'waiting' && current === 'thinking-speaking') {
          return current; // don't override thinking-speaking with waiting
        }

        return resolved;
      });
    },
    [],
  );

  const stateChecks = useMemo(
    () => ({
      isIdle: aiState === 'idle',
      isThinkingSpeaking: aiState === 'thinking-speaking',
      isInterrupted: aiState === 'interrupted',
      isLoading: aiState === 'loading',
      isListening: aiState === 'listening',
      isWaiting: aiState === 'waiting',
    }),
    [aiState],
  );

  const resetState = useCallback(() => {
    setAiState('idle');
  }, [setAiState]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const contextValue = useMemo(
    () => ({
      aiState,
      setAiState,
      backendSynthComplete,
      setBackendSynthComplete,
      ...stateChecks,
      resetState,
    }),
    [aiState, setAiState, backendSynthComplete, stateChecks, resetState],
  );

  return (
    <AiStateContext.Provider value={contextValue}>
      {children}
    </AiStateContext.Provider>
  );
}

export function useAiState() {
  const context = useContext(AiStateContext);
  if (!context) {
    throw new Error('useAiState must be used within an AiStateProvider');
  }
  return context;
}
