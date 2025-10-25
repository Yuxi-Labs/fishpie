/**
 * Main text and token painting logic
 */

import type { Token } from "../language/types";
import type { CaretPos } from "../core/types";
import type { TokenColorResolver } from "./colors";
import { MONO_FONT_STACK } from "./canvas";

export type PaintLineConfig = {
  ctx: CanvasRenderingContext2D;
  lineText: string;
  lineIndex: number;
  y: number;
  textStartX: number;
  lineHeight: number;
  textFontSize: number;
  tokens: Token[];
  colorResolver: TokenColorResolver;
  selection?: {
    anchor: CaretPos;
    caret: CaretPos;
    backgroundColor: string;
  };
};

/**
 * Paint a single line of text with syntax highlighting and selection
 */
export function paintLine(config: PaintLineConfig): void {
  const { ctx, lineText, lineIndex, y, textStartX, lineHeight, textFontSize, tokens, colorResolver, selection } = config;

  const TEXT_FONT = `normal ${textFontSize}px ${MONO_FONT_STACK}`;

  // Draw selection background first
  if (selection) {
    const { anchor, caret, backgroundColor } = selection;
    const startLine = Math.min(anchor.line, caret.line);
    const endLine = Math.max(anchor.line, caret.line);

    if (lineIndex >= startLine && lineIndex <= endLine) {
      const startCol = lineIndex === startLine ? Math.min(anchor.column, caret.column) : 0;
      const endCol = lineIndex === endLine ? Math.max(anchor.column, caret.column) : lineText.length;
      const pre = lineText.slice(0, startCol);
      const sel = lineText.slice(startCol, endCol);
      const sx = textStartX + ctx.measureText(pre).width;
      const sw = ctx.measureText(sel).width;
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(sx, y, sw, lineHeight);
    }
  }

  // Paint tokens
  let x = textStartX;
  let idx = 0;
  const lineTokens = tokens
    .filter(t => t.range.start.line === lineIndex)
    .sort((a, b) => a.range.start.column - b.range.start.column);

  for (const token of lineTokens) {
    // Paint text before token
    const pre = lineText.slice(idx, token.range.start.column);
    if (pre) {
      ctx.fillStyle = colorResolver();
      ctx.fillText(pre, x, y);
      x += ctx.measureText(pre).width;
    }

    // Paint token
    const seg = lineText.slice(token.range.start.column, token.range.end.column);
    if (seg) {
      // Apply font styles for specific tokens
      const baseFont = TEXT_FONT;
      if (token.type === "comment" || token.type === "blockquote") {
        ctx.font = `italic ${baseFont.replace(/^normal\s+/, "")}`;
      } else if (token.type === "heading") {
        ctx.font = `bold ${baseFont.replace(/^normal\s+/, "")}`;
      } else {
        ctx.font = baseFont;
      }

      // Draw color swatch for CSS color tokens
      if (token.type === "color") {
        const swatchSize = 10;
        const swatchY = y + (lineHeight - swatchSize) / 2;
        ctx.fillStyle = seg;
        ctx.fillRect(x, swatchY, swatchSize, swatchSize);
        x += swatchSize + 6;
      }

      ctx.fillStyle = colorResolver(token.type);
      ctx.fillText(seg, x, y);
      x += ctx.measureText(seg).width;

      // Reset font
      ctx.font = baseFont;
    }

    idx = token.range.end.column;
  }

  // Paint remaining text
  const rest = lineText.slice(idx);
  if (rest) {
    ctx.fillStyle = colorResolver();
    ctx.fillText(rest, x, y);
  }
}

/**
 * Calculate content dimensions for canvas sizing
 */
export function calculateContentDimensions(config: {
  ctx: CanvasRenderingContext2D;
  lines: string[];
  gutterWidth: number;
  pad: number;
  lineHeight: number;
  viewportWidth: number;
  viewportHeight: number;
}): { width: number; height: number } {
  const { ctx, lines, gutterWidth, pad, lineHeight, viewportWidth, viewportHeight } = config;

  // Calculate max text width
  let maxTextW = 0;
  for (const line of lines) {
    const w = ctx.measureText(line).width;
    if (w > maxTextW) maxTextW = w;
  }

  const contentW = Math.max(
    viewportWidth,
    Math.ceil(gutterWidth + pad + maxTextW + pad)
  );

  // Provide bottom overscroll for 2+ lines
  const extraScroll =
    lines.length > 1
      ? Math.max(Math.ceil(lineHeight * 2), Math.ceil(viewportHeight * 0.4))
      : 0;
  const minViewportH = viewportHeight + extraScroll;
  const contentH = Math.max(
    minViewportH,
    Math.ceil(pad + lines.length * lineHeight + pad)
  );

  return { width: contentW, height: contentH };
}
