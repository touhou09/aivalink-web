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
    if (!audioAnalyser) {
      console.log('[Live2D] Lip sync: no analyser yet');
      return;
    }
    console.log('[Live2D] Lip sync: started');

    const dataArray = new Uint8Array(audioAnalyser.frequencyBinCount);

    const update = () => {
      audioAnalyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
      const mouthOpen = Math.min(avg / 80, 1); // more sensitive

      try {
        const model = getModel();
        if (model?._model) {
          const lipSyncIds = model._lipSyncIds;
          if (lipSyncIds) {
            for (let i = 0; i < lipSyncIds.getSize(); ++i) {
              model._model.addParameterValueById(
                lipSyncIds.at(i),
                mouthOpen,
                0.8,
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

  // Drag + Zoom via WebGL model matrix (no CSS transform)
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const modelStartPos = useRef({ x: 0, y: 0 });

  const getModel = () => {
    const manager = (window as any).getLAppLive2DManager?.();
    return manager?.getModel?.(0) || null;
  };

  const getView = () => {
    try {
      const delegate = (window as any).getLAppDelegate?.();
      // Access view via public getter or direct property
      return delegate?._view || delegate?.getView?.() || null;
    } catch { return null; }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    dragStartRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    const model = getModel();
    const view = getView();
    console.log('[Live2D] pointerDown - model:', !!model, 'view:', !!view, 'modelMatrix:', !!model?._modelMatrix);

    if (model?._modelMatrix) {
      const m = model._modelMatrix.getArray();
      modelStartPos.current = { x: m[12], y: m[13] };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const canvas = canvasRef.current;
    const model = getModel();
    const view = getView();
    if (!canvas || !model || !view) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    const scale = canvas.width / canvas.clientWidth;

    // Convert screen delta to model space delta
    const startModelX = view._deviceToScreen.transformX(dragStartRef.current.x * scale);
    const startModelY = view._deviceToScreen.transformY(dragStartRef.current.y * scale);
    const currentModelX = view._deviceToScreen.transformX(currentX * scale);
    const currentModelY = view._deviceToScreen.transformY(currentY * scale);

    const dx = currentModelX - startModelX;
    const dy = currentModelY - startModelY;

    // Apply to model matrix
    const m = model._modelMatrix.getArray();
    m[12] = modelStartPos.current.x + dx;
    m[13] = modelStartPos.current.y + dy;
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  // Wheel zoom via native event (non-passive)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const model = getModel();
      if (!model?._modelMatrix) return;

      const delta = e.deltaY > 0 ? 0.95 : 1.05;
      model._modelMatrix.scaleRelative(delta, delta);
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <Box
      ref={containerRef}
      position="relative"
      w="100%"
      h="100%"
      overflow="hidden"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      cursor="grab"
    >
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
