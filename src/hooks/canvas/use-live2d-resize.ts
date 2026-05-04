// @ts-nocheck
import { useEffect, useCallback, useRef, type RefObject } from 'react';
import { LAppDelegate } from '../../WebSDK/src/lappdelegate';
import { canvas as live2dCanvas } from '../../WebSDK/src/lappglmanager';

interface UseLive2DResizeProps {
  containerRef: RefObject<HTMLDivElement>;
}

/**
 * Hook to handle Live2D canvas resizing.
 * Monitors container size via ResizeObserver and window resize events,
 * updating the canvas and LAppDelegate accordingly.
 */
export const useLive2DResize = ({ containerRef }: UseLive2DResizeProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const isResizingRef = useRef(false);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isResizingRef.current) return;
    isResizingRef.current = true;

    try {
      const containerBounds = containerRef.current?.getBoundingClientRect();
      const { width, height } = containerBounds || { width: 0, height: 0 };

      if (width === 0 || height === 0) {
        isResizingRef.current = false;
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      if (live2dCanvas) {
        const delegate = LAppDelegate.getInstance();
        delegate?.onResize();
      }
    } finally {
      isResizingRef.current = false;
    }
  }, [containerRef]);

  // ResizeObserver on container
  useEffect(() => {
    const containerElement = containerRef.current;
    if (!containerElement) return;

    // Initial resize
    if (animationFrameIdRef.current !== null) cancelAnimationFrame(animationFrameIdRef.current);
    animationFrameIdRef.current = requestAnimationFrame(() => {
      handleResize();
      animationFrameIdRef.current = null;
    });

    const observer = new ResizeObserver(() => {
      if (animationFrameIdRef.current !== null) cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = requestAnimationFrame(() => {
        handleResize();
        animationFrameIdRef.current = null;
      });
    });

    observer.observe(containerElement);

    return () => {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      observer.disconnect();
    };
  }, [containerRef, handleResize]);

  // Window resize listener
  useEffect(() => {
    const onWindowResize = () => {
      if (animationFrameIdRef.current !== null) cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = requestAnimationFrame(() => {
        handleResize();
        animationFrameIdRef.current = null;
      });
    };

    window.addEventListener('resize', onWindowResize);
    return () => {
      window.removeEventListener('resize', onWindowResize);
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, [handleResize]);

  return { canvasRef, handleResize };
};
