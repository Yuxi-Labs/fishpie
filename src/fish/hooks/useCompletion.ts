/**
 * useCompletion hook - manages autocomplete popup state
 */

import { useState, useRef, useEffect, useCallback } from "react";
import type { CompletionItem, Position } from "@/fish/language/types";
import type { CaretPos } from "@/fish/core/types";
import { fetchCompletions, navigateCompletions } from "@/fish/features/completion";

export type UseCompletionOptions = {
  languageId: string;
  enabled?: boolean;
};

export type UseCompletionReturn = {
  // State
  completions: CompletionItem[] | null;
  completionIndex: number;
  completionPos: { x: number; y: number } | null;
  isOpen: boolean;
  
  // Actions
  trigger: (text: string, position: CaretPos, pixelPos: { x: number; y: number; lineHeight: number }, force?: boolean) => void;
  close: () => void;
  navigateUp: () => void;
  navigateDown: () => void;
  setIndex: (index: number) => void;
  acceptCurrent: () => CompletionItem | null;
  
  // Refs
  isOpenRef: React.MutableRefObject<boolean>;
};

/**
 * Hook to manage completion popup with request sequencing
 */
export function useCompletion(options: UseCompletionOptions): UseCompletionReturn {
  const { languageId, enabled = true } = options;
  
  const [completions, setCompletions] = useState<CompletionItem[] | null>(null);
  const [completionIndex, setCompletionIndex] = useState(0);
  const [completionPos, setCompletionPos] = useState<{ x: number; y: number } | null>(null);
  
  const isOpenRef = useRef(false);
  const requestSeqRef = useRef(0);
  
  // Update isOpen ref when completions change
  useEffect(() => {
    isOpenRef.current = !!completions && completions.length > 0;
  }, [completions]);
  
  // Trigger completion request
  const trigger = useCallback((
    text: string,
    position: CaretPos,
    pixelPos: { x: number; y: number; lineHeight: number },
    force?: boolean
  ) => {
    if (!enabled) return;
    
    const requestId = ++requestSeqRef.current;
    const caretPosition: Position = { line: position.line, column: position.column };
    
    void (async () => {
      try {
        const items = await fetchCompletions({
          languageId,
          text,
          position: caretPosition,
          force,
        });
        
        // Only update if this is still the latest request
        if (requestSeqRef.current === requestId) {
          if (items && items.length > 0) {
            setCompletions(items);
            setCompletionIndex(0);
            setCompletionPos({ x: pixelPos.x, y: pixelPos.y + pixelPos.lineHeight });
          } else {
            setCompletions(null);
            setCompletionPos(null);
          }
        }
      } catch (error) {
        console.error("Completion error:", error);
        if (requestSeqRef.current === requestId) {
          setCompletions(null);
          setCompletionPos(null);
        }
      }
    })();
  }, [languageId, enabled]);
  
  // Close completion popup
  const close = useCallback(() => {
    setCompletions(null);
    setCompletionPos(null);
    setCompletionIndex(0);
  }, []);
  
  // Navigate completion list
  const navigateUp = useCallback(() => {
    setCompletionIndex((i) => navigateCompletions(i, "up", completions?.length ?? 0));
  }, [completions?.length]);
  
  const navigateDown = useCallback(() => {
    setCompletionIndex((i) => navigateCompletions(i, "down", completions?.length ?? 0));
  }, [completions?.length]);
  
  const setIndex = useCallback((index: number) => {
    setCompletionIndex(index);
  }, []);
  
  // Accept current completion
  const acceptCurrent = useCallback((): CompletionItem | null => {
    const item = completions?.[completionIndex] ?? null;
    if (item) {
      close();
    }
    return item;
  }, [completions, completionIndex, close]);
  
  return {
    completions,
    completionIndex,
    completionPos,
    isOpen: isOpenRef.current,
    trigger,
    close,
    navigateUp,
    navigateDown,
    setIndex,
    acceptCurrent,
    isOpenRef,
  };
}
