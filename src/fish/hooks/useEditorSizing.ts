/**
 * useEditorSizing hook - manages responsive canvas sizing from CSS variables
 */

import { useState, useEffect, useRef } from "react";
import type { EditorSizing } from "@/fish/core/types";
import { readSizing } from "@/fish/rendering/canvas";

export type UseEditorSizingOptions = {
  containerRef: React.RefObject<HTMLElement | null>;
};

export type UseEditorSizingReturn = {
  sizing: EditorSizing;
  updateSizing: () => void;
};

/**
 * Hook to manage editor sizing that responds to CSS variable changes
 */
export function useEditorSizing(options: UseEditorSizingOptions): UseEditorSizingReturn {
  const { containerRef } = options;
  
  const [sizing, setSizing] = useState<EditorSizing>(() => 
    readSizing(containerRef.current)
  );
  
  const sizingRef = useRef(sizing);
  useEffect(() => { sizingRef.current = sizing; }, [sizing]);
  
  const updateSizing = useRef(() => {
    const newSizing = readSizing(containerRef.current);
    setSizing(newSizing);
  }).current;
  
  // Update sizing on mount and when container changes
  useEffect(() => {
    if (containerRef.current) {
      updateSizing();
    }
  }, [containerRef, updateSizing]);
  
  // Optional: Listen for resize events
  useEffect(() => {
    const handleResize = () => {
      updateSizing();
    };
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateSizing]);
  
  return {
    sizing,
    updateSizing,
  };
}
