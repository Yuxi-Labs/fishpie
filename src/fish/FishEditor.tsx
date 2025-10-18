"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { getOrLoadLanguage, languageForFilename } from "@/fish/language/registry";
import type { Token } from "@/fish/language/types";
import { TextDocument } from "@/fish/core/document";

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

export function FishEditor({ projectId, filename, language: langProp, initialText, active = true }: { projectId?: string; filename?: string; language?: string; initialText?: string; active?: boolean }) {
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
  const [text, setText] = useState<string>(activeFile.doc.toString());
  const [languageId, setLanguageId] = useState<string>(langProp ?? languageForFilename(currentName));
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
    setText(next.doc.toString());
    setCaret(next.caret);
    setAnchor(next.anchor);
    caretRef.current = next.caret;
    anchorRef.current = next.anchor;
    textRef.current = next.doc.toString();
    setLanguageId(langProp ?? languageForFilename(nextName));
    paintRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filename, langProp]);

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
      const contentH = Math.max(viewportH, Math.ceil(pad + lines.length * lineHeight + pad));

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
      const styles = getComputedStyle(document.body);
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
          case "keyword": return styles.getPropertyValue("--token-keyword") || "#7c3aed";
          case "type-keyword": return styles.getPropertyValue("--token-type") || "#2563eb";
          case "string": return styles.getPropertyValue("--token-string") || "#16a34a";
          case "comment": return styles.getPropertyValue("--token-comment") || "#9ca3af";
          case "tag": return styles.getPropertyValue("--token-tag") || "#dc2626";
          case "at-rule": return styles.getPropertyValue("--token-atrule") || "#0891b2";
          case "heading": return styles.getPropertyValue("--token-heading") || "#eab308";
          case "inline": return styles.getPropertyValue("--token-inline") || "#d946ef";
          case "scene": return styles.getPropertyValue("--token-scene") || "#0ea5e9";
          case "character": return styles.getPropertyValue("--token-character") || "#22c55e";
          case "dialogue": return styles.getPropertyValue("--token-dialogue") || "#f97316";
          default: return styles.getPropertyValue("--foreground") || "#111";
        }
      };

      let y = pad; // start at top padding
      for (let li = 0; li < linesArr.length; li++) {
        const l = linesArr[li];
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
            ctx.fillStyle = colorFor(t.type);
            ctx.fillText(seg, x, y);
            x += ctx.measureText(seg).width;
          }
          idx = t.range.end.column;
        }
        const rest = l.slice(idx);
        if (rest) {
          ctx.fillStyle = colorFor();
          ctx.fillText(rest, x, y);
        }
        // Draw selection if spans into this line
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
  }, [projectId, text, tokens, caret, anchor, hasSelection]);

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

  // Input handlers using native events (no hidden textarea)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

  const onKeyDown = (e: KeyboardEvent) => {
      // Prevent page scrolling for arrows and space within editor area
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        // Move caret
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
            let nextPos = curCaret;
            if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
              nextPos = activeFile.doc.replaceRange(curAnchor, curCaret, e.key);
              setAnchor(null); anchorRef.current = null;
            } else {
              nextPos = activeFile.doc.insertText(curCaret, e.key);
            }
            activeFile.caret = nextPos; activeFile.anchor = null;
            const s = activeFile.doc.toString(); setText(s); textRef.current = s;
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
            let nextPos = curCaret;
            if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
              nextPos = activeFile.doc.replaceRange(curAnchor, curCaret, "\n");
              setAnchor(null); anchorRef.current = null;
            } else {
              nextPos = activeFile.doc.insertNewline(curCaret);
            }
            activeFile.caret = nextPos; activeFile.anchor = null;
            const s = activeFile.doc.toString(); setText(s); textRef.current = s;
            setCaret(nextPos); caretRef.current = nextPos;
            return;
          }
        }
        if (e.key === "Backspace") {
          if (!beforeInputAvailable) {
            e.preventDefault();
            const curCaret = caretRef.current;
            const curAnchor = anchorRef.current;
            let nextPos = curCaret;
            if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
              nextPos = activeFile.doc.deleteRange(curAnchor, curCaret);
              setAnchor(null); anchorRef.current = null;
            } else {
              nextPos = activeFile.doc.deleteBackward(curCaret);
            }
            activeFile.caret = nextPos; activeFile.anchor = null;
            const s = activeFile.doc.toString(); setText(s); textRef.current = s;
            setCaret(nextPos); caretRef.current = nextPos;
            return;
          }
        }
        if (e.key === "Delete") {
          if (!beforeInputAvailable) {
            e.preventDefault();
            const curCaret = caretRef.current;
            const curAnchor = anchorRef.current;
            let nextPos = curCaret;
            if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
              nextPos = activeFile.doc.deleteRange(curAnchor, curCaret);
              setAnchor(null); anchorRef.current = null;
            } else {
              nextPos = activeFile.doc.deleteForward(curCaret);
            }
            activeFile.caret = nextPos; activeFile.anchor = null;
            const s = activeFile.doc.toString(); setText(s); textRef.current = s;
            setCaret(nextPos); caretRef.current = nextPos;
            return;
          }
        }
        if (e.key === "Tab") {
          e.preventDefault();
          const curCaret = caretRef.current;
          const curAnchor = anchorRef.current;
          let nextPos = curCaret;
          if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
            nextPos = activeFile.doc.replaceRange(curAnchor, curCaret, "\t");
            setAnchor(null); anchorRef.current = null;
          } else {
            nextPos = activeFile.doc.insertText(curCaret, "\t");
          }
          activeFile.caret = nextPos; activeFile.anchor = null;
          const s = activeFile.doc.toString(); setText(s); textRef.current = s;
          setCaret(nextPos); caretRef.current = nextPos;
          return;
        }
        if (e.key === " ") {
          if (!beforeInputAvailable) {
            e.preventDefault();
            const curCaret = caretRef.current;
            const curAnchor = anchorRef.current;
            let nextPos = curCaret;
            if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
              nextPos = activeFile.doc.replaceRange(curAnchor, curCaret, " ");
              setAnchor(null); anchorRef.current = null;
            } else {
              nextPos = activeFile.doc.insertText(curCaret, " ");
            }
            activeFile.caret = nextPos; activeFile.anchor = null;
            const s = activeFile.doc.toString(); setText(s); textRef.current = s;
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
      }
    };

    const onBeforeInput = (e: InputEvent) => {
      beforeInputSeenRef.current = true;
      e.preventDefault();
  const data = e.data;
      const type = (e as InputEvent).inputType as string;
      // Authoritative handling for text editing when available
      if (type === "insertText" && data) {
        const curCaret = caretRef.current;
        const curAnchor = anchorRef.current;
        let nextPos = curCaret;
        if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
          nextPos = activeFile.doc.replaceRange(curAnchor, curCaret, data);
          setAnchor(null); anchorRef.current = null;
        } else {
          nextPos = activeFile.doc.insertText(curCaret, data);
        }
        activeFile.caret = nextPos; activeFile.anchor = null;
        const s = activeFile.doc.toString(); setText(s); textRef.current = s;
        setCaret(nextPos); caretRef.current = nextPos;
      } else if (type === "insertLineBreak") {
        const curCaret = caretRef.current;
        const curAnchor = anchorRef.current;
        let nextPos = curCaret;
        if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
          nextPos = activeFile.doc.replaceRange(curAnchor, curCaret, "\n");
          setAnchor(null); anchorRef.current = null;
        } else {
          nextPos = activeFile.doc.insertNewline(curCaret);
        }
        activeFile.caret = nextPos; activeFile.anchor = null;
        const s = activeFile.doc.toString(); setText(s); textRef.current = s;
        setCaret(nextPos); caretRef.current = nextPos;
      } else if (type === "deleteContentBackward") {
        const curCaret = caretRef.current;
        const curAnchor = anchorRef.current;
        let nextPos = curCaret;
        if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
          nextPos = activeFile.doc.deleteRange(curAnchor, curCaret);
          setAnchor(null); anchorRef.current = null;
        } else {
          nextPos = activeFile.doc.deleteBackward(curCaret);
        }
        activeFile.caret = nextPos; activeFile.anchor = null;
        const s = activeFile.doc.toString(); setText(s); textRef.current = s;
        setCaret(nextPos); caretRef.current = nextPos;
      } else if (type === "deleteContentForward") {
        const curCaret = caretRef.current;
        const curAnchor = anchorRef.current;
        let nextPos = curCaret;
        if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
          nextPos = activeFile.doc.deleteRange(curAnchor, curCaret);
          setAnchor(null); anchorRef.current = null;
        } else {
          nextPos = activeFile.doc.deleteForward(curCaret);
        }
        activeFile.caret = nextPos; activeFile.anchor = null;
        const s = activeFile.doc.toString(); setText(s); textRef.current = s;
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

    container.addEventListener("keydown", onKeyDown);
    container.addEventListener("beforeinput", onBeforeInput as EventListener);
    container.addEventListener("compositionstart", onCompositionStart as EventListener);
    container.addEventListener("compositionend", onCompositionEnd as EventListener);
    container.addEventListener("mousedown", onMouseDown);
    container.tabIndex = 0; // make focusable

    return () => {
      container.removeEventListener("keydown", onKeyDown);
      container.removeEventListener("beforeinput", onBeforeInput as EventListener);
      container.removeEventListener("compositionstart", onCompositionStart as EventListener);
      container.removeEventListener("compositionend", onCompositionEnd as EventListener);
      container.removeEventListener("mousedown", onMouseDown);
    };
  }, []);

  return (
    <div
      ref={containerRef}
  className="fish-editor h-full w-full overflow-x-hidden overflow-y-auto outline-none focus:outline-none cursor-default hover:cursor-text focus-within:cursor-text"
      // Enable input without hidden textarea; plaintext-only to avoid DOM sync
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
