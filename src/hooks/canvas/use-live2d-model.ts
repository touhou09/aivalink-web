// @ts-nocheck
import { useEffect, useRef, type RefObject } from 'react';
import { updateModelConfig } from '../../WebSDK/src/lappdefine';
import { initializeLive2D } from '../../WebSDK/src/main';

interface UseLive2DModelProps {
  modelUrl: string | undefined;
  canvasRef: RefObject<HTMLCanvasElement>;
}

function parseModelUrl(url: string): { baseUrl: string; modelDir: string; modelFileName: string } {
  try {
    const urlObj = new URL(url, window.location.origin);
    const { pathname } = urlObj;

    const lastSlashIndex = pathname.lastIndexOf('/');
    if (lastSlashIndex === -1) throw new Error('Invalid model URL format');

    const fullFileName = pathname.substring(lastSlashIndex + 1);
    const modelFileName = fullFileName.replace('.model3.json', '');

    const secondLastSlashIndex = pathname.lastIndexOf('/', lastSlashIndex - 1);
    if (secondLastSlashIndex === -1) throw new Error('Invalid model URL format');

    const modelDir = pathname.substring(secondLastSlashIndex + 1, lastSlashIndex);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}${pathname.substring(0, secondLastSlashIndex + 1)}`;

    return { baseUrl, modelDir, modelFileName };
  } catch (error) {
    console.error('Error parsing model URL:', error);
    return { baseUrl: '', modelDir: '', modelFileName: '' };
  }
}

/**
 * Hook to load and manage a Live2D model via the Cubism WebSDK.
 * Parses the model URL, configures LAppDefine, and initializes the SDK.
 */
export const useLive2DModel = ({ modelUrl, canvasRef }: UseLive2DModelProps) => {
  const prevModelUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!modelUrl || modelUrl === prevModelUrlRef.current) return;
    prevModelUrlRef.current = modelUrl;

    try {
      const { baseUrl, modelDir, modelFileName } = parseModelUrl(modelUrl);
      if (!baseUrl || !modelDir) return;

      updateModelConfig(baseUrl, modelDir, modelFileName);

      setTimeout(() => {
        if ((window as any).LAppLive2DManager?.releaseInstance) {
          (window as any).LAppLive2DManager.releaseInstance();
        }
        initializeLive2D();
      }, 300);
    } catch (error) {
      console.error('Error processing model URL:', error);
    }
  }, [modelUrl]);
};
