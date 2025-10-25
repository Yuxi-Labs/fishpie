/**
 * useSnippetSession hook - manages snippet tabstop navigation
 */

import { useRef, useCallback } from "react";
import type { SnippetSession, SnippetStop, CaretPos } from "@/fish/core/types";
import { navigateSnippet, getCurrentStop } from "@/fish/features/snippets";

export type UseSnippetSessionReturn = {
  // State ref (not reactive, managed by parent)
  sessionRef: React.MutableRefObject<SnippetSession | null>;
  
  // Actions
  start: (stops: SnippetStop[], onUpdate: (caret: CaretPos, anchor: CaretPos) => void) => void;
  cancel: (onClear: () => void) => void;
  moveForward: (onUpdate: (caret: CaretPos, anchor: CaretPos) => void, onEnd: () => void) => void;
  moveBackward: (onUpdate: (caret: CaretPos, anchor: CaretPos) => void, onEnd: () => void) => void;
  isActive: () => boolean;
};

/**
 * Hook to manage snippet session state and navigation
 */
export function useSnippetSession(): UseSnippetSessionReturn {
  const sessionRef = useRef<SnippetSession | null>(null);
  
  // Start new snippet session
  const start = useCallback((
    stops: SnippetStop[],
    onUpdate: (caret: CaretPos, anchor: CaretPos) => void
  ) => {
    sessionRef.current = { stops, index: 0 };
    
    // Select first stop
    const firstStop = stops[0];
    if (firstStop) {
      onUpdate(firstStop.end, firstStop.start);
    }
  }, []);
  
  // Cancel snippet session
  const cancel = useCallback((onClear: () => void) => {
    sessionRef.current = null;
    onClear();
  }, []);
  
  // Move to next tabstop
  const moveForward = useCallback((
    onUpdate: (caret: CaretPos, anchor: CaretPos) => void,
    onEnd: () => void
  ) => {
    const session = sessionRef.current;
    if (!session) return;
    
    const nextSession = navigateSnippet(session, "forward");
    
    if (!nextSession) {
      // End of snippet
      sessionRef.current = null;
      onEnd();
      return;
    }
    
    sessionRef.current = nextSession;
    const stop = getCurrentStop(nextSession);
    if (stop) {
      onUpdate(stop.end, stop.start);
    }
  }, []);
  
  // Move to previous tabstop
  const moveBackward = useCallback((
    onUpdate: (caret: CaretPos, anchor: CaretPos) => void,
    onEnd: () => void
  ) => {
    const session = sessionRef.current;
    if (!session) return;
    
    const prevSession = navigateSnippet(session, "backward");
    
    if (!prevSession) {
      // Beginning of snippet
      sessionRef.current = null;
      onEnd();
      return;
    }
    
    sessionRef.current = prevSession;
    const stop = getCurrentStop(prevSession);
    if (stop) {
      onUpdate(stop.end, stop.start);
    }
  }, []);
  
  // Check if session is active
  const isActive = useCallback(() => {
    return sessionRef.current !== null;
  }, []);
  
  return {
    sessionRef,
    start,
    cancel,
    moveForward,
    moveBackward,
    isActive,
  };
}
