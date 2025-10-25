/**
 * useHover hook - manages hover tooltip with delayed trigger
 */

import { useState, useRef, useCallback } from "react";
import type { Position } from "@/fish/language/types";
import type { CaretPos } from "@/fish/core/types";
import { fetchHover, DEFAULT_HOVER_DELAY } from "@/fish/features/hover";

export type UseHoverOptions = {
  languageId: string;
  delay?: number;
  enabled?: boolean;
};

export type UseHoverReturn = {
  // State
  hoverTip: { x: number; y: number; text: string } | null;
  
  // Actions
  trigger: (text: string, position: CaretPos, pixelPos: { x: number; y: number }) => void;
  cancel: () => void;
  close: () => void;
  
  // Refs
  timerRef: React.MutableRefObject<number | null>;
};

/**
 * Hook to manage hover tooltip with timer and request sequencing
 */
export function useHover(options: UseHoverOptions): UseHoverReturn {
  const { languageId, delay = DEFAULT_HOVER_DELAY, enabled = true } = options;
  
  const [hoverTip, setHoverTip] = useState<{ x: number; y: number; text: string } | null>(null);
  
  const timerRef = useRef<number | null>(null);
  const requestSeqRef = useRef(0);
  
  // Cancel pending hover request
  const cancel = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);
  
  // Close hover tooltip
  const close = useCallback(() => {
    cancel();
    setHoverTip(null);
  }, [cancel]);
  
  // Trigger hover request with delay
  const trigger = useCallback((
    text: string,
    position: CaretPos,
    pixelPos: { x: number; y: number }
  ) => {
    if (!enabled) return;
    
    // Cancel any pending request
    cancel();
    
    // Start new delayed request
    timerRef.current = window.setTimeout(() => {
      const requestId = ++requestSeqRef.current;
      const hoverPosition: Position = { line: position.line, column: position.column };
      
      void (async () => {
        try {
          const hover = await fetchHover({
            languageId,
            text,
            position: hoverPosition,
          });
          
          // Only update if this is still the latest request
          if (requestSeqRef.current === requestId && hover && hover.contents) {
            setHoverTip({
              x: pixelPos.x + 12,
              y: pixelPos.y,
              text: hover.contents,
            });
          } else if (requestSeqRef.current === requestId) {
            setHoverTip(null);
          }
        } catch (error) {
          console.error("Hover error:", error);
          if (requestSeqRef.current === requestId) {
            setHoverTip(null);
          }
        }
      })();
    }, delay);
  }, [languageId, delay, enabled, cancel]);
  
  return {
    hoverTip,
    trigger,
    cancel,
    close,
    timerRef,
  };
}
