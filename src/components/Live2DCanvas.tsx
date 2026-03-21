// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { Box, Text, Flex, Spinner } from '@chakra-ui/react';
import { useLive2DModel } from '../hooks/canvas/use-live2d-model';
import { useLive2DResize } from '../hooks/canvas/use-live2d-resize';
import { useLive2DExpression } from '../hooks/canvas/use-live2d-expression';

interface Props {
  modelUrl?: string;
  emotion?: string;
  audioAnalyser?: AnalyserNode | null;
}

export default function Live2DCanvas({ modelUrl, emotion, audioAnalyser }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lipSyncFrameRef = useRef<number | null>(null);

  // Resize hook: creates and manages the canvas element
  const { canvasRef, handleResize } = useLive2DResize({ containerRef });

  // Model loading hook
  useLive2DModel({ modelUrl, canvasRef });

  // Expression hook
  const { setExpression, resetExpression } = useLive2DExpression();

  // Handle emotion changes via LAppAdapter
  useEffect(() => {
    if (!emotion) return;

    const adapter = (window as any).getLAppAdapter?.();
    if (!adapter) return;

    // Log available expressions for debugging
    try {
      const count = adapter.getExpressionCount?.() || 0;
      const names: string[] = [];
      for (let i = 0; i < count; i++) {
        names.push(adapter.getExpressionName?.(i) || `${i}`);
      }
      console.log(`[Live2D] Emotion: ${emotion}, Available expressions: [${names.join(', ')}]`);
    } catch { /* */ }

    if (emotion === 'neutral') {
      resetExpression(adapter);
      return;
    }

    // Play motion for this emotion via motion group mapping
    // Hiyori model groups: "Idle", "TapBody"
    // Map emotion → motion group + random index
    const motionGroupMap: Record<string, string> = {
      happy: 'TapBody',
      sad: 'Idle',
      angry: 'TapBody',
      surprised: 'TapBody',
    };
    const group = motionGroupMap[emotion] || 'Idle';
    try {
      adapter.startMotion(group, 0, 3); // priority 3 = force
      console.log(`[Live2D] Playing motion: ${group} for emotion: ${emotion}`);
    } catch { /* */ }

    // Try setting expression if model supports named expressions
    try {
      setExpression(emotion, adapter);
    } catch {
      const indexMap: Record<string, number> = { happy: 1, sad: 2, angry: 3, surprised: 4 };
      const idx = indexMap[emotion];
      if (idx !== undefined) {
        try { setExpression(idx, adapter); } catch { /* */ }
      }
    }
  }, [emotion, setExpression, resetExpression]);

  // Lip sync driven by audioAnalyser
  useEffect(() => {
    if (!audioAnalyser) return;

    const dataArray = new Uint8Array(audioAnalyser.frequencyBinCount);

    const update = () => {
      audioAnalyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
      const mouthOpen = Math.min(avg / 128, 1);

      try {
        const adapter = (window as any).getLAppAdapter?.();
        const model = adapter?.getModel();
        if (model?._wavFileHandler) {
          // Set the lip sync value directly via the model's lip sync IDs
          // The WebSDK handles lip sync through _wavFileHandler in update(),
          // but for external audio we can set parameter values directly
          const lipSyncIds = model._lipSyncIds;
          if (lipSyncIds && model._model) {
            for (let i = 0; i < lipSyncIds.getSize(); ++i) {
              model._model.addParameterValueById(
                lipSyncIds.at(i),
                mouthOpen,
                4.0,
              );
            }
          }
        }
      } catch {
        // model not ready
      }

      lipSyncFrameRef.current = requestAnimationFrame(update);
    };

    update();

    return () => {
      if (lipSyncFrameRef.current !== null) {
        cancelAnimationFrame(lipSyncFrameRef.current);
        lipSyncFrameRef.current = null;
      }
    };
  }, [audioAnalyser]);

  return (
    <Box ref={containerRef} position="relative" w="100%" h="100%">
      <canvas
        ref={canvasRef}
        id="canvas"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />
      {!modelUrl && !loading && (
        <Flex position="absolute" inset={0} align="center" justify="center">
          <Text color="gray.500" fontSize="lg">No Live2D model configured</Text>
        </Flex>
      )}
      {loading && (
        <Flex position="absolute" inset={0} align="center" justify="center" bg="blackAlpha.600">
          <Spinner color="white" size="xl" />
        </Flex>
      )}
      {error && (
        <Flex position="absolute" inset={0} align="center" justify="center" bg="blackAlpha.600">
          <Text color="red.300">{error}</Text>
        </Flex>
      )}
    </Box>
  );
}
