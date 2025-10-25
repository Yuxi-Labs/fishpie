/**
 * Mouse position utilities for canvas-based editor
 */

import type { CaretPos } from "../core/types";

export type MousePositionConfig = {
  clientX: number;
  clientY: number;
  canvasRect: DOMRect;
  gutterWidth: number;
  textStartX: number;
  pad: number;
  lineHeight: number;
  lines: string[];
  ctx: CanvasRenderingContext2D;
};

/**
 * Convert mouse client coordinates to caret position
 */
export function clientToCaret(config: MousePositionConfig): CaretPos | null {
  const { clientX, clientY, canvasRect, gutterWidth, textStartX, pad, lineHeight, lines, ctx } = config;

  const x = clientX - canvasRect.left;
  const y = clientY - canvasRect.top;

  // Click must be in text area (not gutter)
  if (x < gutterWidth) return null;

  // Calculate line
  const lineIndex = Math.floor((y - pad) / lineHeight);
  if (lineIndex < 0 || lineIndex >= lines.length) return null;

  const lineText = lines[lineIndex];
  const relX = x - textStartX;

  // Binary search for column position
  let bestCol = 0;
  let bestDist = Infinity;

  for (let i = 0; i <= lineText.length; i++) {
    const substr = lineText.slice(0, i);
    const w = ctx.measureText(substr).width;
    const dist = Math.abs(w - relX);
    if (dist < bestDist) {
      bestDist = dist;
      bestCol = i;
    }
  }

  return { line: lineIndex, column: bestCol };
}

/**
 * Calculate caret pixel position from caret coords
 */
export function caretToPixel(config: {
  caret: CaretPos;
  lines: string[];
  textStartX: number;
  pad: number;
  lineHeight: number;
  ctx: CanvasRenderingContext2D;
}): { x: number; y: number } {
  const { caret, lines, textStartX, pad, lineHeight, ctx } = config;

  const lineText = lines[caret.line] ?? "";
  const textBefore = lineText.slice(0, caret.column);
  const x = textStartX + ctx.measureText(textBefore).width;
  const y = pad + caret.line * lineHeight;

  return { x, y };
}
