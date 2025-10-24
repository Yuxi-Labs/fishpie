"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { getOrLoadLanguage, languageForFilename } from "@/fish/language/registry";
import type { Token, CompletionItem, Position } from "@/fish/language/types";
import { TextDocument } from "@/fish/core/document";
import { autoPairDecision } from "@/fish/core/pairs";
import { requestCompletions, requestHover } from "@/fish/language/lspClient";
import { getContextualCompletions, getHover } from "@/fish/language/intellisense";

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
type FileState = { doc: TextDocument; caret: CaretPos; anchor: CaretPos | null };

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
      s = { doc: new TextDocument(initialText ?? ""), caret: { line: 0, column: 0 }, anchor: null };
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

  // Caret blink handling via repaint timer
  const blinkRef = useRef(true);
  const paintRef = useRef<(() => void) | null>(null);
  const focusedRef = useRef<boolean>(false);
  const [, setFocused] = useState(false);
  const activeRef = useRef<boolean>(active);
  useEffect(() => { activeRef.current = active; paintRef.current?.(); }, [active]);

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
    })();
    return () => { cancelled = true; };
  }, [languageId, text]);

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
  const { textFontSize, lineNumberFontSize, lineHeight, pad, gutterExtra } = readSizing(container);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const TEXT_FONT = `normal ${textFontSize}px ${MONO_FONT_STACK}`;
  const LINE_NUMBER_FONT = `normal ${lineNumberFontSize}px ${MONO_FONT_STACK}`;
  ctx.font = TEXT_FONT;
  const lines = textRef.current.split(/\n/);

  ctx.save();
  ctx.font = LINE_NUMBER_FONT;
  const maxNumStr = String(lines.length);
  const numW = ctx.measureText(maxNumStr).width;
  ctx.restore();

  const gutterWidth = Math.ceil(pad + numW + pad + gutterExtra);

      let maxTextW = 0;
      for (const l of lines) {
        const w = ctx.measureText(l).width;
        if (w > maxTextW) maxTextW = w;
      }

      const contentW = Math.max(viewportW, Math.ceil(gutterWidth + pad + maxTextW + pad));
  // Provide bottom overscroll so scrolling is meaningful once there are 2+ lines
  // Use ~40% of viewport height (like scrollBeyondLastLine) with a minimum of ~2 lines
  const extraScroll = lines.length > 1 ? Math.max(Math.ceil(lineHeight * 2), Math.ceil(viewportH * 0.4)) : 0;
  const minViewportH = viewportH + extraScroll;
  const contentH = Math.max(minViewportH, Math.ceil(pad + lines.length * lineHeight + pad));

      canvas.width = Math.floor(contentW * dpr);
      canvas.height = Math.floor(contentH * dpr);
      canvas.style.width = `${contentW}px`;
      canvas.style.height = `${contentH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint();
    };

    const paint = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
  // Read token colors from the editor container to respect scoped variables/themes
  const styles = getComputedStyle(containerRef.current ?? document.body);
      ctx.fillStyle = styles.getPropertyValue("--background") || "#fff";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = styles.getPropertyValue("--foreground") || "#111";
  const { textFontSize, lineNumberFontSize, lineHeight, pad, gutterExtra, caretWidth } = readSizing(containerRef.current);

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

      // Caret sizing — use line height for a full-height, normal caret
      const caretHeight = Math.max(1, lineHeight - 4);
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
      for (let i = 0; i < linesArr.length; i++) {
        const cy = pad + i * lineHeight + lineHeight / 2;
        ctx.fillText(String(i + 1), gutterWidth / 2, cy);
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

      let y = pad; // start at top padding
      for (let li = 0; li < linesArr.length; li++) {
        const l = linesArr[li];
        // Draw selection background first so text remains readable above it
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
        // naive: paint tokens for this line by slicing ranges
        let x = textStartX;
        let idx = 0;
        const lineTokens = tokens.filter(t => t.range.start.line === li);
        for (const t of lineTokens.sort((a,b) => a.range.start.column - b.range.start.column)) {
          const pre = l.slice(idx, t.range.start.column);
          if (pre) {
            ctx.fillStyle = colorFor();
            ctx.fillText(pre, x, y);
            x += ctx.measureText(pre).width;
          }
          const seg = l.slice(t.range.start.column, t.range.end.column);
          if (seg) {
            // Style tweaks per token
            const baseFont = TEXT_FONT;
            if (t.type === 'comment' || t.type === 'blockquote') {
              ctx.font = `italic ${baseFont.replace(/^normal\s+/, '')}`;
            } else if (t.type === 'heading') {
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
            ctx.fillStyle = colorFor(t.type);
            ctx.fillText(seg, x, y);
            x += ctx.measureText(seg).width;
            // reset font
            ctx.font = baseFont;
          }
          idx = t.range.end.column;
        }
        const rest = l.slice(idx);
        if (rest) {
          ctx.fillStyle = colorFor();
          ctx.fillText(rest, x, y);
        }
        
        // Draw caret if on this line
        if (activeRef.current && focusedRef.current && caret.line === li && blinkRef.current) {
          const caretText = l.slice(0, caret.column);
          const cx = textStartX + ctx.measureText(caretText).width;
          ctx.fillStyle = styles.getPropertyValue("--foreground") || "#111";
          ctx.fillRect(cx, y + caretYOffset, caretWidth, caretHeight);
        }
        y += lineHeight;
      }
    };
    paintRef.current = paint;

  const ro = new ResizeObserver(resize);
  if (containerRef.current) ro.observe(containerRef.current);
    resize();

    return () => {
      ro.disconnect();
    };
  }, [projectId, text, tokens, caret, anchor, hasSelection, completions, completionIndex, languageId]);

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

  // Keep caret visible by adjusting scroll position when it moves
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ensureCaretVisible = () => {
      const pos = { ...caretRef.current };
      const { y, lineHeight } = measureCaretPixel(pos);
      const margin = Math.ceil(lineHeight * 0.5);
      const top = y;
      const bottom = y + lineHeight;
      const viewTop = el.scrollTop;
      const viewBottom = el.scrollTop + el.clientHeight;
      if (bottom + margin > viewBottom) {
        el.scrollTop = bottom + margin - el.clientHeight;
      } else if (top - margin < viewTop) {
        el.scrollTop = Math.max(0, top - margin);
      }
    };
    // run after paint/layout
    const id = requestAnimationFrame(ensureCaretVisible);
    return () => cancelAnimationFrame(id);
  }, [caret]);

  // Input handlers using native events (no hidden textarea)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

  const onKeyDown = (e: KeyboardEvent) => {
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
                nextPos = doc.replaceRange(curAnchor, curCaret, e.key + decision.close);
                nextPos = { line: nextPos.line, column: nextPos.column - decision.close.length };
              } else {
                // On selection, never skip; always replace with typed char
                nextPos = doc.replaceRange(curAnchor, curCaret, e.key);
              }
              setAnchor(null); anchorRef.current = null;
            } else {
              if (decision.kind === 'pair') {
                const after = doc.insertText(curCaret, e.key + decision.close);
                nextPos = { line: after.line, column: after.column - decision.close.length };
              } else if (decision.kind === 'skip') {
                nextPos = { ...curCaret, column: curCaret.column + 1 };
              } else {
                nextPos = doc.insertText(curCaret, e.key);
              }
            }
            state.caret = nextPos; state.anchor = null;
            const s = doc.toString(); setText(s); textRef.current = s;
            setCaret(nextPos); caretRef.current = nextPos;
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
              nextPos = doc.replaceRange(curAnchor, curCaret, "\n");
              setAnchor(null); anchorRef.current = null;
            } else {
              nextPos = doc.insertNewline(curCaret);
            }
            state.caret = nextPos; state.anchor = null;
            const s = doc.toString(); setText(s); textRef.current = s;
            setCaret(nextPos); caretRef.current = nextPos;
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
              nextPos = doc.deleteRange(curAnchor, curCaret);
              setAnchor(null); anchorRef.current = null;
            } else {
              nextPos = doc.deleteBackward(curCaret);
            }
            state.caret = nextPos; state.anchor = null;
            const s = doc.toString(); setText(s); textRef.current = s;
            setCaret(nextPos); caretRef.current = nextPos;
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
              nextPos = doc.deleteRange(curAnchor, curCaret);
              setAnchor(null); anchorRef.current = null;
            } else {
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
            nextPos = doc.replaceRange(curAnchor, curCaret, "\t");
            setAnchor(null); anchorRef.current = null;
          } else {
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
              nextPos = doc.replaceRange(curAnchor, curCaret, " ");
              setAnchor(null); anchorRef.current = null;
            } else {
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
            nextPos = doc.replaceRange(curAnchor, curCaret, data + decision.close);
            nextPos = { line: nextPos.line, column: nextPos.column - decision.close.length };
          } else {
            // On selection, never skip; always replace with typed text
            nextPos = doc.replaceRange(curAnchor, curCaret, data);
          }
          setAnchor(null); anchorRef.current = null;
        } else {
          if (decision.kind === 'pair') {
            const after = doc.insertText(curCaret, data + decision.close);
            nextPos = { line: after.line, column: after.column - decision.close.length };
          } else if (decision.kind === 'skip') {
            nextPos = { ...curCaret, column: curCaret.column + 1 };
          } else {
            nextPos = doc.insertText(curCaret, data);
          }
        }
        state.caret = nextPos; state.anchor = null;
        const s = doc.toString(); setText(s); textRef.current = s;
        setCaret(nextPos); caretRef.current = nextPos;
        // maybe trigger completions for wordy characters
  if (/^[A-Za-z@#\.]$/.test(data)) triggerCompletion.current?.();
      } else if (type === "insertLineBreak") {
        const curCaret = caretRef.current;
        const curAnchor = anchorRef.current;
        cancelSnippetSession();
        let nextPos = curCaret;
        const state = fileStateRef.current; const doc = docRef.current;
        if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
          nextPos = doc.replaceRange(curAnchor, curCaret, "\n");
          setAnchor(null); anchorRef.current = null;
        } else {
          nextPos = doc.insertNewline(curCaret);
        }
        state.caret = nextPos; state.anchor = null;
        const s = doc.toString(); setText(s); textRef.current = s;
        setCaret(nextPos); caretRef.current = nextPos;
  } else if (type === "deleteContentBackward") {
        const curCaret = caretRef.current;
        const curAnchor = anchorRef.current;
        cancelSnippetSession();
        let nextPos = curCaret;
        const state = fileStateRef.current; const doc = docRef.current;
        if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
          nextPos = doc.deleteRange(curAnchor, curCaret);
          setAnchor(null); anchorRef.current = null;
        } else {
          nextPos = doc.deleteBackward(curCaret);
        }
        state.caret = nextPos; state.anchor = null;
        const s = doc.toString(); setText(s); textRef.current = s;
        setCaret(nextPos); caretRef.current = nextPos;
  } else if (type === "deleteContentForward") {
        const curCaret = caretRef.current;
        const curAnchor = anchorRef.current;
        cancelSnippetSession();
        let nextPos = curCaret;
        const state = fileStateRef.current; const doc = docRef.current;
        if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
          nextPos = doc.deleteRange(curAnchor, curCaret);
          setAnchor(null); anchorRef.current = null;
        } else {
          nextPos = doc.deleteForward(curCaret);
        }
        state.caret = nextPos; state.anchor = null;
        const s = doc.toString(); setText(s); textRef.current = s;
        setCaret(nextPos); caretRef.current = nextPos;
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

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      container.focus();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
  const { textFontSize, lineNumberFontSize, lineHeight, pad, gutterExtra } = readSizing(container);
  const topOffset = pad;
      const totalLines = textRef.current.split("\n").length;
      const li = Math.max(0, Math.min(Math.floor((y - topOffset) / lineHeight), totalLines - 1));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

  const TEXT_FONT = `normal ${textFontSize}px ${MONO_FONT_STACK}`;
  const LINE_NUMBER_FONT = `normal ${lineNumberFontSize}px ${MONO_FONT_STACK}`;
  ctx.font = TEXT_FONT;
      const lineText = textRef.current.split("\n")[li] ?? "";

      const linesArr = textRef.current.split(/\n/);
      ctx.save();
  ctx.font = LINE_NUMBER_FONT;
    const maxNumStr_mouse = String(linesArr.length);
    const numW = ctx.measureText(maxNumStr_mouse).width;
      ctx.restore();

    const gutterWidth = Math.ceil(pad + numW + pad + gutterExtra);
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
    </div>
  );
}
