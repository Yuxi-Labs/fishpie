/**
 * useFileState hook - manages per-file document state
 */

import { useRef, useState, useEffect, useMemo } from "react";
import type { FileState, CaretPos } from "@/fish/core/types";
import { TextDocument } from "@/fish/core/document";
import { languageForFilename } from "@/fish/language/registry";

export type FileStateStore = Map<string, FileState>;

export type UseFileStateOptions = {
  projectId: string;
  initialFileName: string;
  initialText?: string;
  onTextChange?: (fileName: string, text: string) => void;
};

export type UseFileStateReturn = {
  // Current file info
  fileName: string;
  languageId: string;
  text: string;
  linesCount: number;
  
  // Document reference
  doc: TextDocument;
  docRef: React.MutableRefObject<TextDocument>;
  
  // Caret and selection
  caret: CaretPos;
  anchor: CaretPos | null;
  hasSelection: boolean;
  
  // State setters
  setCaret: (pos: CaretPos) => void;
  setAnchor: (pos: CaretPos | null) => void;
  setText: (text: string) => void;
  setLanguageId: (lang: string) => void;
  
  // Refs for event handlers (avoid stale closures)
  caretRef: React.MutableRefObject<CaretPos>;
  anchorRef: React.MutableRefObject<CaretPos | null>;
  textRef: React.MutableRefObject<string>;
  fileNameRef: React.MutableRefObject<string>;
  
  // Store management
  storeRef: React.MutableRefObject<FileStateStore>;
  switchFile: (fileName: string, text?: string) => void;
};

/**
 * Hook to manage per-file document state with persistent store
 */
export function useFileState(options: UseFileStateOptions): UseFileStateReturn {
  const { initialFileName, initialText, onTextChange } = options;
  
  // Per-project file state store (projectId available in options if needed)
  const storeRef = useRef<FileStateStore>(new Map());
  
  // Get or create file state
  const getOrCreate = (name: string): FileState => {
    let s = storeRef.current.get(name);
    if (!s) {
      s = {
        doc: new TextDocument(initialText ?? ""),
        caret: { line: 0, column: 0 },
        anchor: null,
      };
      storeRef.current.set(name, s);
    }
    return s;
  };
  
  const activeFile = getOrCreate(initialFileName);
  
  // File name ref (for switching files)
  const fileNameRef = useRef<string>(initialFileName);
  
  // Document state
  const [text, setText] = useState<string>(activeFile.doc.toString());
  const linesCount = useMemo(() => text.split("\n").length, [text]);
  
  // Language inference from filename
  const [languageId, setLanguageId] = useState<string>(languageForFilename(initialFileName));
  
  // Caret and selection state
  const [caret, setCaret] = useState<CaretPos>(activeFile.caret);
  const [anchor, setAnchor] = useState<CaretPos | null>(activeFile.anchor);
  const hasSelection = !!anchor && (anchor.line !== caret.line || anchor.column !== caret.column);
  
  // Document reference (direct access for edits)
  const docRef = useRef<TextDocument>(activeFile.doc);
  
  // Refs to avoid stale closures in event handlers
  const caretRef = useRef(caret);
  const anchorRef = useRef(anchor);
  const textRef = useRef(text);
  
  useEffect(() => { caretRef.current = caret; }, [caret]);
  useEffect(() => { anchorRef.current = anchor; }, [anchor]);
  useEffect(() => { textRef.current = text; }, [text]);
  
  // Notify host of text changes for persistence
  useEffect(() => {
    try {
      onTextChange?.(fileNameRef.current, text);
    } catch (error) {
      console.error("Failed to notify text change:", error);
    }
  }, [text, onTextChange]);
  
  // Switch to different file
  const switchFile = (fileName: string, text?: string) => {
    // Save current file state
    const currentState = storeRef.current.get(fileNameRef.current);
    if (currentState) {
      currentState.caret = caretRef.current;
      currentState.anchor = anchorRef.current;
      currentState.doc = docRef.current;
    }
    
    // Load or create new file state
    fileNameRef.current = fileName;
    const newState = text !== undefined
      ? { doc: new TextDocument(text), caret: { line: 0, column: 0 }, anchor: null }
      : getOrCreate(fileName);
    
    if (text !== undefined) {
      storeRef.current.set(fileName, newState);
    }
    
    // Update state
    docRef.current = newState.doc;
    setText(newState.doc.toString());
    setCaret(newState.caret);
    setAnchor(newState.anchor);
    setLanguageId(languageForFilename(fileName));
  };
  
  return {
    fileName: fileNameRef.current,
    languageId,
    text,
    linesCount,
    doc: docRef.current,
    docRef,
    caret,
    anchor,
    hasSelection,
    setCaret,
    setAnchor,
    setText,
    setLanguageId,
    caretRef,
    anchorRef,
    textRef,
    fileNameRef,
    storeRef,
    switchFile,
  };
}
