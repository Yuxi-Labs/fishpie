"use client";
import { useEffect, useRef, useState } from "react";
import { getOrLoadLanguage, languageForFilename } from "@/fish/language/registry";
import type { Token } from "@/fish/language/types";
import { TextDocument } from "@/fish/core/document";

export function FishEditor({ projectId, filename, language: langProp, initialText }: { projectId?: string; filename?: string; language?: string; initialText?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [doc] = useState(() => new TextDocument(initialText ?? ""));
  const [text, setText] = useState<string>(doc.toString());
  const [languageId, setLanguageId] = useState<string>(langProp ?? languageForFilename(filename));
  const [tokens, setTokens] = useState<Token[]>([]);
  const [caret, setCaret] = useState<{ line: number; column: number }>({ line: 0, column: 0 });
  const [anchor, setAnchor] = useState<{ line: number; column: number } | null>(null);
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

  useEffect(() => {
    setLanguageId(langProp ?? languageForFilename(filename));
  }, [langProp, filename]);

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
    containerRef.current?.focus();
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

      // Compute content dimensions from text metrics
      const lineHeight = 20;
      const pad = 12;
      const titleH = pad + 20;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = "14px var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace)";
      const lines = textRef.current.split(/\n/);
      let maxTextW = 0;
      for (const l of lines) {
        const w = ctx.measureText(l).width;
        if (w > maxTextW) maxTextW = w;
      }
      const contentW = Math.max(viewportW, Math.ceil(pad + maxTextW + pad));
      const contentH = Math.max(viewportH, Math.ceil(titleH + lines.length * lineHeight + pad));

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
      const lineHeight = 20;
      const pad = 12;
      ctx.font = "14px var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace)";
      ctx.textBaseline = "top";

      // Draw title
      ctx.fillText(`Fish Editor — ${projectId ?? "untitled"}`, pad, pad);

      // Draw content (simple single-line display with token colors)
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

      const lines = text.split(/\n/);
      let y = pad + 20; // below title
      for (let li = 0; li < lines.length; li++) {
        const l = lines[li];
        // naive: paint tokens for this line by slicing ranges
        let x = pad;
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
            const sx = pad + ctx.measureText(pre).width;
            const sw = ctx.measureText(sel).width;
            ctx.fillStyle = styles.getPropertyValue("--selection-bg") || "rgba(100,150,240,0.25)";
            ctx.fillRect(sx, y, sw, lineHeight);
          }
        }
        // Draw caret if on this line
        if (caret.line === li && blinkRef.current) {
          const caretText = l.slice(0, caret.column);
          const cx = pad + ctx.measureText(caretText).width;
          ctx.fillStyle = styles.getPropertyValue("--foreground") || "#111";
          ctx.fillRect(cx, y, 2, lineHeight);
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
  }, [projectId, text, tokens, caret, anchor]);

  // Blink timer: toggle visibility and repaint without re-binding the paint effect
  useEffect(() => {
    const id = setInterval(() => {
      blinkRef.current = !blinkRef.current;
      paintRef.current?.();
    }, 530);
    return () => clearInterval(id);
  }, []);

  // Reset blink when caret or text changes
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
          if (e.shiftKey) setAnchor(a => a ?? { ...caret });
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
          if (e.shiftKey) setAnchor(a => a ?? { ...caret });
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
          if (e.shiftKey) setAnchor(a => a ?? { ...caret });
          else setAnchor(null);
          const cur = caretRef.current;
          if (cur.line > 0) {
            const prevText = linesArr[cur.line - 1] ?? "";
            const next = { line: cur.line - 1, column: Math.min(cur.column, prevText.length) };
            caretRef.current = next; setCaret(next);
          }
        }
        if (e.key === "ArrowDown") {
          if (e.shiftKey) setAnchor(a => a ?? { ...caret });
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
              nextPos = doc.replaceRange(curAnchor, curCaret, e.key);
              setAnchor(null); anchorRef.current = null;
            } else {
              nextPos = doc.insertText(curCaret, e.key);
            }
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
            let nextPos = curCaret;
            if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
              nextPos = doc.replaceRange(curAnchor, curCaret, "\n");
              setAnchor(null); anchorRef.current = null;
            } else {
              nextPos = doc.insertNewline(curCaret);
            }
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
            let nextPos = curCaret;
            if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
              nextPos = doc.deleteRange(curAnchor, curCaret);
              setAnchor(null); anchorRef.current = null;
            } else {
              nextPos = doc.deleteBackward(curCaret);
            }
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
            let nextPos = curCaret;
            if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
              nextPos = doc.deleteRange(curAnchor, curCaret);
              setAnchor(null); anchorRef.current = null;
            } else {
              nextPos = doc.deleteForward(curCaret);
            }
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
          if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
            nextPos = doc.replaceRange(curAnchor, curCaret, "\t");
            setAnchor(null); anchorRef.current = null;
          } else {
            nextPos = doc.insertText(curCaret, "\t");
          }
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
            if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
              nextPos = doc.replaceRange(curAnchor, curCaret, " ");
              setAnchor(null); anchorRef.current = null;
            } else {
              nextPos = doc.insertText(curCaret, " ");
            }
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
          nextPos = doc.replaceRange(curAnchor, curCaret, data);
          setAnchor(null); anchorRef.current = null;
        } else {
          nextPos = doc.insertText(curCaret, data);
        }
        const s = doc.toString(); setText(s); textRef.current = s;
        setCaret(nextPos); caretRef.current = nextPos;
      } else if (type === "insertLineBreak") {
        const curCaret = caretRef.current;
        const curAnchor = anchorRef.current;
        let nextPos = curCaret;
        if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
          nextPos = doc.replaceRange(curAnchor, curCaret, "\n");
          setAnchor(null); anchorRef.current = null;
        } else {
          nextPos = doc.insertNewline(curCaret);
        }
        const s = doc.toString(); setText(s); textRef.current = s;
        setCaret(nextPos); caretRef.current = nextPos;
      } else if (type === "deleteContentBackward") {
        const curCaret = caretRef.current;
        const curAnchor = anchorRef.current;
        let nextPos = curCaret;
        if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
          nextPos = doc.deleteRange(curAnchor, curCaret);
          setAnchor(null); anchorRef.current = null;
        } else {
          nextPos = doc.deleteBackward(curCaret);
        }
        const s = doc.toString(); setText(s); textRef.current = s;
        setCaret(nextPos); caretRef.current = nextPos;
      } else if (type === "deleteContentForward") {
        const curCaret = caretRef.current;
        const curAnchor = anchorRef.current;
        let nextPos = curCaret;
        if (curAnchor && (curAnchor.line !== curCaret.line || curAnchor.column !== curCaret.column)) {
          nextPos = doc.deleteRange(curAnchor, curCaret);
          setAnchor(null); anchorRef.current = null;
        } else {
          nextPos = doc.deleteForward(curCaret);
        }
        const s = doc.toString(); setText(s); textRef.current = s;
        setCaret(nextPos); caretRef.current = nextPos;
      }
      // Ensure DOM content remains empty (canvas is source of truth)
      if (container) {
        container.textContent = "";
      }
    };

    const onCompositionStart = (e: CompositionEvent) => {
      // IME composition start (we'll paint composition overlay later)
      // console.log("compositionstart", e.data);
    };

    const onCompositionEnd = (e: CompositionEvent) => {
      // console.log("compositionend", e.data);
    };

    // Map pixel x to column by measuring cumulative width
    const measureColumn = (ctx: CanvasRenderingContext2D, lineText: string, x: number, pad: number) => {
      let col = 0;
      let acc = pad;
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
      const pad = 12;
      const titleH = pad + 20;
      const lineHeight = 20;
      const li = Math.max(0, Math.min(Math.floor((y - titleH) / lineHeight), textRef.current.split("\n").length - 1));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.font = "14px var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace)";
      const lineText = textRef.current.split("\n")[li] ?? "";
      const col = measureColumn(ctx, lineText, x, pad);
      const next = { line: li, column: col };
      caretRef.current = next; setCaret(next);
      anchorRef.current = next; setAnchor(next);
      // Capture mousemove for drag selection
      const onMove = (ev: MouseEvent) => {
        const mx = ev.clientX - rect.left;
        const my = ev.clientY - rect.top;
        const lidx = Math.max(0, Math.min(Math.floor((my - titleH) / lineHeight), textRef.current.split("\n").length - 1));
        const ltxt = textRef.current.split("\n")[lidx] ?? "";
        const mcol = measureColumn(ctx, ltxt, mx, pad);
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
      className="h-full w-full overflow-hidden hover:overflow-auto focus-within:overflow-auto outline-none focus:outline-none"
      // Enable input without hidden textarea; plaintext-only to avoid DOM sync
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
