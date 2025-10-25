"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { getOrLoadLanguage, languageForFilename } from "@/fish/language/registry";
import type { Token, CompletionItem, Position } from "@/fish/language/types";
import { TextDocument } from "@/fish/core/document";
import { autoPairDecision } from "@/fish/core/pairs";
import { requestCompletions, requestHover } from "@/fish/language/lspClient";
import { getContextualCompletions, getHover } from "@/fish/language/intellisense";
import { HistoryManager, createInsertOperation, createDeleteOperation, createReplaceOperation, type DocPos } from "@/fish/core/history";
import { useSearch } from "@/fish/hooks";
import { type SearchMatch } from "@/fish/core/search";
import { FindReplaceDialog } from "@/fish/ui/FindReplaceDialog";
import { FoldingManager, detectAllFolds } from "@/fish/core/folding";
import { calculateVisibleRange, calculateContentHeight, calculateScrollbar, scrollbarYToScrollTop } from "@/fish/core/virtualization";
import { moveLinesUp, moveLinesDown, duplicateLines, deleteLines } from "@/fish/core/linecommands";
import { getCommentConfig, toggleLineComments, calculateColumnOffset } from "@/fish/core/comments";
import { MultiCursorManager, findNextOccurrence } from "@/fish/core/multicursor";
import { findBracketsAtCursor, type BracketMatch } from "@/fish/core/brackets";
import { calculateWordWrap, type WrapInfo } from "@/fish/core/wordwrap";
import { usePieUI } from "@/pie/state/ui";

const MONO_FONT_STACK = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

// Defaults (can be overridden by CSS variables on .fish-editor)
const DEFAULTS = {
  textFontSize: 18, // px
  lineNumberFontSize: 22, // px
  lineHeight: 28, // px
  caretWidth: 2, // px
  pad: 16, // general padding
  gutterExtra: 12, // extra pixels to widen gutter beyond digit measure
};

const readSizing = (el: HTMLElement | null) => {
  const styles = getComputedStyle(el ?? document.body);
  const rootFontPx = parseFloat(getComputedStyle(document.documentElement).fontSize || "16");
  const len = (v: string | null | undefined, fallback: number) => {
    const raw = (v ?? "").trim();
    if (!raw) return fallback;
    if (raw.endsWith("rem")) {
      const n = parseFloat(raw);
      return Number.isFinite(n) && n > 0 ? n * rootFontPx : fallback;
    }
    if (raw.endsWith("px")) {
      const n = parseFloat(raw);
      return Number.isFinite(n) && n > 0 ? n : fallback;
    }
    // unitless -> treat as px number
    const n = parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  const textFontSize = len(styles.getPropertyValue("--fish-text-font-size"), DEFAULTS.textFontSize);
  const lineNumberFontSize = len(styles.getPropertyValue("--fish-line-number-font-size"), DEFAULTS.lineNumberFontSize);
  const lineHeight = len(styles.getPropertyValue("--fish-line-height"), DEFAULTS.lineHeight);
  const caretWidth = len(styles.getPropertyValue("--fish-caret-width"), DEFAULTS.caretWidth);
  const pad = len(styles.getPropertyValue("--fish-editor-padding"), DEFAULTS.pad);
  const gutterExtra = len(styles.getPropertyValue("--fish-gutter-extra"), DEFAULTS.gutterExtra);
  return { textFontSize, lineNumberFontSize, lineHeight, caretWidth, pad, gutterExtra };
};

type CaretPos = { line: number; column: number };
type FileState = { 
  doc: TextDocument; 
  caret: CaretPos; 
  anchor: CaretPos | null; 
  history: HistoryManager; 
  folding: FoldingManager;
  multiCursor: MultiCursorManager;
};

export function FishEditor({ projectId, filename, language: _langIgnored, initialText, active = true, onTextChange }: { projectId?: string; filename?: string; language?: string; initialText?: string; active?: boolean; onTextChange?: (name: string, text: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Per-file document state store
  const storeRef = useRef<Map<string, FileState>>(new Map());
  const defaultName = useMemo(() => filename || "Untitled-1", [filename]);
  const [currentName, setCurrentName] = useState<string>(defaultName);
  const getOrCreate = (name: string): FileState => {
    let s = storeRef.current.get(name);
    if (!s) {
      const doc = new TextDocument(initialText ?? "");
      const multiCursor = new MultiCursorManager();
      multiCursor.setSingleCursor({ line: 0, column: 0 }, null);
      s = { 
        doc, 
        caret: { line: 0, column: 0 }, 
        anchor: null,
        history: new HistoryManager(),
        folding: new FoldingManager(),
        multiCursor
      };
      storeRef.current.set(name, s);
    }
    return s;
  };
  const activeFile = getOrCreate(currentName);
  // Refs to always point at the currently active file state without rebinding handlers
  const fileNameRef = useRef<string>(currentName);
  const fileStateRef = useRef<FileState>(activeFile);
  const docRef = useRef<TextDocument>(activeFile.doc);
  const [text, setText] = useState<string>(activeFile.doc.toString());
  const linesCount = useMemo(() => (text.split("\n").length), [text]);
  // Language is strictly inferred from filename (Lang = filetype)
  const [languageId, setLanguageId] = useState<string>(languageForFilename(currentName));
  const [tokens, setTokens] = useState<Token[]>([]);
  const [caret, setCaret] = useState<CaretPos>(activeFile.caret);
  const [anchor, setAnchor] = useState<CaretPos | null>(activeFile.anchor);
  const hasSelection = !!anchor && (anchor.line !== caret.line || anchor.column !== caret.column);
  const beforeInputSeenRef = useRef(false);
  // Refs to avoid stale closures in event handlers
  const caretRef = useRef(caret);
  const anchorRef = useRef(anchor);
  const textRef = useRef(text);
  useEffect(() => { caretRef.current = caret; }, [caret]);
  useEffect(() => { anchorRef.current = anchor; }, [anchor]);
  useEffect(() => { textRef.current = text; }, [text]);
  
  // Update bracket matches when caret moves
  useEffect(() => {
    const matches = findBracketsAtCursor(text, caret);
    setBracketMatches(matches);
  }, [caret, text]);
  
  // Notify host of text changes for persistence
  useEffect(() => {
    try { onTextChange?.(fileNameRef.current, text); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // Completion UI state
  const [completions, setCompletions] = useState<CompletionItem[] | null>(null);
  const [completionIndex, setCompletionIndex] = useState(0);
  const [completionPos, setCompletionPos] = useState<{ x: number; y: number } | null>(null);
  const completionOpenRef = useRef(false);
  const completionRequestSeq = useRef(0);
  useEffect(() => { completionOpenRef.current = !!completions && completions.length > 0; }, [completions]);

  // Hover UI state
  const [hoverTip, setHoverTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const hoverRequestSeq = useRef(0);

  // Find/Replace state
  const [findDialogVisible, setFindDialogVisible] = useState(false);
  const [findDialogMode, setFindDialogMode] = useState<'find' | 'replace'>('find');
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  
  // Virtualization state for large files
  const [scrollTop, setScrollTop] = useState(0);
  const scrollTopRef = useRef(0);
  useEffect(() => { scrollTopRef.current = scrollTop; }, [scrollTop]);
  const [isDraggingScrollbar, setIsDraggingScrollbar] = useState(false);
  const scrollbarDragStartRef = useRef<{ mouseY: number; scrollTop: number } | null>(null);
  
  // Get global UI state for editor preferences
  const ui = usePieUI();
  const wordWrapEnabled = ui.wordWrapEnabled;
  const bracketMatchingEnabled = ui.bracketMatchingEnabled;
  
  // Word wrap state (local calculation)
  const [wrapInfo, setWrapInfo] = useState<WrapInfo | null>(null);
  const wrapInfoRef = useRef<WrapInfo | null>(null);
  useEffect(() => { wrapInfoRef.current = wrapInfo; }, [wrapInfo]);
  
  // Bracket matching state
  const [bracketMatches, setBracketMatches] = useState<BracketMatch[]>([]);
  
  // Update multi-cursor count in UI state whenever it changes
  useEffect(() => {
    const count = fileStateRef.current.multiCursor.getCursors().length;
    ui.setMultiCursorCount(count);
  }, [caret, text, ui]);
  
  const searchHook = useSearch({
    getDocText: () => docRef.current.toString(),
    getCursorPos: () => caretRef.current,
    setCursorPos: (anchor: DocPos, caret: DocPos) => {
      caretRef.current = caret;
      setCaret(caret);
      anchorRef.current = anchor;
      setAnchor(anchor);
      activeFile.caret = caret;
      activeFile.anchor = anchor;
      paintRef.current?.();
    },
    applyReplacement: (match: SearchMatch, replacement: string) => {
      // Record as replace operation in history
      const oldText = docRef.current.getTextInRange(match.startPos, match.endPos);
      const caretBefore = caretRef.current;
      const anchorBefore = anchorRef.current;
      
      // Apply the replacement
      const newPos = docRef.current.replaceRange(match.startPos, match.endPos, replacement);
      caretRef.current = newPos;
      setCaret(newPos);
      anchorRef.current = null;
      setAnchor(null);
      activeFile.caret = newPos;
      activeFile.anchor = null;
      
      // Record in history
      recordReplace(match.startPos, match.endPos, oldText, replacement, caretBefore, newPos, anchorBefore, null);
      
      // Update text state
      const newText = docRef.current.toString();
      setText(newText);
      textRef.current = newText;
      paintRef.current?.();
    },
    onMatchesChange: (matches, index) => {
      setSearchMatches(matches);
      setCurrentSearchIndex(index);
    },
    onCurrentMatchChange: (index) => {
      setCurrentSearchIndex(index);
      paintRef.current?.();
    }
  });

  // Simple snippet session (tabstops $1, ${1:...}, $0). We don't live-update ranges after edits; session cancels on typing.
  type SnippetStop = { start: CaretPos; end: CaretPos };
  const snippetSessionRef = useRef<{ stops: SnippetStop[]; index: number } | null>(null);

  const cancelSnippetSession = () => { snippetSessionRef.current = null; setAnchor(null); anchorRef.current = null; };

  const moveSnippetCursor = (direction: 1 | -1) => {
    const sess = snippetSessionRef.current; if (!sess) return;
    const nextIndex = sess.index + direction;
    if (nextIndex < 0 || nextIndex >= sess.stops.length) {
      // End session
      cancelSnippetSession();
      return;
    }
    sess.index = nextIndex;
    const stop = sess.stops[nextIndex];
    caretRef.current = stop.end; setCaret(stop.end);
    anchorRef.current = stop.start; setAnchor(stop.start);
  };

  // Parse VS Code-like snippet and compute tabstops
  function parseSnippet(input: string): { text: string; stops: Array<{ order: number; start: number; end: number }> } {
    let i = 0; const out: string[] = []; const stops: Array<{ order: number; start: number; end: number }> = [];
    const pushText = (s: string) => { out.push(s); };
    while (i < input.length) {
      const ch = input[i];
      if (ch === "\\" && i + 1 < input.length) {
        // simple escapes for $, {, }, \
        const nxt = input[i + 1];
        if (nxt === "$" || nxt === "{" || nxt === "}" || nxt === "\\") { pushText(nxt); i += 2; continue; }
      }
      if (ch === "$") {
        // $0
        if (input.slice(i).startsWith("$0")) {
          const pos = out.join("").length;
          stops.push({ order: 0, start: pos, end: pos });
          i += 2; continue;
        }
        // ${n[:default]}
        const brace = /^\$\{(\d+)(?::([^}]*))?\}/.exec(input.slice(i));
        if (brace) {
          const n = Number(brace[1]);
          const def = brace[2] ?? "";
          const start = out.join("").length; pushText(def); const end = out.join("").length;
          stops.push({ order: n, start, end });
          i += brace[0].length; continue;
        }
        // $n
        const simple = /^\$(\d+)/.exec(input.slice(i));
        if (simple) {
          const n = Number(simple[1]); const pos = out.join("").length;
          stops.push({ order: n, start: pos, end: pos });
          i += simple[0].length; continue;
        }
      }
      pushText(ch); i++;
    }
    return { text: out.join(""), stops };
  }

  function offsetToCaret(base: CaretPos, insertedText: string, offset: number): CaretPos {
    let line = base.line; let col = base.column; let i = 0;
    while (i < offset && i < insertedText.length) {
      const c = insertedText[i++];
      if (c === "\n") { line++; col = 0; }
      else { col++; }
    }
    return { line, column: col };
  }

  function insertWithSnippet(startPos: CaretPos, endPos: CaretPos, raw: string) {
    if (!raw || !/\$(\d+|\{\d+|0)/.test(raw)) {
      // Plain text
      const next = docRef.current.replaceRange(startPos, endPos, raw);
      const s = docRef.current.toString(); setText(s); textRef.current = s; setCaret(next); caretRef.current = next; setAnchor(null); anchorRef.current = null; cancelSnippetSession();
      return;
    }
    const parsed = parseSnippet(raw);
    const afterPos = docRef.current.replaceRange(startPos, endPos, parsed.text);
    const textSnapshot = docRef.current.toString(); setText(textSnapshot); textRef.current = textSnapshot;
    // Build stops ordered by order, with $0 last
    const byOrder = parsed.stops.sort((a,b) => (a.order === 0 ? Infinity : a.order) - (b.order === 0 ? Infinity : b.order));
    const stops: SnippetStop[] = byOrder.map(st => ({ start: offsetToCaret(startPos, parsed.text, st.start), end: offsetToCaret(startPos, parsed.text, st.end) }));
    if (stops.length === 0) {
      // No stops, place at end
      setCaret(afterPos); caretRef.current = afterPos; setAnchor(null); anchorRef.current = null; cancelSnippetSession();
      return;
    }
    // Start at the first stop; if it's zero-length, caret==anchor
    snippetSessionRef.current = { stops, index: 0 };
    const stop0 = stops[0];
    caretRef.current = stop0.end; setCaret(stop0.end);
    anchorRef.current = stop0.start; setAnchor(stop0.start);
  }

  // History recording helpers
  const recordInsert = (pos: DocPos, text: string, caretBefore: CaretPos, caretAfter: CaretPos, anchorBefore: CaretPos | null, anchorAfter: CaretPos | null) => {
    const state = fileStateRef.current;
    const op = createInsertOperation(pos, text, caretBefore, caretAfter, anchorBefore, anchorAfter);
    state.history.recordOperation(op);
  };

  const recordDelete = (startPos: DocPos, endPos: DocPos, deletedText: string, caretBefore: CaretPos, caretAfter: CaretPos, anchorBefore: CaretPos | null, anchorAfter: CaretPos | null) => {
    const state = fileStateRef.current;
    const op = createDeleteOperation(startPos, endPos, deletedText, caretBefore, caretAfter, anchorBefore, anchorAfter);
    state.history.recordOperation(op);
  };

  const recordReplace = (startPos: DocPos, endPos: DocPos, oldText: string, newText: string, caretBefore: CaretPos, caretAfter: CaretPos, anchorBefore: CaretPos | null, anchorAfter: CaretPos | null) => {
    const state = fileStateRef.current;
    const op = createReplaceOperation(startPos, endPos, oldText, newText, caretBefore, caretAfter, anchorBefore, anchorAfter);
    state.history.recordOperation(op);
  };

  // Helper to handle fold updates after text changes
  const handleFoldAfterEdit = (editLine: number, linesAdded: number, linesRemoved: number) => {
    const state = fileStateRef.current;
    
    // Unfold any region containing the edit line
    state.folding.unfoldContaining(editLine);
    
    // Update fold positions if lines were added or removed
    if (linesAdded !== 0 || linesRemoved !== 0) {
      state.folding.updateAfterEdit(editLine, linesAdded, linesRemoved);
    }
  };

  // Caret blink handling via repaint timer
  const blinkRef = useRef(true);
  const paintRef = useRef<(() => void) | null>(null);
  const focusedRef = useRef<boolean>(false);
  const [, setFocused] = useState(false);
  const activeRef = useRef<boolean>(active);
  useEffect(() => { activeRef.current = active; paintRef.current?.(); }, [active]);
  
  // Repaint and sync multi-cursor when caret or anchor changes
  useEffect(() => {
    fileStateRef.current.multiCursor.setSingleCursor(caret, anchor);
    paintRef.current?.();
  }, [caret, anchor]);

  // Respond to filename changes by switching the active file state
  useEffect(() => {
    const nextName = filename || "Untitled-1";
    setCurrentName(nextName);
    const next = getOrCreate(nextName);
    // If we received initialText for a file that was not yet populated, hydrate it once
    if (initialText != null && next.doc.toString() === "") {
      next.doc = new TextDocument(initialText);
      storeRef.current.set(nextName, next);
    }
    setText(next.doc.toString());
    setCaret(next.caret);
    setAnchor(next.anchor);
    caretRef.current = next.caret;
    anchorRef.current = next.anchor;
    textRef.current = next.doc.toString();
    fileNameRef.current = nextName;
    fileStateRef.current = next;
    docRef.current = next.doc;
    // Strict inference: do not allow external overrides; derive from filename only
    setLanguageId(languageForFilename(nextName));
    paintRef.current?.();
    // close UI overlays when switching files
  setCompletions(null); setCompletionPos(null); setCompletionIndex(0); setHoverTip(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filename, initialText]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lang = await getOrLoadLanguage(languageId);
      if (!lang || cancelled) return;
      const maybe = lang.tokenize?.(text);
      const toks = maybe instanceof Promise ? await maybe : (maybe ?? []);
      if (!cancelled) setTokens(toks);
      
      // Detect and update fold regions when text or language changes
      if (!cancelled) {
        const lines = text.split('\n');
        const regions = detectAllFolds(lines, languageId);
        activeFile.folding.setRegions(regions);
        paintRef.current?.();
      }
    })();
    return () => { cancelled = true; };
  }, [languageId, text, activeFile.folding]);

  // Focus editor on mount
  useEffect(() => {
    if (active) containerRef.current?.focus();
  }, [active]);

  // Track focus/blur of the editor container and page visibility to control caret visibility
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleFocus = () => { focusedRef.current = true; setFocused(true); paintRef.current?.(); };
    const handleBlur = () => { focusedRef.current = false; setFocused(false); paintRef.current?.(); };
    const handleVisibility = () => {
      if (document.hidden) { focusedRef.current = false; setFocused(false); }
      else { focusedRef.current = document.activeElement === el; setFocused(focusedRef.current); }
      paintRef.current?.();
    };
    el.addEventListener('focus', handleFocus);
    el.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleVisibility);
    // initialize
    focusedRef.current = document.activeElement === el && !document.hidden;
    setFocused(focusedRef.current);
    return () => {
      el.removeEventListener('focus', handleFocus);
      el.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleVisibility);
    };
  }, []);

  // Basic render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const container = containerRef.current;
      if (!container) return;

      const viewportW = container.clientWidth || 0;
      const viewportH = container.clientHeight || 0;
  const { textFontSize, lineNumberFontSize } = readSizing(container);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const TEXT_FONT = `normal ${textFontSize}px ${MONO_FONT_STACK}`;
  const LINE_NUMBER_FONT = `normal ${lineNumberFontSize}px ${MONO_FONT_STACK}`;
  ctx.font = TEXT_FONT;
  const lines = textRef.current.split(/\n/);

  ctx.save();
  ctx.font = LINE_NUMBER_FONT;
  // Gutter width calculated in paint() function
  ctx.restore();

      let maxTextW = 0;
      for (const l of lines) {
        const w = ctx.measureText(l).width;
        if (w > maxTextW) maxTextW = w;
      }

      // Content dimensions calculated but not used for canvas sizing (virtualization handles this)
      // const contentW = Math.max(viewportW, Math.ceil(gutterWidth + pad + maxTextW + pad));
      
      // Use virtualization for content height (used for scrollbar calculations)
      // const contentH = calculateContentHeight(lines.length, lineHeight, pad);

      canvas.width = Math.floor(viewportW * dpr);
      canvas.height = Math.floor(viewportH * dpr);
      canvas.style.width = `${viewportW}px`;
      canvas.style.height = `${viewportH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint();
    };

    const paint = () => {
      const container = containerRef.current;
      if (!container) return;
      
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
  // Read token colors from the editor container to respect scoped variables/themes
  const styles = getComputedStyle(container);
      ctx.fillStyle = styles.getPropertyValue("--background") || "#fff";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = styles.getPropertyValue("--foreground") || "#111";
  const { textFontSize, lineNumberFontSize, lineHeight, pad, gutterExtra, caretWidth } = readSizing(container);

    const TEXT_FONT = `normal ${textFontSize}px ${MONO_FONT_STACK}`;
    const LINE_NUMBER_FONT = `normal ${lineNumberFontSize}px ${MONO_FONT_STACK}`;
      ctx.font = TEXT_FONT;
      ctx.textBaseline = "top";

  ctx.save();
  ctx.font = LINE_NUMBER_FONT;
    const linesArr = text.split(/\n/);
    const maxNumStr_paint = String(linesArr.length);
    const numW = ctx.measureText(maxNumStr_paint).width;
    const gutterWidth = Math.ceil(pad + numW + pad + gutterExtra);
      ctx.restore();
      
      // Calculate word wrap if enabled
      let currentWrapInfo: WrapInfo | null = null;
      if (wordWrapEnabled) {
        const maxWidth = w - gutterWidth - pad * 2;
        ctx.save();
        ctx.font = TEXT_FONT;
        currentWrapInfo = calculateWordWrap(linesArr, maxWidth, ctx);
        ctx.restore();
        
        // Update wrapInfo state if changed (simple comparison)
        if (wrapInfo?.totalRows !== currentWrapInfo?.totalRows) {
          setWrapInfo(currentWrapInfo);
        }
        // Also update ref immediately so event handlers see the latest value
        wrapInfoRef.current = currentWrapInfo;
      } else if (wrapInfo !== null) {
        setWrapInfo(null);
        wrapInfoRef.current = null;
      }
      
      // Calculate visible range for virtualization
      const viewportH = container.clientHeight || 0;
      const totalDisplayLines = currentWrapInfo ? currentWrapInfo.totalRows : linesArr.length;
      const contentH = calculateContentHeight(totalDisplayLines, lineHeight, pad);
      const visibleRange = calculateVisibleRange({
        totalLines: totalDisplayLines,
        lineHeight,
        viewportHeight: viewportH,
        scrollTop: scrollTopRef.current,
        bufferLines: 10,
      });

      // Caret sizing — use line height for a full-height, normal caret
      const caretHeight = Math.max(1, lineHeight - 4);
      // Center caret vertically: middle of line minus half of caret height
      const caretYOffset = (lineHeight - caretHeight) / 2;
      const textStartX = gutterWidth + pad;

      ctx.fillStyle = styles.getPropertyValue("--foreground") || "#111";
      ctx.globalAlpha = 0.08;
      ctx.fillRect(gutterWidth, 0, 1, h);
      ctx.globalAlpha = 1;

      ctx.save();
      ctx.font = LINE_NUMBER_FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = styles.getPropertyValue("--foreground") || "#111";
      
      // Draw line numbers and fold icons (only visible range)
      const foldRegions = activeFile.folding.getRegions();
      
      if (currentWrapInfo) {
        // Word wrap enabled: render based on visual rows
        for (let visualRow = visibleRange.startLine; visualRow <= visibleRange.endLine; visualRow++) {
          const wrapResult = currentWrapInfo.rowToWrap.get(visualRow);
          if (!wrapResult) continue;
          
          const lineIndex = wrapResult.lineIndex;
          const cy = pad + visualRow * lineHeight + lineHeight / 2 - scrollTopRef.current;
          
          // Only show line number on first visual row of each logical line
          const isFirstRow = wrapResult.startCol === 0;
          if (isFirstRow) {
            ctx.fillText(String(lineIndex + 1), gutterWidth / 2, cy);
            
            // Draw fold icon if this line starts a fold region
            const regionAtLine = foldRegions.find(r => r.startLine === lineIndex);
            if (regionAtLine) {
              const icon = regionAtLine.folded ? '▶' : '▼';
              
              ctx.save();
              ctx.fillStyle = styles.getPropertyValue("--foreground") || "#666";
              ctx.globalAlpha = 0.5;
              ctx.textAlign = "left";
              ctx.font = `normal ${lineNumberFontSize - 2}px ${MONO_FONT_STACK}`;
              ctx.fillText(icon, pad / 2, cy);
              ctx.restore();
            }
          }
        }
      } else {
        // No word wrap: render based on logical lines
        for (let i = visibleRange.startLine; i <= visibleRange.endLine; i++) {
          const cy = pad + i * lineHeight + lineHeight / 2 - scrollTopRef.current;
          
          // Draw line number
          ctx.fillText(String(i + 1), gutterWidth / 2, cy);
          
          // Draw fold icon if this line starts a fold region
          const regionAtLine = foldRegions.find(r => r.startLine === i);
          if (regionAtLine) {
            const icon = regionAtLine.folded ? '▶' : '▼';
            
            // Position fold icon to the left of line numbers
            ctx.save();
            ctx.fillStyle = styles.getPropertyValue("--foreground") || "#666";
            ctx.globalAlpha = 0.5;
            ctx.textAlign = "left";
            ctx.font = `normal ${lineNumberFontSize - 2}px ${MONO_FONT_STACK}`;
            ctx.fillText(icon, pad / 2, cy);
            ctx.restore();
          }
        }
      }
      ctx.restore();
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const colorFor = (type?: string): string => {
        switch (type) {
          // General code tokens
          case "keyword": return styles.getPropertyValue("--token-keyword") || "#7c3aed";
          case "type-keyword": return styles.getPropertyValue("--token-type") || "#2563eb";
          case "primitive-type": return styles.getPropertyValue("--token-primitive") || "#3b82f6";
          case "number": return styles.getPropertyValue("--token-number") || "#14b8a6";
          case "global": return styles.getPropertyValue("--token-global") || "#6366f1";
          case "string": return styles.getPropertyValue("--token-string") || "#16a34a";
          case "comment": return styles.getPropertyValue("--token-comment") || "#9ca3af";
          case "operator": return styles.getPropertyValue("--token-operator") || "#f43f5e";
          case "regex": return styles.getPropertyValue("--token-regex") || "#06b6d4";
          case "identifier": return styles.getPropertyValue("--token-identifier") || "#60a5fa";
          case "function-name": return styles.getPropertyValue("--token-function") || "#22c55e";
          case "class-name": return styles.getPropertyValue("--token-class") || "#fb7185";
          case "punctuation": return styles.getPropertyValue("--token-punctuation") || "#6b7280";
          // Markup / style
          case "tag": return styles.getPropertyValue("--token-tag") || "#dc2626";
          case "attribute": return styles.getPropertyValue("--token-attribute") || "#fbbf24";
          case "attr-value": return styles.getPropertyValue("--token-attr-value") || "#10b981";
          case "entity": return styles.getPropertyValue("--token-entity") || "#f59e0b";
          case "doctype": return styles.getPropertyValue("--token-doctype") || "#9ca3af";
          case "property": return styles.getPropertyValue("--token-property") || "#f59e0b";
          case "at-rule": return styles.getPropertyValue("--token-atrule") || "#0891b2";
          case "selector-class": return styles.getPropertyValue("--token-selector-class") || "#f472b6";
          case "selector-id": return styles.getPropertyValue("--token-selector-id") || "#22d3ee";
          case "pseudo": return styles.getPropertyValue("--token-pseudo") || "#a78bfa";
          case "function": return styles.getPropertyValue("--token-css-fn") || "#34d399";
          case "value": return styles.getPropertyValue("--token-value") || "#60a5fa";
          case "color": return styles.getPropertyValue("--token-color") || "#34d399";
          // Markdown
          case "heading": return styles.getPropertyValue("--token-heading") || "#eab308";
          case "inline": return styles.getPropertyValue("--token-inline") || "#d946ef";
          case "code-block": return styles.getPropertyValue("--token-codeblock") || "#94a3b8";
          case "blockquote": return styles.getPropertyValue("--token-blockquote") || "#9ca3af";
          case "list": return styles.getPropertyValue("--token-list") || "#06b6d4";
          case "link": return styles.getPropertyValue("--token-link") || "#3b82f6";
          case "image": return styles.getPropertyValue("--token-image") || "#ec4899";
          // Story/Narrative
          case "scene": return styles.getPropertyValue("--token-scene") || "#0ea5e9";
          case "character": return styles.getPropertyValue("--token-character") || "#22c55e";
          case "dialogue": return styles.getPropertyValue("--token-dialogue") || "#f97316";
          case "action": return styles.getPropertyValue("--token-action") || "#84cc16";
          case "symbol": return styles.getPropertyValue("--token-symbol") || "#d946ef";
          case "identifier": return styles.getPropertyValue("--token-identifier") || "#60a5fa";
          default: return styles.getPropertyValue("--foreground") || "#111";
        }
      };
      
      // Helper to darken colors for selected text (make more readable on gray background)
      const darkenForSelection = (color: string): string => {
        // Parse RGB/RGBA and darken by reducing lightness
        if (color.startsWith('rgba') || color.startsWith('rgb')) {
          return styles.getPropertyValue("--foreground") || "#000";
        }
        if (color.startsWith('#')) {
          // Simple approach: return foreground color for better contrast
          return styles.getPropertyValue("--foreground") || "#000";
        }
        return color;
      };

      // Render only visible lines (virtualized)
      if (currentWrapInfo) {
        // ==== WORD WRAP ENABLED: Render visual rows ====
        for (let visualRow = visibleRange.startLine; visualRow <= visibleRange.endLine; visualRow++) {
          const wrapResult = currentWrapInfo.rowToWrap.get(visualRow);
          if (!wrapResult) continue;
          
          const li = wrapResult.lineIndex;
          // const _l = linesArr[li]; // Line text available if needed
          const y = pad + visualRow * lineHeight - scrollTopRef.current;
          
          // Skip hidden lines (those inside folded regions)
          if (activeFile.folding.isLineHidden(li)) {
            continue;
          }
          
          // Get the segment to render for this visual row
          const segmentText = wrapResult.text;
          const segmentStartCol = wrapResult.startCol;
          const segmentEndCol = wrapResult.endCol;
          
          // Draw selection background for this segment
          if (hasSelection) {
            const selStart = anchor!;
            const selEnd = caret;
            const startLine = Math.min(selStart.line, selEnd.line);
            const endLine = Math.max(selStart.line, selEnd.line);
            
            if (li >= startLine && li <= endLine) {
              // Calculate selection bounds within this segment
              let selStartCol = 0;
              let selEndCol = segmentText.length;
              
              if (li === startLine && li === endLine) {
                // Selection within same line
                selStartCol = Math.max(0, Math.min(selStart.column, selEnd.column) - segmentStartCol);
                selEndCol = Math.min(segmentText.length, Math.max(selStart.column, selEnd.column) - segmentStartCol);
              } else if (li === startLine) {
                // First line of multi-line selection
                selStartCol = Math.max(0, Math.min(selStart.column, selEnd.column) - segmentStartCol);
                selEndCol = segmentText.length;
              } else if (li === endLine) {
                // Last line of multi-line selection
                selStartCol = 0;
                selEndCol = Math.min(segmentText.length, Math.max(selStart.column, selEnd.column) - segmentStartCol);
              }
              
              // Only draw if selection intersects this segment
              if (selStartCol < selEndCol && selStartCol < segmentText.length && selEndCol > 0) {
                const pre = segmentText.slice(0, selStartCol);
                const sel = segmentText.slice(selStartCol, selEndCol);
                const sx = textStartX + ctx.measureText(pre).width;
                const sw = ctx.measureText(sel).width;
                ctx.fillStyle = styles.getPropertyValue("--selection-bg") || "rgba(100,150,240,0.25)";
                ctx.fillRect(sx, y, sw, lineHeight);
              }
            }
          }
          
          // Render the segment text (check if any part is selected for darker text)
          const isAnySelected = hasSelection && (() => {
            const selStart = anchor!;
            const selEnd = caret;
            const startLine = Math.min(selStart.line, selEnd.line);
            const endLine = Math.max(selStart.line, selEnd.line);
            return li >= startLine && li <= endLine;
          })();
          
          if (isAnySelected) {
            // Render with darker text for selected portions
            const selStart = anchor!;
            const selEnd = caret;
            const startLine = Math.min(selStart.line, selEnd.line);
            const endLine = Math.max(selStart.line, selEnd.line);
            
            let selStartCol = 0;
            let selEndCol = segmentText.length;
            
            if (li === startLine && li === endLine) {
              selStartCol = Math.max(0, Math.min(selStart.column, selEnd.column) - segmentStartCol);
              selEndCol = Math.min(segmentText.length, Math.max(selStart.column, selEnd.column) - segmentStartCol);
            } else if (li === startLine) {
              selStartCol = Math.max(0, Math.min(selStart.column, selEnd.column) - segmentStartCol);
              selEndCol = segmentText.length;
            } else if (li === endLine) {
              selStartCol = 0;
              selEndCol = Math.min(segmentText.length, Math.max(selStart.column, selEnd.column) - segmentStartCol);
            }
            
            // Render: before selection | selected (darker) | after selection
            if (selStartCol > 0) {
              const beforeSel = segmentText.slice(0, selStartCol);
              ctx.fillStyle = colorFor();
              ctx.fillText(beforeSel, textStartX, y);
            }
            
            if (selStartCol < selEndCol && selEndCol > 0) {
              const selected = segmentText.slice(selStartCol, selEndCol);
              const preWidth = selStartCol > 0 ? ctx.measureText(segmentText.slice(0, selStartCol)).width : 0;
              ctx.fillStyle = darkenForSelection(colorFor());
              ctx.font = `bold ${TEXT_FONT.replace(/^normal\s+/, '')}`;
              ctx.fillText(selected, textStartX + preWidth, y);
              ctx.font = TEXT_FONT;
            }
            
            if (selEndCol < segmentText.length) {
              const afterSel = segmentText.slice(selEndCol);
              const preWidth = ctx.measureText(segmentText.slice(0, selEndCol)).width;
              ctx.fillStyle = colorFor();
              ctx.fillText(afterSel, textStartX + preWidth, y);
            }
          } else {
            // No selection on this line - render normally
            ctx.fillStyle = colorFor();
            ctx.fillText(segmentText, textStartX, y);
          }
          
          // Draw cursors if on this line and column range
          if (activeRef.current && focusedRef.current && blinkRef.current) {
            const cursors = activeFile.multiCursor.getCursors();
            
            for (const cursor of cursors) {
              if (cursor.caret.line === li && cursor.caret.column >= segmentStartCol && cursor.caret.column <= segmentEndCol) {
                const caretColInSegment = cursor.caret.column - segmentStartCol;
                const caretText = segmentText.slice(0, caretColInSegment);
                const cx = textStartX + ctx.measureText(caretText).width;
                ctx.fillStyle = styles.getPropertyValue("--foreground") || "#111";
                ctx.fillRect(cx, y + caretYOffset, caretWidth, caretHeight);
              }
              
              // Draw selection for this cursor if it has one
              if (cursor.anchor && (cursor.anchor.line !== cursor.caret.line || cursor.anchor.column !== cursor.caret.column)) {
                const cursorSelStart = cursor.anchor;
                const cursorSelEnd = cursor.caret;
                const cursorStartLine = Math.min(cursorSelStart.line, cursorSelEnd.line);
                const cursorEndLine = Math.max(cursorSelStart.line, cursorSelEnd.line);
                
                if (li >= cursorStartLine && li <= cursorEndLine) {
                  let selStartCol = 0;
                  let selEndCol = segmentText.length;
                  
                  if (li === cursorStartLine && li === cursorEndLine) {
                    selStartCol = Math.max(0, Math.min(cursorSelStart.column, cursorSelEnd.column) - segmentStartCol);
                    selEndCol = Math.min(segmentText.length, Math.max(cursorSelStart.column, cursorSelEnd.column) - segmentStartCol);
                  } else if (li === cursorStartLine) {
                    selStartCol = Math.max(0, Math.min(cursorSelStart.column, cursorSelEnd.column) - segmentStartCol);
                    selEndCol = segmentText.length;
                  } else if (li === cursorEndLine) {
                    selStartCol = 0;
                    selEndCol = Math.min(segmentText.length, Math.max(cursorSelStart.column, cursorSelEnd.column) - segmentStartCol);
                  }
                  
                  if (selStartCol < selEndCol && selStartCol < segmentText.length && selEndCol > 0) {
                    const pre = segmentText.slice(0, selStartCol);
                    const sel = segmentText.slice(selStartCol, selEndCol);
                    const sx = textStartX + ctx.measureText(pre).width;
                    const sw = ctx.measureText(sel).width;
                    ctx.fillStyle = styles.getPropertyValue("--selection-background") || "rgba(100,149,237,0.3)";
                    ctx.fillRect(sx, y, sw, lineHeight);
                  }
                }
              }
            }
          }
          
          // Draw bracket match highlights
          if (bracketMatchingEnabled && bracketMatches.length > 0) {
            for (const match of bracketMatches) {
              if (match.position.line === li && match.position.column >= segmentStartCol && match.position.column < segmentEndCol) {
                const bracketColInSegment = match.position.column - segmentStartCol;
                const bracketText = segmentText.slice(0, bracketColInSegment);
                const bx = textStartX + ctx.measureText(bracketText).width;
                const bracketChar = segmentText[bracketColInSegment];
                const bw = ctx.measureText(bracketChar).width;
                
                // Draw subtle border around matching bracket
                ctx.strokeStyle = styles.getPropertyValue("--bracket-match-border") || "#fbbf24";
                ctx.lineWidth = 1.5;
                ctx.strokeRect(bx - 1, y + 1, bw + 2, lineHeight - 2);
                
                // Optional: subtle background
                ctx.fillStyle = styles.getPropertyValue("--bracket-match-bg") || "rgba(251, 191, 36, 0.15)";
                ctx.fillRect(bx, y, bw, lineHeight);
              }
            }
          }
        }
      } else {
        // ==== NO WORD WRAP: Render logical lines (existing logic) ====
        for (let li = visibleRange.startLine; li <= visibleRange.endLine; li++) {
        // Skip hidden lines (those inside folded regions)
        if (activeFile.folding.isLineHidden(li)) {
          continue;
        }
        
        const l = linesArr[li];
        const y = pad + li * lineHeight - scrollTopRef.current;
        
        // Check if this line starts a folded region and show placeholder
        const regionAtLine = foldRegions.find(r => r.startLine === li);
        const isFoldedLine = regionAtLine && regionAtLine.folded;
        
        // Draw search match highlights first (behind selection and text)
        if (searchMatches.length > 0) {
          const lineMatches = searchMatches.filter(m => 
            (m.startPos.line === li && m.endPos.line === li) || // single-line match
            (m.startPos.line === li && m.endPos.line > li) || // multi-line match start
            (m.startPos.line < li && m.endPos.line === li) || // multi-line match end
            (m.startPos.line < li && m.endPos.line > li) // multi-line match middle
          );
          
          for (let mi = 0; mi < lineMatches.length; mi++) {
            const match = lineMatches[mi];
            const isCurrent = searchMatches.indexOf(match) === currentSearchIndex;
            
            // Calculate highlight bounds for this line
            let highlightStartCol = 0;
            let highlightEndCol = l.length;
            
            if (match.startPos.line === li && match.endPos.line === li) {
              // Single-line match
              highlightStartCol = match.startPos.column;
              highlightEndCol = match.endPos.column;
            } else if (match.startPos.line === li) {
              // First line of multi-line match
              highlightStartCol = match.startPos.column;
              highlightEndCol = l.length;
            } else if (match.endPos.line === li) {
              // Last line of multi-line match
              highlightStartCol = 0;
              highlightEndCol = match.endPos.column;
            }
            
            const pre = l.slice(0, highlightStartCol);
            const highlighted = l.slice(highlightStartCol, highlightEndCol);
            const hx = textStartX + ctx.measureText(pre).width;
            const hw = ctx.measureText(highlighted).width;
            
            // Use different colors for current match vs other matches
            if (isCurrent) {
              ctx.fillStyle = styles.getPropertyValue("--search-match-current-bg") || "rgba(255,165,0,0.4)";
            } else {
              ctx.fillStyle = styles.getPropertyValue("--search-match-bg") || "rgba(255,255,0,0.3)";
            }
            ctx.fillRect(hx, y, hw, lineHeight);
          }
        }
        
        // Draw selection background second (on top of search highlights) so text remains readable above it
        if (hasSelection) {
          const selStart = anchor!;
          const selEnd = caret;
          const startLine = Math.min(selStart.line, selEnd.line);
          const endLine = Math.max(selStart.line, selEnd.line);
          if (li >= startLine && li <= endLine) {
            const startCol = li === startLine ? Math.min(selStart.column, selEnd.column) : 0;
            const endCol = li === endLine ? Math.max(selStart.column, selEnd.column) : l.length;
            const pre = l.slice(0, startCol);
            const sel = l.slice(startCol, endCol);
            const sx = textStartX + ctx.measureText(pre).width;
            const sw = ctx.measureText(sel).width;
            ctx.fillStyle = styles.getPropertyValue("--selection-bg") || "rgba(100,150,240,0.25)";
            ctx.fillRect(sx, y, sw, lineHeight);
          }
        }
        // Check if this line has any selection for text darkening
        const hasSelectionOnLine = hasSelection && (() => {
          const selStart = anchor!;
          const selEnd = caret;
          const startLine = Math.min(selStart.line, selEnd.line);
          const endLine = Math.max(selStart.line, selEnd.line);
          return li >= startLine && li <= endLine;
        })();
        
        let selectionStartCol = -1;
        let selectionEndCol = -1;
        if (hasSelectionOnLine) {
          const selStart = anchor!;
          const selEnd = caret;
          const startLine = Math.min(selStart.line, selEnd.line);
          const endLine = Math.max(selStart.line, selEnd.line);
          selectionStartCol = li === startLine ? Math.min(selStart.column, selEnd.column) : 0;
          selectionEndCol = li === endLine ? Math.max(selStart.column, selEnd.column) : l.length;
        }
        
        // naive: paint tokens for this line by slicing ranges
        let x = textStartX;
        let idx = 0;
        const lineTokens = tokens.filter(t => t.range.start.line === li);
        
        // If this line is folded, show fold placeholder instead of full content
        if (isFoldedLine && regionAtLine) {
          const hiddenLineCount = regionAtLine.endLine - regionAtLine.startLine;
          const placeholder = ` ... ${hiddenLineCount} lines folded`;
          
          // Draw the line content up to where folding starts
          ctx.fillStyle = colorFor();
          ctx.fillText(l, x, y);
          const lineWidth = ctx.measureText(l).width;
          
          // Draw placeholder in gray/muted color
          ctx.fillStyle = styles.getPropertyValue("--token-comment") || "#999";
          ctx.globalAlpha = 0.7;
          ctx.fillText(placeholder, x + lineWidth, y);
          ctx.globalAlpha = 1;
        } else {
          // Normal line rendering with tokens
          for (const t of lineTokens.sort((a,b) => a.range.start.column - b.range.start.column)) {
            const pre = l.slice(idx, t.range.start.column);
            if (pre) {
              const isPreSelected = hasSelectionOnLine && idx >= selectionStartCol && idx < selectionEndCol;
              if (isPreSelected) {
                ctx.fillStyle = darkenForSelection(colorFor());
                ctx.font = `bold ${TEXT_FONT.replace(/^normal\s+/, '')}`;
              } else {
                ctx.fillStyle = colorFor();
                ctx.font = TEXT_FONT;
              }
              ctx.fillText(pre, x, y);
              x += ctx.measureText(pre).width;
            }
            const seg = l.slice(t.range.start.column, t.range.end.column);
            if (seg) {
              // Check if this token is in selection
              const isTokenSelected = hasSelectionOnLine && 
                t.range.start.column >= selectionStartCol && 
                t.range.end.column <= selectionEndCol;
              
              // Style tweaks per token
              const baseFont = TEXT_FONT;
              if (t.type === 'comment' || t.type === 'blockquote') {
                ctx.font = `italic ${baseFont.replace(/^normal\s+/, '')}`;
              } else if (t.type === 'heading') {
                ctx.font = `bold ${baseFont.replace(/^normal\s+/, '')}`;
              } else if (isTokenSelected) {
                ctx.font = `bold ${baseFont.replace(/^normal\s+/, '')}`;
              } else {
                ctx.font = baseFont;
              }
              // Color swatch for CSS color tokens
              if (t.type === 'color') {
                const sw = 10; const sh = 10;
                ctx.fillStyle = seg;
                ctx.fillRect(x, y + (lineHeight - sh) / 2, sw, sh);
                x += sw + 6;
              }
              ctx.fillStyle = isTokenSelected ? darkenForSelection(colorFor(t.type)) : colorFor(t.type);
              ctx.fillText(seg, x, y);
              x += ctx.measureText(seg).width;
              // reset font
              ctx.font = baseFont;
            }
            idx = t.range.end.column;
          }
          const rest = l.slice(idx);
          if (rest) {
            const isRestSelected = hasSelectionOnLine && idx >= selectionStartCol && idx < selectionEndCol;
            if (isRestSelected) {
              ctx.fillStyle = darkenForSelection(colorFor());
              ctx.font = `bold ${TEXT_FONT.replace(/^normal\s+/, '')}`;
            } else {
              ctx.fillStyle = colorFor();
              ctx.font = TEXT_FONT;
            }
            ctx.fillText(rest, x, y);
          }
        }
        
        // Draw cursors if on this line (support multiple cursors)
        if (activeRef.current && focusedRef.current && blinkRef.current) {
          const cursors = activeFile.multiCursor.getCursors();
          
          for (const cursor of cursors) {
            if (cursor.caret.line === li) {
              const caretText = l.slice(0, cursor.caret.column);
              const cx = textStartX + ctx.measureText(caretText).width;
              ctx.fillStyle = styles.getPropertyValue("--foreground") || "#111";
              ctx.fillRect(cx, y + caretYOffset, caretWidth, caretHeight);
            }
            
            // Draw selection for this cursor if it has one
            if (cursor.anchor && (cursor.anchor.line !== cursor.caret.line || cursor.anchor.column !== cursor.caret.column)) {
              const selStart = cursor.anchor;
              const selEnd = cursor.caret;
              const startLine = Math.min(selStart.line, selEnd.line);
              const endLine = Math.max(selStart.line, selEnd.line);
              
              if (li >= startLine && li <= endLine) {
                const startCol = li === startLine ? Math.min(selStart.column, selEnd.column) : 0;
                const endCol = li === endLine ? Math.max(selStart.column, selEnd.column) : l.length;
                const pre = l.slice(0, startCol);
                const sel = l.slice(startCol, endCol);
                const sx = textStartX + ctx.measureText(pre).width;
                const sw = ctx.measureText(sel).width;
                ctx.fillStyle = styles.getPropertyValue("--selection-background") || "rgba(100,149,237,0.3)";
                ctx.fillRect(sx, y, sw, lineHeight);
              }
            }
          }
        }
        
        // Draw bracket match highlights
        if (bracketMatchingEnabled && bracketMatches.length > 0) {
          for (const match of bracketMatches) {
            if (match.position.line === li) {
              const bracketText = l.slice(0, match.position.column);
              const bx = textStartX + ctx.measureText(bracketText).width;
              const bracketChar = l[match.position.column];
              const bw = ctx.measureText(bracketChar).width;
              
              // Draw subtle border around matching bracket
              ctx.strokeStyle = styles.getPropertyValue("--bracket-match-border") || "#fbbf24";
              ctx.lineWidth = 1.5;
              ctx.strokeRect(bx - 1, y + 1, bw + 2, lineHeight - 2);
              
              // Optional: subtle background
              ctx.fillStyle = styles.getPropertyValue("--bracket-match-bg") || "rgba(251, 191, 36, 0.15)";
              ctx.fillRect(bx, y, bw, lineHeight);
            }
          }
        }
        } // end for loop (no word wrap)
      } // end if/else (word wrap check)
      
      // Draw scrollbar if content is larger than viewport
      if (contentH > viewportH) {
        const scrollbarInfo = calculateScrollbar(contentH, viewportH, scrollTopRef.current, 30);
        const scrollbarWidth = 12;
        const scrollbarX = w - scrollbarWidth - 4;
        
        // Draw scrollbar track
        ctx.fillStyle = styles.getPropertyValue("--foreground") || "#111";
        ctx.globalAlpha = 0.05;
        ctx.fillRect(scrollbarX, 0, scrollbarWidth, scrollbarInfo.trackHeight);
        
        // Draw scrollbar thumb
        ctx.globalAlpha = isDraggingScrollbar ? 0.4 : 0.2;
        ctx.fillRect(scrollbarX, scrollbarInfo.thumbY, scrollbarWidth, scrollbarInfo.thumbHeight);
        ctx.globalAlpha = 1;
      }
    };
    paintRef.current = paint;

  const ro = new ResizeObserver(resize);
  if (containerRef.current) ro.observe(containerRef.current);
    resize();

    return () => {
      ro.disconnect();
    };
  }, [projectId, text, tokens, caret, anchor, hasSelection, completions, completionIndex, languageId, activeFile.folding, activeFile.multiCursor, bracketMatches, bracketMatchingEnabled, currentSearchIndex, isDraggingScrollbar, searchMatches, wordWrapEnabled, wrapInfo]);

  // Blink timer: toggle visibility and repaint without re-binding the paint effect
  useEffect(() => {
    const id = setInterval(() => {
      blinkRef.current = !blinkRef.current;
      paintRef.current?.();
    }, 530);
    return () => clearInterval(id);
  }, []);

  // Reset blink when caret or text changes (doc is stable after initialization)
  useEffect(() => {
    blinkRef.current = true;
    paintRef.current?.();
  }, [caret, text]);

  // Manual scrolling is handled by the scrollbar and wheel events
  // No auto-scroll on caret movement - user controls viewport

  // Input handlers using native events (no hidden textarea)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

  const onKeyDown = (e: KeyboardEvent) => {
      // Keyboard shortcuts: Code Folding
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        
        // Fold: Ctrl+Shift+[ / Cmd+Shift+[
        if (key === '[' && e.shiftKey) {
          e.preventDefault();
          const currentLine = caretRef.current.line;
          const region = activeFile.folding.getInnermostRegionAtLine(currentLine);
          if (region) {
            activeFile.folding.fold(region.startLine);
            paintRef.current?.();
          }
          return;
        }
        
        // Unfold: Ctrl+Shift+] / Cmd+Shift+]
        if (key === ']' && e.shiftKey) {
          e.preventDefault();
          const currentLine = caretRef.current.line;
          const region = activeFile.folding.getInnermostRegionAtLine(currentLine);
          if (region) {
            activeFile.folding.unfold(region.startLine);
            paintRef.current?.();
          }
          return;
        }
        
        // Fold All: Ctrl+K Ctrl+0 / Cmd+K Cmd+0 (two-step shortcut, simplified to Ctrl+Shift+0)
        if (key === '0' && e.shiftKey) {
          e.preventDefault();
          activeFile.folding.foldAll();
          paintRef.current?.();
          return;
        }
        
        // Unfold All: Ctrl+K Ctrl+J / Cmd+K Cmd+J (two-step shortcut, simplified to Ctrl+Shift+9)
        if (key === '9' && e.shiftKey) {
          e.preventDefault();
          activeFile.folding.unfoldAll();
          paintRef.current?.();
          return;
        }
      }
      
      // Keyboard shortcuts: Find/Replace
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        // Find: Ctrl+F / Cmd+F
        if (key === 'f' && !e.shiftKey) {
          e.preventDefault();
          setFindDialogMode('find');
          setFindDialogVisible(true);
          // Clear completion popup if open
          setCompletions(null);
          return;
        }
        // Replace: Ctrl+H / Cmd+H
        if (key === 'h') {
          e.preventDefault();
          setFindDialogMode('replace');
          setFindDialogVisible(true);
          // Clear completion popup if open
          setCompletions(null);
          return;
        }
      }
      
      // Keyboard shortcuts: Word Wrap
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        // Toggle Word Wrap: Alt+Z
        if (key === 'z') {
          e.preventDefault();
          ui.toggleWordWrap();
          return;
        }
      }
      
      // Keyboard shortcuts: Line Commands (Move/Duplicate/Delete)
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        // Move Lines Up: Alt+Up
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          const doc = docRef.current;
          const currentText = textRef.current;
          const lines = currentText.split('\n');
          const currentCaret = caretRef.current;
          const currentAnchor = anchorRef.current;
          
          // Determine selection range
          let startLine = currentCaret.line;
          let endLine = currentCaret.line;
          if (currentAnchor) {
            startLine = Math.min(currentCaret.line, currentAnchor.line);
            endLine = Math.max(currentCaret.line, currentAnchor.line);
          }
          
          const result = moveLinesUp(lines, startLine, endLine);
          if (result.newStartLine !== startLine) {
            const newText = result.lines.join('\n');
            
            // Replace entire document
            const oldEndPos: DocPos = { 
              line: lines.length - 1, 
              column: lines[lines.length - 1].length 
            };
            doc.deleteRange({ line: 0, column: 0 }, oldEndPos);
            doc.insertText({ line: 0, column: 0 }, newText);
            
            setText(newText);
            textRef.current = newText;
            
            // Update cursor position
            const newCaret = { line: result.newStartLine, column: currentCaret.column };
            const newAnchor = currentAnchor 
              ? { line: result.newEndLine, column: currentAnchor.column }
              : null;
            
            setCaret(newCaret);
            caretRef.current = newCaret;
            setAnchor(newAnchor);
            anchorRef.current = newAnchor;
            
            activeFile.caret = newCaret;
            activeFile.anchor = newAnchor;
            
            // Record in history
            activeFile.history.recordOperation(
              createReplaceOperation(
                { line: 0, column: 0 },
                oldEndPos,
                currentText,
                newText,
                currentCaret,
                currentAnchor || currentCaret,
                newCaret,
                newAnchor || newCaret
              )
            );
          }
          return;
        }
        
        // Move Lines Down: Alt+Down
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const doc = docRef.current;
          const currentText = textRef.current;
          const lines = currentText.split('\n');
          const currentCaret = caretRef.current;
          const currentAnchor = anchorRef.current;
          
          // Determine selection range
          let startLine = currentCaret.line;
          let endLine = currentCaret.line;
          if (currentAnchor) {
            startLine = Math.min(currentCaret.line, currentAnchor.line);
            endLine = Math.max(currentCaret.line, currentAnchor.line);
          }
          
          const result = moveLinesDown(lines, startLine, endLine);
          if (result.newStartLine !== startLine) {
            const newText = result.lines.join('\n');
            
            // Replace entire document
            const oldEndPos: DocPos = { 
              line: lines.length - 1, 
              column: lines[lines.length - 1].length 
            };
            doc.deleteRange({ line: 0, column: 0 }, oldEndPos);
            doc.insertText({ line: 0, column: 0 }, newText);
            
            setText(newText);
            textRef.current = newText;
            
            // Update cursor position
            const newCaret = { line: result.newStartLine, column: currentCaret.column };
            const newAnchor = currentAnchor 
              ? { line: result.newEndLine, column: currentAnchor.column }
              : null;
            
            setCaret(newCaret);
            caretRef.current = newCaret;
            setAnchor(newAnchor);
            anchorRef.current = newAnchor;
            
            activeFile.caret = newCaret;
            activeFile.anchor = newAnchor;
            
            // Record in history
            activeFile.history.recordOperation(
              createReplaceOperation(
                { line: 0, column: 0 },
                oldEndPos,
                currentText,
                newText,
                currentCaret,
                currentAnchor || currentCaret,
                newCaret,
                newAnchor || newCaret
              )
            );
          }
          return;
        }
      }
      
      // Keyboard shortcuts: Duplicate Lines
      if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        // Duplicate Lines Up: Shift+Alt+Up
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          const doc = docRef.current;
          const currentText = textRef.current;
          const lines = currentText.split('\n');
          const currentCaret = caretRef.current;
          const currentAnchor = anchorRef.current;
          
          // Determine selection range
          let startLine = currentCaret.line;
          let endLine = currentCaret.line;
          if (currentAnchor) {
            startLine = Math.min(currentCaret.line, currentAnchor.line);
            endLine = Math.max(currentCaret.line, currentAnchor.line);
          }
          
          const result = duplicateLines(lines, startLine, endLine, 'up');
          const newText = result.lines.join('\n');
          
          // Replace entire document
          const oldEndPos: DocPos = { 
            line: lines.length - 1, 
            column: lines[lines.length - 1].length 
          };
          doc.deleteRange({ line: 0, column: 0 }, oldEndPos);
          doc.insertText({ line: 0, column: 0 }, newText);
          
          setText(newText);
          textRef.current = newText;
          
          // Update cursor position
          const newCaret = { line: result.newStartLine, column: currentCaret.column };
          const newAnchor = currentAnchor 
            ? { line: result.newEndLine, column: currentAnchor.column }
            : null;
          
          setCaret(newCaret);
          caretRef.current = newCaret;
          setAnchor(newAnchor);
          anchorRef.current = newAnchor;
          
          activeFile.caret = newCaret;
          activeFile.anchor = newAnchor;
          
          // Record in history
          activeFile.history.recordOperation(
            createReplaceOperation(
              { line: 0, column: 0 },
              oldEndPos,
              currentText,
              newText,
              currentCaret,
              currentAnchor || currentCaret,
              newCaret,
              newAnchor || newCaret
            )
          );
          return;
        }
        
        // Duplicate Lines Down: Shift+Alt+Down
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const doc = docRef.current;
          const currentText = textRef.current;
          const lines = currentText.split('\n');
          const currentCaret = caretRef.current;
          const currentAnchor = anchorRef.current;
          
          // Determine selection range
          let startLine = currentCaret.line;
          let endLine = currentCaret.line;
          if (currentAnchor) {
            startLine = Math.min(currentCaret.line, currentAnchor.line);
            endLine = Math.max(currentCaret.line, currentAnchor.line);
          }
          
          const result = duplicateLines(lines, startLine, endLine, 'down');
          const newText = result.lines.join('\n');
          
          // Replace entire document
          const oldEndPos: DocPos = { 
            line: lines.length - 1, 
            column: lines[lines.length - 1].length 
          };
          doc.deleteRange({ line: 0, column: 0 }, oldEndPos);
          doc.insertText({ line: 0, column: 0 }, newText);
          
          setText(newText);
          textRef.current = newText;
          
          // Update cursor position
          const newCaret = { line: result.newStartLine, column: currentCaret.column };
          const newAnchor = currentAnchor 
            ? { line: result.newEndLine, column: currentAnchor.column }
            : null;
          
          setCaret(newCaret);
          caretRef.current = newCaret;
          setAnchor(newAnchor);
          anchorRef.current = newAnchor;
          
          activeFile.caret = newCaret;
          activeFile.anchor = newAnchor;
          
          // Record in history
          activeFile.history.recordOperation(
            createReplaceOperation(
              { line: 0, column: 0 },
              oldEndPos,
              currentText,
              newText,
              currentCaret,
              currentAnchor || currentCaret,
              newCaret,
              newAnchor || newCaret
            )
          );
          return;
        }
      }
      
      // Keyboard shortcuts: Delete Lines & Toggle Comments
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        
        // Delete Lines: Ctrl+Shift+K / Cmd+Shift+K
        if (key === 'k' && e.shiftKey) {
          e.preventDefault();
          const doc = docRef.current;
          const currentText = textRef.current;
          const lines = currentText.split('\n');
          const currentCaret = caretRef.current;
          const currentAnchor = anchorRef.current;
          
          // Determine selection range
          let startLine = currentCaret.line;
          let endLine = currentCaret.line;
          if (currentAnchor) {
            startLine = Math.min(currentCaret.line, currentAnchor.line);
            endLine = Math.max(currentCaret.line, currentAnchor.line);
          }
          
          const result = deleteLines(lines, startLine, endLine);
          const newText = result.lines.join('\n');
          
          // Replace entire document
          const oldEndPos: DocPos = { 
            line: lines.length - 1, 
            column: lines[lines.length - 1].length 
          };
          doc.deleteRange({ line: 0, column: 0 }, oldEndPos);
          doc.insertText({ line: 0, column: 0 }, newText);
          
          setText(newText);
          textRef.current = newText;
          
          // Update cursor position (no selection after delete)
          const newCaret = { line: result.newStartLine, column: 0 };
          
          setCaret(newCaret);
          caretRef.current = newCaret;
          setAnchor(null);
          anchorRef.current = null;
          
          activeFile.caret = newCaret;
          activeFile.anchor = null;
          
          // Record in history
          activeFile.history.recordOperation(
            createReplaceOperation(
              { line: 0, column: 0 },
              oldEndPos,
              currentText,
              newText,
              currentCaret,
              currentAnchor || currentCaret,
              newCaret,
              newCaret
            )
          );
          return;
        }
        
        // Toggle Line Comment: Ctrl+/ / Cmd+/
        if (key === '/') {
          e.preventDefault();
          const doc = docRef.current;
          const currentText = textRef.current;
          const lines = currentText.split('\n');
          const currentCaret = caretRef.current;
          const currentAnchor = anchorRef.current;
          const langId = languageId;
          
          // Get comment config for current language
          const commentConfig = getCommentConfig(langId);
          if (!commentConfig.lineComment) {
            // No line comment support for this language
            return;
          }
          
          // Determine selection range
          let startLine = currentCaret.line;
          let endLine = currentCaret.line;
          if (currentAnchor) {
            startLine = Math.min(currentCaret.line, currentAnchor.line);
            endLine = Math.max(currentCaret.line, currentAnchor.line);
          }
          
          const result = toggleLineComments(lines, startLine, endLine, commentConfig.lineComment);
          const newText = result.lines.join('\n');
          
          // Replace entire document
          const oldEndPos: DocPos = { 
            line: lines.length - 1, 
            column: lines[lines.length - 1].length 
          };
          doc.deleteRange({ line: 0, column: 0 }, oldEndPos);
          doc.insertText({ line: 0, column: 0 }, newText);
          
          setText(newText);
          textRef.current = newText;
          
          // Adjust cursor column based on comment operation
          const columnOffset = calculateColumnOffset(result.wasCommented, commentConfig.lineComment);
          const newCaret = { 
            line: currentCaret.line, 
            column: Math.max(0, currentCaret.column + columnOffset)
          };
          const newAnchor = currentAnchor 
            ? { 
                line: currentAnchor.line, 
                column: Math.max(0, currentAnchor.column + columnOffset)
              }
            : null;
          
          setCaret(newCaret);
          caretRef.current = newCaret;
          setAnchor(newAnchor);
          anchorRef.current = newAnchor;
          
          activeFile.caret = newCaret;
          activeFile.anchor = newAnchor;
          
          // Record in history
          activeFile.history.recordOperation(
            createReplaceOperation(
              { line: 0, column: 0 },
              oldEndPos,
              currentText,
              newText,
              currentCaret,
              currentAnchor || currentCaret,
              newCaret,
              newAnchor || newCaret
            )
          );
          return;
        }
      }
      
      // Keyboard shortcuts: Multi-cursor
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        
        // Add Next Occurrence: Ctrl+D / Cmd+D
        if (key === 'd' && !e.shiftKey) {
          e.preventDefault();
          const currentCaret = caretRef.current;
          const currentAnchor = anchorRef.current;
          const currentText = textRef.current;
          const multiCursor = activeFile.multiCursor;
          
          // Get the current selection or word at cursor
          let searchText = '';
          if (currentAnchor && (currentAnchor.line !== currentCaret.line || currentAnchor.column !== currentCaret.column)) {
            // Use selected text
            const lines = currentText.split('\n');
            const startPos = currentAnchor.line < currentCaret.line || 
              (currentAnchor.line === currentCaret.line && currentAnchor.column < currentCaret.column)
              ? currentAnchor : currentCaret;
            const endPos = currentAnchor.line > currentCaret.line || 
              (currentAnchor.line === currentCaret.line && currentAnchor.column > currentCaret.column)
              ? currentAnchor : currentCaret;
            
            // Extract text between startPos and endPos
            if (startPos.line === endPos.line) {
              searchText = lines[startPos.line].substring(startPos.column, endPos.column);
            } else {
              // Multi-line selection
              const firstLine = lines[startPos.line].substring(startPos.column);
              const lastLine = lines[endPos.line].substring(0, endPos.column);
              const middleLines = lines.slice(startPos.line + 1, endPos.line);
              searchText = [firstLine, ...middleLines, lastLine].join('\n');
            }
          } else {
            // Get word at cursor
            const lines = currentText.split('\n');
            const line = lines[currentCaret.line] || '';
            const wordMatch = /\w+/g;
            let match;
            while ((match = wordMatch.exec(line)) !== null) {
              if (match.index <= currentCaret.column && match.index + match[0].length >= currentCaret.column) {
                searchText = match[0];
                // Set initial selection for this word
                const wordStart = { line: currentCaret.line, column: match.index };
                const wordEnd = { line: currentCaret.line, column: match.index + match[0].length };
                multiCursor.setSingleCursor(wordEnd, wordStart);
                setCaret(wordEnd);
                caretRef.current = wordEnd;
                setAnchor(wordStart);
                anchorRef.current = wordStart;
                activeFile.caret = wordEnd;
                activeFile.anchor = wordStart;
                break;
              }
            }
          }
          
          if (searchText) {
            // Find next occurrence
            const primaryCursor = multiCursor.getPrimaryCursor();
            const startPos = primaryCursor.caret;
            const nextMatch = findNextOccurrence(currentText, searchText, startPos, true);
            
            if (nextMatch) {
              // Add new cursor at the match
              multiCursor.addCursor(nextMatch.endPos, nextMatch.startPos);
              
              // Update primary cursor to the new one
              const cursors = multiCursor.getCursors();
              const newPrimary = cursors[cursors.length - 1];
              setCaret(newPrimary.caret);
              caretRef.current = newPrimary.caret;
              setAnchor(newPrimary.anchor);
              anchorRef.current = newPrimary.anchor;
              activeFile.caret = newPrimary.caret;
              activeFile.anchor = newPrimary.anchor;
              
              // Trigger repaint to show multiple cursors
              paintRef.current?.();
            }
          }
          return;
        }
        
        // Escape: Clear secondary cursors
        if (key === 'escape') {
          const multiCursor = activeFile.multiCursor;
          const cursors = multiCursor.getCursors();
          if (cursors.length > 1) {
            e.preventDefault();
            multiCursor.clearSecondaryCursors();
            paintRef.current?.();
            return;
          }
        }
      }
      
      // Keyboard shortcuts: Undo/Redo
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        // Undo: Ctrl+Z / Cmd+Z
        if (key === 'z' && !e.shiftKey) {
          e.preventDefault();
          const state = fileStateRef.current;
          const result = state.history.popUndo();
          if (result) {
            const doc = docRef.current;
            // Apply operations in reverse
            for (let i = result.operations.length - 1; i >= 0; i--) {
              const op = result.operations[i];
              switch (op.type) {
                case "insert": {
                  const lines = op.text.split("\n");
                  const endPos: DocPos = lines.length === 1
                    ? { line: op.startPos.line, column: op.startPos.column + op.text.length }
                    : { line: op.startPos.line + lines.length - 1, column: lines[lines.length - 1].length };
                  doc.deleteRange(op.startPos, endPos);
                  break;
                }
                case "delete": {
                  doc.insertText(op.startPos, op.text);
                  break;
                }
                case "replace": {
                  if (op.newText) {
                    const newLines = op.newText.split("\n");
                    const newEndPos: DocPos = newLines.length === 1
                      ? { line: op.startPos.line, column: op.startPos.column + op.newText.length }
                      : { line: op.startPos.line + newLines.length - 1, column: newLines[newLines.length - 1].length };
                    doc.deleteRange(op.startPos, newEndPos);
                  }
                  doc.insertText(op.startPos, op.text);
                  break;
                }
              }
            }
            const firstOp = result.operations[0];
            state.caret = firstOp.caretBefore;
            state.anchor = firstOp.anchorBefore;
            const s = doc.toString();
            setText(s); textRef.current = s;
            setCaret(firstOp.caretBefore); caretRef.current = firstOp.caretBefore;
            setAnchor(firstOp.anchorBefore); anchorRef.current = firstOp.anchorBefore;
          }
          return;
        }
        // Redo: Ctrl+Y / Cmd+Y or Ctrl+Shift+Z / Cmd+Shift+Z
        if (key === 'y' || (key === 'z' && e.shiftKey)) {
          e.preventDefault();
          const state = fileStateRef.current;
          const result = state.history.popRedo();
          if (result) {
            const doc = docRef.current;
            // Apply operations in original order
            for (const op of result.operations) {
              switch (op.type) {
                case "insert": {
                  doc.insertText(op.startPos, op.text);
                  break;
                }
                case "delete": {
                  doc.deleteRange(op.startPos, op.endPos);
                  break;
                }
                case "replace": {
                  doc.deleteRange(op.startPos, op.endPos);
                  if (op.newText) {
                    doc.insertText(op.startPos, op.newText);
                  }
                  break;
                }
              }
            }
            const lastOp = result.operations[result.operations.length - 1];
            state.caret = lastOp.caretAfter;
            state.anchor = lastOp.anchorAfter;
            const s = doc.toString();
            setText(s); textRef.current = s;
            setCaret(lastOp.caretAfter); caretRef.current = lastOp.caretAfter;
            setAnchor(lastOp.anchorAfter); anchorRef.current = lastOp.anchorAfter;
          }
          return;
        }
      }
      // Keyboard shortcut: Select All (let default browser copy/cut/paste flow work via events)
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === 'a') {
          e.preventDefault();
          const linesArr = textRef.current.split("\n");
          const endLine = Math.max(0, linesArr.length - 1);
          const endCol = (linesArr[endLine] ?? '').length;
          anchorRef.current = { line: 0, column: 0 }; setAnchor({ line: 0, column: 0 });
          caretRef.current = { line: endLine, column: endCol }; setCaret({ line: endLine, column: endCol });
          return;
        }
      }
      // Snippet navigation has priority
      if (snippetSessionRef.current) {
        if (e.key === "Tab") { e.preventDefault(); moveSnippetCursor(e.shiftKey ? -1 : 1); return; }
        if (e.key === "Escape") { e.preventDefault(); cancelSnippetSession(); return; }
      }
      // Completion palette navigation
      if (completionOpenRef.current) {
        if (e.key === "ArrowDown") { e.preventDefault(); setCompletionIndex((i) => Math.min((completions?.length ?? 1) - 1, i + 1)); return; }
        if (e.key === "ArrowUp") { e.preventDefault(); setCompletionIndex((i) => Math.max(0, i - 1)); return; }
  if (e.key === "Escape") { e.preventDefault(); setCompletions(null); setCompletionPos(null); return; }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          const item = completions?.[completionIndex];
          if (item) {
            // Replace current word prefix with selection
            const cur = caretRef.current;
            const lineText = textRef.current.split("\n")[cur.line] ?? "";
            let startCol = cur.column;
            while (startCol > 0 && /[A-Za-z0-9_@#\-]/.test(lineText[startCol - 1])) startCol--;
            const insert = item.insertText ?? item.label;
            insertWithSnippet({ line: cur.line, column: startCol }, cur, insert);
          }
          setCompletions(null); setCompletionPos(null);
          return;
        }
      }
      // Prevent page scrolling for arrows and space within editor area
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        const linesArr = textRef.current.split("\n");
        const collapse = () => setAnchor(null);
        if (e.key === "ArrowLeft") {
          if (e.shiftKey) setAnchor(a => a ?? { ...caretRef.current });
          else collapse();
          const cur = caretRef.current;
          if (cur.column > 0) {
            const next = { line: cur.line, column: cur.column - 1 };
            caretRef.current = next; setCaret(next);
          } else if (cur.line > 0) {
            const next = { line: cur.line - 1, column: (linesArr[cur.line - 1] ?? "").length };
            caretRef.current = next; setCaret(next);
          }
        }
        if (e.key === "ArrowRight") {
          if (e.shiftKey) setAnchor(a => a ?? { ...caretRef.current });
          else collapse();
          const cur = caretRef.current;
          const lineText = linesArr[cur.line] ?? "";
          if (cur.column < lineText.length) {
            const next = { line: cur.line, column: cur.column + 1 };
            caretRef.current = next; setCaret(next);
          } else if (cur.line < linesArr.length - 1) {
            const next = { line: cur.line + 1, column: 0 };
            caretRef.current = next; setCaret(next);
          }
        }
        if (e.key === "ArrowUp") {
          if (e.shiftKey) setAnchor(a => a ?? { ...caretRef.current });
          else setAnchor(null);
          const cur = caretRef.current;
          if (cur.line > 0) {
            const prevText = linesArr[cur.line - 1] ?? "";
            const next = { line: cur.line - 1, column: Math.min(cur.column, prevText.length) };
            caretRef.current = next; setCaret(next);
          }
        }
        if (e.key === "ArrowDown") {
          if (e.shiftKey) setAnchor(a => a ?? { ...caretRef.current });
          else setAnchor(null);
          const cur = caretRef.current;
          if (cur.line < linesArr.length - 1) {
            const nextText = linesArr[cur.line + 1] ?? "";
            const next = { line: cur.line + 1, column: Math.min(cur.column, nextText.length) };
            caretRef.current = next; setCaret(next);
          }
        }
        return;
      }
      // Fallback text input handling if beforeinput is not firing
      const isModifier = e.ctrlKey || e.metaKey || e.altKey;
      const beforeInputAvailable = beforeInputSeenRef.current;
      if (!isModifier) {
        if (e.key.length === 1) {
          if (!beforeInputAvailable) {
            e.preventDefault();
            const curCaret = caretRef.current;
            const curAnchor = anchorRef.current;
            // Cancel any active snippet AFTER capturing selection
            cancelSnippetSession();
            let nextPos = curCaret;
            const state = fileStateRef.current; const doc = docRef.current;
            // Auto-pairs on keydown path
            const lineText = textRef.current.split("\n")[curCaret.line] ?? "";
            const nextChar = lineText[curCaret.column];
            const decision = autoPairDecision(e.key, nextChar, languageId);
            if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
              // When replacing selection with an opener, still pair
              if (decision.kind === 'pair') {
                const oldText = doc.getTextInRange(curAnchor, curCaret);
                const newText = e.key + decision.close;
                recordReplace(curAnchor, curCaret, oldText, newText, curCaret, { line: curCaret.line, column: curCaret.column + e.key.length }, curAnchor, null);
                nextPos = doc.replaceRange(curAnchor, curCaret, newText);
                nextPos = { line: nextPos.line, column: nextPos.column - decision.close.length };
              } else {
                // On selection, never skip; always replace with typed char
                const oldText = doc.getTextInRange(curAnchor, curCaret);
                recordReplace(curAnchor, curCaret, oldText, e.key, curCaret, { line: curCaret.line, column: curCaret.column + e.key.length }, curAnchor, null);
                nextPos = doc.replaceRange(curAnchor, curCaret, e.key);
              }
              setAnchor(null); anchorRef.current = null;
            } else {
              if (decision.kind === 'pair') {
                const textToInsert = e.key + decision.close;
                recordInsert(curCaret, textToInsert, curCaret, { line: curCaret.line, column: curCaret.column + textToInsert.length }, null, null);
                const after = doc.insertText(curCaret, textToInsert);
                nextPos = { line: after.line, column: after.column - decision.close.length };
              } else if (decision.kind === 'skip') {
                // Skip doesn't modify document, no history recording needed
                nextPos = { ...curCaret, column: curCaret.column + 1 };
              } else {
                recordInsert(curCaret, e.key, curCaret, { line: curCaret.line, column: curCaret.column + e.key.length }, null, null);
                nextPos = doc.insertText(curCaret, e.key);
              }
            }
            state.caret = nextPos; state.anchor = null;
            const s = doc.toString(); setText(s); textRef.current = s;
            setCaret(nextPos); caretRef.current = nextPos;
            
            // Handle fold updates (insertions don't add lines unless it's a newline in the text)
            const linesInserted = (e.key.match(/\n/g) || []).length;
            if (linesInserted > 0) {
              handleFoldAfterEdit(curCaret.line, linesInserted, 0);
            }
            
            return;
          }
          // If beforeinput is available, let it handle printable text
        }
  if (e.key === "Enter") {
          if (!beforeInputAvailable) {
            e.preventDefault();
            const curCaret = caretRef.current;
            const curAnchor = anchorRef.current;
            cancelSnippetSession();
            let nextPos = curCaret;
            const state = fileStateRef.current; const doc = docRef.current;
            if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
              const oldText = doc.getTextInRange(curAnchor, curCaret);
              recordReplace(curAnchor, curCaret, oldText, "\n", curCaret, { line: curCaret.line + 1, column: 0 }, curAnchor, null);
              nextPos = doc.replaceRange(curAnchor, curCaret, "\n");
              setAnchor(null); anchorRef.current = null;
            } else {
              recordInsert(curCaret, "\n", curCaret, { line: curCaret.line + 1, column: 0 }, null, null);
              nextPos = doc.insertNewline(curCaret);
            }
            state.caret = nextPos; state.anchor = null;
            const s = doc.toString(); setText(s); textRef.current = s;
            setCaret(nextPos); caretRef.current = nextPos;
            
            // Handle fold updates for Enter key (adds 1 line)
            handleFoldAfterEdit(curCaret.line, 1, 0);
            
            return;
          }
        }
  if (e.key === "Backspace") {
          if (!beforeInputAvailable) {
            e.preventDefault();
            const curCaret = caretRef.current;
            const curAnchor = anchorRef.current;
            cancelSnippetSession();
            let nextPos = curCaret;
            const state = fileStateRef.current; const doc = docRef.current;
            if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
              const deletedText = doc.getTextInRange(curAnchor, curCaret);
              const normalizedStart = curAnchor.line < curCaret.line || (curAnchor.line === curCaret.line && curAnchor.column < curCaret.column) ? curAnchor : curCaret;
              const normalizedEnd = curAnchor.line > curCaret.line || (curAnchor.line === curCaret.line && curAnchor.column > curCaret.column) ? curAnchor : curCaret;
              recordDelete(normalizedStart, normalizedEnd, deletedText, curCaret, normalizedStart, curAnchor, null);
              nextPos = doc.deleteRange(curAnchor, curCaret);
              setAnchor(null); anchorRef.current = null;
            } else {
              // Calculate what will be deleted for single-char backspace
              if (curCaret.column > 0) {
                const lineText = textRef.current.split("\n")[curCaret.line] ?? "";
                const deletedChar = lineText[curCaret.column - 1];
                recordDelete({ line: curCaret.line, column: curCaret.column - 1 }, curCaret, deletedChar, curCaret, { line: curCaret.line, column: curCaret.column - 1 }, null, null);
              } else if (curCaret.line > 0) {
                const prevLineText = textRef.current.split("\n")[curCaret.line - 1] ?? "";
                recordDelete({ line: curCaret.line - 1, column: prevLineText.length }, curCaret, "\n", curCaret, { line: curCaret.line - 1, column: prevLineText.length }, null, null);
              }
              nextPos = doc.deleteBackward(curCaret);
            }
            state.caret = nextPos; state.anchor = null;
            const s = doc.toString(); setText(s); textRef.current = s;
            setCaret(nextPos); caretRef.current = nextPos;
            
            // Handle fold updates for Backspace
            const linesRemoved = curCaret.line - nextPos.line;
            if (linesRemoved > 0) {
              handleFoldAfterEdit(nextPos.line, 0, linesRemoved);
            }
            
            return;
          }
        }
  if (e.key === "Delete") {
          if (!beforeInputAvailable) {
            e.preventDefault();
            const curCaret = caretRef.current;
            const curAnchor = anchorRef.current;
            cancelSnippetSession();
            let nextPos = curCaret;
            const state = fileStateRef.current; const doc = docRef.current;
            if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
              const deletedText = doc.getTextInRange(curAnchor, curCaret);
              const normalizedStart = curAnchor.line < curCaret.line || (curAnchor.line === curCaret.line && curAnchor.column < curCaret.column) ? curAnchor : curCaret;
              const normalizedEnd = curAnchor.line > curCaret.line || (curAnchor.line === curCaret.line && curAnchor.column > curCaret.column) ? curAnchor : curCaret;
              recordDelete(normalizedStart, normalizedEnd, deletedText, curCaret, normalizedStart, curAnchor, null);
              nextPos = doc.deleteRange(curAnchor, curCaret);
              setAnchor(null); anchorRef.current = null;
            } else {
              // Calculate what will be deleted for single-char forward delete
              const linesArr = textRef.current.split("\n");
              const lineText = linesArr[curCaret.line] ?? "";
              if (curCaret.column < lineText.length) {
                const deletedChar = lineText[curCaret.column];
                recordDelete(curCaret, { line: curCaret.line, column: curCaret.column + 1 }, deletedChar, curCaret, curCaret, null, null);
              } else if (curCaret.line < linesArr.length - 1) {
                recordDelete(curCaret, { line: curCaret.line + 1, column: 0 }, "\n", curCaret, curCaret, null, null);
              }
              nextPos = doc.deleteForward(curCaret);
            }
            state.caret = nextPos; state.anchor = null;
            const s = doc.toString(); setText(s); textRef.current = s;
            setCaret(nextPos); caretRef.current = nextPos;
            return;
          }
        }
        if (e.key === "Tab") {
          e.preventDefault();
          const curCaret = caretRef.current;
          const curAnchor = anchorRef.current;
          let nextPos = curCaret;
          const state = fileStateRef.current; const doc = docRef.current;
          if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
            const oldText = doc.getTextInRange(curAnchor, curCaret);
            recordReplace(curAnchor, curCaret, oldText, "\t", curCaret, { line: curCaret.line, column: curCaret.column + 1 }, curAnchor, null);
            nextPos = doc.replaceRange(curAnchor, curCaret, "\t");
            setAnchor(null); anchorRef.current = null;
          } else {
            recordInsert(curCaret, "\t", curCaret, { line: curCaret.line, column: curCaret.column + 1 }, null, null);
            nextPos = doc.insertText(curCaret, "\t");
          }
          state.caret = nextPos; state.anchor = null;
          const s = doc.toString(); setText(s); textRef.current = s;
          setCaret(nextPos); caretRef.current = nextPos;
          return;
        }
        if (e.key === " ") {
          if (!beforeInputAvailable) {
            e.preventDefault();
            const curCaret = caretRef.current;
            const curAnchor = anchorRef.current;
            let nextPos = curCaret;
            const state = fileStateRef.current; const doc = docRef.current;
            if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
              const oldText = doc.getTextInRange(curAnchor, curCaret);
              recordReplace(curAnchor, curCaret, oldText, " ", curCaret, { line: curCaret.line, column: curCaret.column + 1 }, curAnchor, null);
              nextPos = doc.replaceRange(curAnchor, curCaret, " ");
              setAnchor(null); anchorRef.current = null;
            } else {
              recordInsert(curCaret, " ", curCaret, { line: curCaret.line, column: curCaret.column + 1 }, null, null);
              nextPos = doc.insertText(curCaret, " ");
            }
            state.caret = nextPos; state.anchor = null;
            const s = doc.toString(); setText(s); textRef.current = s;
            setCaret(nextPos); caretRef.current = nextPos;
            return;
          }
        }
        if (e.key === "Home") {
          e.preventDefault();
          const col = 0;
          if (e.shiftKey) setAnchor(a => a ?? { ...caretRef.current }); else setAnchor(null);
          const next = { line: caretRef.current.line, column: col };
          caretRef.current = next; setCaret(next);
          return;
        }
        if (e.key === "End") {
          e.preventDefault();
          const lineText = textRef.current.split("\n")[caretRef.current.line] ?? "";
          const col = lineText.length;
          if (e.shiftKey) setAnchor(a => a ?? { ...caretRef.current }); else setAnchor(null);
          const next = { line: caretRef.current.line, column: col };
          caretRef.current = next; setCaret(next);
          return;
        }
        // Ctrl+Space -> open completions
        if ((e.ctrlKey || e.metaKey) && e.key === " ") {
          e.preventDefault();
          triggerCompletion.current?.(true);
          return;
        }
      }
    };

    const onBeforeInput = (e: InputEvent) => {
  beforeInputSeenRef.current = true;
  e.preventDefault();
  const data = e.data;
      const type = (e as InputEvent).inputType as string;
      // Authoritative handling for text editing when available
      if ((type === "insertText" || type === "insertReplacementText" || type === "insertCompositionText") && data) {
        const curCaret = caretRef.current;
        const curAnchor = anchorRef.current;
        cancelSnippetSession();
        let nextPos = curCaret;
        const state = fileStateRef.current; const doc = docRef.current;
        const lineText = textRef.current.split("\n")[curCaret.line] ?? "";
        const nextChar = lineText[curCaret.column];
        const decision = autoPairDecision(data, nextChar, languageId);
        if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
          if (decision.kind === 'pair') {
            const oldText = doc.getTextInRange(curAnchor, curCaret);
            const newText = data + decision.close;
            recordReplace(curAnchor, curCaret, oldText, newText, curCaret, { line: curCaret.line, column: curCaret.column + data.length }, curAnchor, null);
            nextPos = doc.replaceRange(curAnchor, curCaret, newText);
            nextPos = { line: nextPos.line, column: nextPos.column - decision.close.length };
          } else {
            // On selection, never skip; always replace with typed text
            const oldText = doc.getTextInRange(curAnchor, curCaret);
            recordReplace(curAnchor, curCaret, oldText, data, curCaret, { line: curCaret.line, column: curCaret.column + data.length }, curAnchor, null);
            nextPos = doc.replaceRange(curAnchor, curCaret, data);
          }
          setAnchor(null); anchorRef.current = null;
        } else {
          if (decision.kind === 'pair') {
            const textToInsert = data + decision.close;
            recordInsert(curCaret, textToInsert, curCaret, { line: curCaret.line, column: curCaret.column + textToInsert.length }, null, null);
            const after = doc.insertText(curCaret, textToInsert);
            nextPos = { line: after.line, column: after.column - decision.close.length };
          } else if (decision.kind === 'skip') {
            // Skip doesn't modify document, no history recording needed
            nextPos = { ...curCaret, column: curCaret.column + 1 };
          } else {
            recordInsert(curCaret, data, curCaret, { line: curCaret.line, column: curCaret.column + data.length }, null, null);
            nextPos = doc.insertText(curCaret, data);
          }
        }
        state.caret = nextPos; state.anchor = null;
        const s = doc.toString(); setText(s); textRef.current = s;
        setCaret(nextPos); caretRef.current = nextPos;
        paintRef.current?.();
        // maybe trigger completions for wordy characters
  if (/^[A-Za-z@#\.]$/.test(data)) triggerCompletion.current?.();
      } else if (type === "insertLineBreak") {
        const curCaret = caretRef.current;
        const curAnchor = anchorRef.current;
        cancelSnippetSession();
        let nextPos = curCaret;
        const state = fileStateRef.current; const doc = docRef.current;
        if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
          const oldText = doc.getTextInRange(curAnchor, curCaret);
          recordReplace(curAnchor, curCaret, oldText, "\n", curCaret, { line: curCaret.line + 1, column: 0 }, curAnchor, null);
          nextPos = doc.replaceRange(curAnchor, curCaret, "\n");
          setAnchor(null); anchorRef.current = null;
        } else {
          recordInsert(curCaret, "\n", curCaret, { line: curCaret.line + 1, column: 0 }, null, null);
          nextPos = doc.insertNewline(curCaret);
        }
        state.caret = nextPos; state.anchor = null;
        const s = doc.toString(); setText(s); textRef.current = s;
        setCaret(nextPos); caretRef.current = nextPos;
        paintRef.current?.();
  } else if (type === "deleteContentBackward") {
        const curCaret = caretRef.current;
        const curAnchor = anchorRef.current;
        cancelSnippetSession();
        let nextPos = curCaret;
        const state = fileStateRef.current; const doc = docRef.current;
        if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
          const deletedText = doc.getTextInRange(curAnchor, curCaret);
          const normalizedStart = curAnchor.line < curCaret.line || (curAnchor.line === curCaret.line && curAnchor.column < curCaret.column) ? curAnchor : curCaret;
          const normalizedEnd = curAnchor.line > curCaret.line || (curAnchor.line === curCaret.line && curAnchor.column > curCaret.column) ? curAnchor : curCaret;
          recordDelete(normalizedStart, normalizedEnd, deletedText, curCaret, normalizedStart, curAnchor, null);
          nextPos = doc.deleteRange(curAnchor, curCaret);
          setAnchor(null); anchorRef.current = null;
        } else {
          // Calculate what will be deleted for single-char backspace
          if (curCaret.column > 0) {
            const lineText = textRef.current.split("\n")[curCaret.line] ?? "";
            const deletedChar = lineText[curCaret.column - 1];
            recordDelete({ line: curCaret.line, column: curCaret.column - 1 }, curCaret, deletedChar, curCaret, { line: curCaret.line, column: curCaret.column - 1 }, null, null);
          } else if (curCaret.line > 0) {
            const prevLineText = textRef.current.split("\n")[curCaret.line - 1] ?? "";
            recordDelete({ line: curCaret.line - 1, column: prevLineText.length }, curCaret, "\n", curCaret, { line: curCaret.line - 1, column: prevLineText.length }, null, null);
          }
          nextPos = doc.deleteBackward(curCaret);
        }
        state.caret = nextPos; state.anchor = null;
        const s = doc.toString(); setText(s); textRef.current = s;
        setCaret(nextPos); caretRef.current = nextPos;
        paintRef.current?.();
  } else if (type === "deleteContentForward") {
        const curCaret = caretRef.current;
        const curAnchor = anchorRef.current;
        cancelSnippetSession();
        let nextPos = curCaret;
        const state = fileStateRef.current; const doc = docRef.current;
        if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
          const deletedText = doc.getTextInRange(curAnchor, curCaret);
          const normalizedStart = curAnchor.line < curCaret.line || (curAnchor.line === curCaret.line && curAnchor.column < curCaret.column) ? curAnchor : curCaret;
          const normalizedEnd = curAnchor.line > curCaret.line || (curAnchor.line === curCaret.line && curAnchor.column > curCaret.column) ? curAnchor : curCaret;
          recordDelete(normalizedStart, normalizedEnd, deletedText, curCaret, normalizedStart, curAnchor, null);
          nextPos = doc.deleteRange(curAnchor, curCaret);
          setAnchor(null); anchorRef.current = null;
        } else {
          // Calculate what will be deleted for single-char forward delete
          const linesArr = textRef.current.split("\n");
          const lineText = linesArr[curCaret.line] ?? "";
          if (curCaret.column < lineText.length) {
            const deletedChar = lineText[curCaret.column];
            recordDelete(curCaret, { line: curCaret.line, column: curCaret.column + 1 }, deletedChar, curCaret, curCaret, null, null);
          } else if (curCaret.line < linesArr.length - 1) {
            recordDelete(curCaret, { line: curCaret.line + 1, column: 0 }, "\n", curCaret, curCaret, null, null);
          }
          nextPos = doc.deleteForward(curCaret);
        }
        state.caret = nextPos; state.anchor = null;
        const s = doc.toString(); setText(s); textRef.current = s;
        setCaret(nextPos); caretRef.current = nextPos;
        paintRef.current?.();
      }
      // Ensure DOM content remains empty (canvas is source of truth)
      if (container) {
        container.textContent = "";
      }
    };

  const onCompositionStart = () => {
      // IME composition start (we'll paint composition overlay later)
      // console.log("compositionstart", e.data);
    };

  const onCompositionEnd = () => {
      // console.log("compositionend", e.data);
    };

    // Map pixel x to column by measuring cumulative width
    const measureColumn = (ctx: CanvasRenderingContext2D, lineText: string, x: number, textStartX: number) => {
      let col = 0;
      let acc = textStartX;
      for (let i = 0; i < lineText.length; i++) {
        const w = ctx.measureText(lineText[i]).width;
        if (acc + w / 2 >= x) {
          col = i;
          break;
        }
        acc += w;
        col = i + 1;
      }
      return col;
    };

    // Scroll handling
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      
      const { lineHeight, pad } = readSizing(container);
      const linesArr = textRef.current.split("\n");
      const viewportH = container.clientHeight || 0;
      
      // Calculate content height considering word wrap if enabled
      const currentWrapInfo = wrapInfoRef.current;
      const totalDisplayLines = currentWrapInfo ? currentWrapInfo.totalRows : linesArr.length;
      const contentH = calculateContentHeight(totalDisplayLines, lineHeight, pad);
      
      if (contentH <= viewportH) return; // No scrolling needed
      
      const maxScroll = Math.max(0, contentH - viewportH);
      const newScrollTop = Math.max(0, Math.min(maxScroll, scrollTopRef.current + e.deltaY));
      
      // Update both state and ref immediately
      scrollTopRef.current = newScrollTop;
      setScrollTop(newScrollTop);
      paintRef.current?.();
    };

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      container.focus();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
  const { textFontSize, lineNumberFontSize, lineHeight, pad, gutterExtra } = readSizing(container);
      
      // Check if click is on scrollbar
      const linesArr = textRef.current.split("\n");
      const viewportH = container.clientHeight || 0;
      
      // Calculate content height considering word wrap if enabled
      const currentWrapInfo = wrapInfoRef.current;
      const totalDisplayLines = currentWrapInfo ? currentWrapInfo.totalRows : linesArr.length;
      const contentH = calculateContentHeight(totalDisplayLines, lineHeight, pad);
      
      if (contentH > viewportH) {
        const scrollbarWidth = 12;
        const scrollbarX = rect.width - scrollbarWidth - 4;
        
        if (x >= scrollbarX) {
          // Click on scrollbar
          const scrollbarInfo = calculateScrollbar(contentH, viewportH, scrollTopRef.current, 30);
          const newScrollTop = scrollbarYToScrollTop(y, scrollbarInfo, contentH, viewportH);
          
          // Update both state and ref immediately
          scrollTopRef.current = newScrollTop;
          setScrollTop(newScrollTop);
          setIsDraggingScrollbar(true);
          scrollbarDragStartRef.current = { mouseY: y, scrollTop: newScrollTop };
          paintRef.current?.();
          
          const onScrollbarMove = (ev: MouseEvent) => {
            if (!scrollbarDragStartRef.current) return;
            const dy = ev.clientY - rect.top - scrollbarDragStartRef.current.mouseY;
            const scrollbarInfo = calculateScrollbar(contentH, viewportH, scrollbarDragStartRef.current.scrollTop, 30);
            const maxScroll = Math.max(0, contentH - viewportH);
            const scrollPerPixel = maxScroll / (viewportH - scrollbarInfo.thumbHeight);
            const newScroll = Math.max(0, Math.min(maxScroll, scrollbarDragStartRef.current.scrollTop + dy * scrollPerPixel));
            
            // Update both state and ref immediately
            scrollTopRef.current = newScroll;
            setScrollTop(newScroll);
            paintRef.current?.();
          };
          
          const onScrollbarUp = () => {
            setIsDraggingScrollbar(false);
            scrollbarDragStartRef.current = null;
            window.removeEventListener("mousemove", onScrollbarMove);
            window.removeEventListener("mouseup", onScrollbarUp);
            paintRef.current?.();
          };
          
          window.addEventListener("mousemove", onScrollbarMove);
          window.addEventListener("mouseup", onScrollbarUp);
          return;
        }
      }
      
  const topOffset = pad;
      const totalLines = textRef.current.split("\n").length;
      const li = Math.max(0, Math.min(Math.floor((y - topOffset + scrollTopRef.current) / lineHeight), totalLines - 1));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

  const TEXT_FONT = `normal ${textFontSize}px ${MONO_FONT_STACK}`;
  const LINE_NUMBER_FONT = `normal ${lineNumberFontSize}px ${MONO_FONT_STACK}`;
  ctx.font = TEXT_FONT;
      const lineText = textRef.current.split("\n")[li] ?? "";

      ctx.save();
  ctx.font = LINE_NUMBER_FONT;
    const maxNumStr_mouse = String(linesArr.length);
    const numW = ctx.measureText(maxNumStr_mouse).width;
      ctx.restore();

    const gutterWidth = Math.ceil(pad + numW + pad + gutterExtra);
      
      // Check if click is in the fold icon area (left side of gutter)
      const foldIconWidth = pad;
      if (x < foldIconWidth) {
        const regionAtLine = activeFile.folding.getRegionStartingAtLine(li);
        if (regionAtLine) {
          activeFile.folding.toggleFold(li);
          paintRef.current?.();
          return; // Don't proceed with text selection
        }
      }
      
      const textStartX = gutterWidth + pad;
      const col = measureColumn(ctx, lineText, x, textStartX);
      const next = { line: li, column: col };
      caretRef.current = next; setCaret(next);
      anchorRef.current = next; setAnchor(next);
  // dismiss overlays
  setCompletions(null); setCompletionPos(null); setHoverTip(null);
      // Capture mousemove for drag selection
      const onMove = (ev: MouseEvent) => {
        const mx = ev.clientX - rect.left;
        const my = ev.clientY - rect.top;
    const lidx = Math.max(0, Math.min(Math.floor((my - topOffset) / lineHeight), textRef.current.split("\n").length - 1));
    const ltxt = textRef.current.split("\n")[lidx] ?? "";
    const mcol = measureColumn(ctx, ltxt, mx, textStartX);
        const n2 = { line: lidx, column: mcol };
        caretRef.current = n2; setCaret(n2);
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        // Collapse selection if no movement
        const a = anchorRef.current;
        const c = caretRef.current;
        if (!a || (a.line === c.line && a.column === c.column)) {
          anchorRef.current = null; setAnchor(null);
        }
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    };

    const onMouseMove = (e: MouseEvent) => {
      // Hover tooltip on Alt+move or after a short dwell
      const doHover = async () => {
        const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext("2d"); if (!ctx) return;
        const rect = canvas.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top;
        const { textFontSize, lineNumberFontSize, lineHeight, pad, gutterExtra } = readSizing(container);
        ctx.font = `normal ${textFontSize}px ${MONO_FONT_STACK}`;
        const linesArr = textRef.current.split("\n");
        ctx.save(); ctx.font = `normal ${lineNumberFontSize}px ${MONO_FONT_STACK}`; const numW = ctx.measureText(String(linesArr.length)).width; ctx.restore();
        const gutterWidth = Math.ceil(pad + numW + pad + gutterExtra);
        const li = Math.max(0, Math.min(Math.floor((y - pad) / lineHeight), linesArr.length - 1));
        const textStartX = gutterWidth + pad;
        const col = measureColumn(ctx, linesArr[li] ?? "", x, textStartX);
        const language = languageId;
        const textSnapshot = textRef.current;
        const position: Position = { line: li, column: col };
        const requestId = ++hoverRequestSeq.current;
        
        // Try LSP first, then fall back to built-in intellisense
        let hv = await requestHover(language, textSnapshot, position);
        if (!hv) {
          hv = await getHover(language, textSnapshot, position);
        }
        
        if (hoverRequestSeq.current !== requestId || language !== languageId) return;
        if (hv && hv.contents) {
          setHoverTip({ x: x + 12, y: pad + li * lineHeight + lineHeight, text: hv.contents });
        } else {
          setHoverTip(null);
        }
      };
      if (e.altKey) {
        doHover();
        return;
      }
      if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = window.setTimeout(() => { doHover(); }, 400);
    };

    container.addEventListener("keydown", onKeyDown);
    container.addEventListener("beforeinput", onBeforeInput as EventListener);
    container.addEventListener("compositionstart", onCompositionStart as EventListener);
    container.addEventListener("compositionend", onCompositionEnd as EventListener);
  container.addEventListener("mousedown", onMouseDown);
  container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("wheel", onWheel, { passive: false });
    // Clipboard handlers so copy/cut/paste work with our canvas-based selection
    const onCopy = (e: ClipboardEvent) => {
      const a = anchorRef.current; const c = caretRef.current;
      if (!a || (a.line === c.line && a.column === c.column)) return; // no selection -> let default (likely nothing)
      e.preventDefault();
      const { start, end } = ((): { start: CaretPos; end: CaretPos } => {
        if (a.line < c.line) return { start: a, end: c };
        if (a.line > c.line) return { start: c, end: a };
        return a.column <= c.column ? { start: a, end: c } : { start: c, end: a };
      })();
      const lines = textRef.current.split("\n");
      let out = "";
      if (start.line === end.line) {
        out = (lines[start.line] ?? "").slice(start.column, end.column);
      } else {
        const first = (lines[start.line] ?? "").slice(start.column);
        const last = (lines[end.line] ?? "").slice(0, end.column);
        const middle = lines.slice(start.line + 1, end.line);
        out = [first, ...middle, last].join("\n");
      }
      try { e.clipboardData?.setData('text/plain', out); } catch {}
      try { if (!e.clipboardData && navigator.clipboard) navigator.clipboard.writeText(out); } catch {}
    };
    const onCut = (e: ClipboardEvent) => {
      const a = anchorRef.current; const c = caretRef.current;
      if (!a || (a.line === c.line && a.column === c.column)) return; // no selection
      onCopy(e);
      e.preventDefault();
      const doc = docRef.current;
      const next = doc.deleteRange(a, c);
      const s = doc.toString(); setText(s); textRef.current = s;
      setCaret(next); caretRef.current = next; setAnchor(null); anchorRef.current = null;
    };
    const onPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      const ancBefore = anchorRef.current;
      const curBefore = caretRef.current;
      cancelSnippetSession();
      let data = "";
      try { data = e.clipboardData?.getData('text/plain') || ""; } catch {}
      if (!data) return;
      const doc = docRef.current; const cur = curBefore; const anc = ancBefore;
      const next = anc ? doc.replaceRange(anc, cur, data) : doc.replaceRange(cur, cur, data);
      const s = doc.toString(); setText(s); textRef.current = s;
      setCaret(next); caretRef.current = next; setAnchor(null); anchorRef.current = null;
    };
    container.addEventListener("copy", onCopy as EventListener);
    container.addEventListener("cut", onCut as EventListener);
    container.addEventListener("paste", onPaste as unknown as EventListener);
    // Also handle beforeinput paste for broader coverage
    const onBeforeInputPaste = (e: InputEvent) => {
      const type = (e as InputEvent).inputType as string;
      if (type !== 'insertFromPaste') return;
      e.preventDefault();
      const dt = (e as unknown as { dataTransfer?: DataTransfer }).dataTransfer;
      const txt = dt?.getData('text/plain') ?? '';
      if (!txt) return;
      const anc = anchorRef.current; const cur = caretRef.current;
      const doc = docRef.current;
      const next = anc ? doc.replaceRange(anc, cur, txt) : doc.replaceRange(cur, cur, txt);
      const s = doc.toString(); setText(s); textRef.current = s;
      setCaret(next); caretRef.current = next; setAnchor(null); anchorRef.current = null;
    };
    container.addEventListener("beforeinput", onBeforeInputPaste as EventListener);
    container.tabIndex = 0; // make focusable

    return () => {
      container.removeEventListener("keydown", onKeyDown);
      container.removeEventListener("beforeinput", onBeforeInput as EventListener);
      container.removeEventListener("beforeinput", onBeforeInputPaste as EventListener);
      container.removeEventListener("compositionstart", onCompositionStart as EventListener);
      container.removeEventListener("compositionend", onCompositionEnd as EventListener);
      container.removeEventListener("mousedown", onMouseDown);
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("wheel", onWheel);
  container.removeEventListener("copy", onCopy as EventListener);
  container.removeEventListener("cut", onCut as EventListener);
  container.removeEventListener("paste", onPaste as unknown as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute caret pixel for popup placement
  const measureCaretPixel = (pos: CaretPos): { x: number; y: number; lineHeight: number } => {
    const canvas = canvasRef.current; const container = containerRef.current;
    if (!canvas || !container) return { x: 0, y: 0, lineHeight: 20 };
    const ctx = canvas.getContext("2d"); if (!ctx) return { x: 0, y: 0, lineHeight: 20 };
    const { textFontSize, lineNumberFontSize, lineHeight, pad, gutterExtra } = readSizing(container);
    const linesArr = textRef.current.split("\n");
    ctx.font = `normal ${textFontSize}px ${MONO_FONT_STACK}`;
    ctx.save(); ctx.font = `normal ${lineNumberFontSize}px ${MONO_FONT_STACK}`; const numW = ctx.measureText(String(linesArr.length)).width; ctx.restore();
    const gutterWidth = Math.ceil(pad + numW + pad + gutterExtra);
    const textStartX = gutterWidth + pad;
    const lineText = linesArr[pos.line] ?? "";
    const pre = lineText.slice(0, pos.column);
    const x = textStartX + ctx.measureText(pre).width;
    const y = pad + pos.line * lineHeight;
    return { x, y, lineHeight };
  };

  const triggerCompletion = useRef<((force?: boolean) => void) | null>(null);
  triggerCompletion.current = (force?: boolean) => {
    const language = languageId;
    const caretSnapshot = { ...caretRef.current };
    const caretPosition: Position = { line: caretSnapshot.line, column: caretSnapshot.column };
    const textSnapshot = textRef.current;
    const requestId = ++completionRequestSeq.current;
    void (async () => {
      // Try LSP first
      let items = await requestCompletions(language, textSnapshot, caretPosition);
      
      // If no LSP results or forced, use built-in intellisense
      if ((!items || items.length === 0) || force) {
        const builtinItems = await getContextualCompletions(language, textSnapshot, caretPosition);
        items = builtinItems && builtinItems.length > 0 ? builtinItems : items;
      }
      
      if (completionRequestSeq.current !== requestId || language !== languageId) return;
      if (items && items.length) {
        const pos = measureCaretPixel(caretSnapshot);
        setCompletions(items);
        setCompletionIndex(0);
        setCompletionPos({ x: pos.x, y: pos.y + pos.lineHeight });
      } else {
        setCompletions(null);
        setCompletionPos(null);
      }
    })();
  };

  return (
    <div
      ref={containerRef}
      className="fish-editor h-full w-full overflow-x-hidden outline-none focus:outline-none cursor-default hover:cursor-text focus-within:cursor-text"
      style={{ position: 'relative', overflowY: linesCount > 1 ? 'auto' as const : 'hidden' as const }}
      // Enable input without hidden textarea; plaintext-only to avoid DOM sync
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
    >
      <canvas ref={canvasRef} />
      {/* Completion popup */}
      {completions && completionPos && (
        <div
          className="absolute z-50 max-h-64 overflow-auto min-w-40 text-xs rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 shadow-xl"
          style={{ left: Math.max(0, completionPos.x + 2), top: completionPos.y + 6 }}
        >
          {completions.map((c, i) => (
            <div key={i} className={`px-3 py-1 whitespace-nowrap ${i === completionIndex ? 'bg-black/10 dark:bg-white/10' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); /* prevent blur */ }}
              onMouseEnter={() => setCompletionIndex(i)}
              onClick={() => {
                const item = completions[i];
                  const cur = caretRef.current; const lineText = textRef.current.split("\n")[cur.line] ?? "";
                  let startCol = cur.column; while (startCol > 0 && /[A-Za-z0-9_@#\-]/.test(lineText[startCol - 1])) startCol--;
                  const insert = item.insertText ?? item.label; insertWithSnippet({ line: cur.line, column: startCol }, cur, insert);
                  setCompletions(null); setCompletionPos(null);
              }}
            >
              <span className="opacity-80">{c.label}</span>
              {c.detail ? <span className="ml-2 opacity-50">{c.detail}</span> : null}
            </div>
          ))}
        </div>
      )}
      {/* Hover tooltip */}
      {hoverTip && (
        <div className="absolute z-40 max-w-xs text-xs px-2 py-1 rounded border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 shadow-md"
          style={{ left: hoverTip.x, top: hoverTip.y }}
        >
          {hoverTip.text}
        </div>
      )}
      
      {/* Find/Replace Dialog */}
      <FindReplaceDialog
        visible={findDialogVisible}
        mode={findDialogMode}
        onClose={() => {
          setFindDialogVisible(false);
          searchHook.clear();
        }}
        onFindNext={(query, options) => {
          searchHook.search(query, options);
          searchHook.findNext();
        }}
        onFindPrevious={(query, options) => {
          searchHook.search(query, options);
          searchHook.findPrevious();
        }}
        onReplace={(query, replacement, options) => {
          searchHook.search(query, options);
          searchHook.replace(replacement);
        }}
        onReplaceAll={(query, replacement, options) => {
          searchHook.search(query, options);
          searchHook.replaceAll(replacement);
        }}
        matchInfo={
          searchHook.totalMatches > 0
            ? { current: currentSearchIndex, total: searchHook.totalMatches }
            : undefined
        }
      />
      
      {/* Word Wrap Indicator */}
      {wordWrapEnabled && (
        <div className="absolute bottom-2 right-2 text-xs px-2 py-1 rounded bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 pointer-events-none">
          Word Wrap: On (Alt+Z to toggle)
        </div>
      )}
    </div>
  );
}
