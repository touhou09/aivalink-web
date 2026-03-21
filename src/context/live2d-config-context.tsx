import {
  createContext, useContext, useState, useMemo, type ReactNode,
} from 'react';

interface EmotionMap {
  [key: string]: number | string;
}

export interface ModelInfo {
  url: string;
  kScale: number;
  initialXshift: number;
  initialYshift: number;
  idleMotionGroupName?: string;
  defaultEmotion?: number | string;
  emotionMap: EmotionMap;
}

interface Live2DConfigState {
  modelInfo?: ModelInfo;
  setModelInfo: (info: ModelInfo | undefined) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const Live2DConfigContext = createContext<Live2DConfigState | null>(null);

export function Live2DConfigProvider({ children }: { children: ReactNode }) {
  const [modelInfo, setModelInfoState] = useState<ModelInfo | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const setModelInfo = (info: ModelInfo | undefined) => {
    if (!info?.url) {
      setModelInfoState(undefined);
      return;
    }
    const finalScale = Number(info.kScale || 0.5) * 2;
    setModelInfoState({
      ...info,
      kScale: finalScale,
    });
  };

  const contextValue = useMemo(
    () => ({ modelInfo, setModelInfo, isLoading, setIsLoading }),
    [modelInfo, isLoading],
  );

  return (
    <Live2DConfigContext.Provider value={contextValue}>
      {children}
    </Live2DConfigContext.Provider>
  );
}

export function useLive2DConfig() {
  const context = useContext(Live2DConfigContext);
  if (!context) {
    throw new Error('useLive2DConfig must be used within a Live2DConfigProvider');
  }
  return context;
}
