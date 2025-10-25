/**
 * Line number rendering (gutter)
 */

import { MONO_FONT_STACK } from "./canvas";

export type GutterConfig = {
  pad: number;
  gutterExtra: number;
  lineNumberFontSize: number;
  lineCount: number;
};

/**
 * Calculate gutter width based on line count
 */
export function calculateGutterWidth(
  ctx: CanvasRenderingContext2D,
  config: GutterConfig
): number {
  const { pad, gutterExtra, lineNumberFontSize, lineCount } = config;

  ctx.save();
  ctx.font = `normal ${lineNumberFontSize}px ${MONO_FONT_STACK}`;
  const maxNumStr = String(lineCount);
  const numW = ctx.measureText(maxNumStr).width;
  ctx.restore();

  return Math.ceil(pad + numW + pad + gutterExtra);
}

/**
 * Render line numbers in the gutter
 */
export function renderGutter(
  ctx: CanvasRenderingContext2D,
  config: {
    gutterWidth: number;
    lineHeight: number;
    pad: number;
    lineNumberFontSize: number;
    lineCount: number;
    canvasHeight: number;
    foregroundColor: string;
  }
): void {
  const { gutterWidth, lineHeight, pad, lineNumberFontSize, lineCount, canvasHeight, foregroundColor } = config;

  ctx.save();

  // Draw gutter separator line
  ctx.fillStyle = foregroundColor;
  ctx.globalAlpha = 0.08;
  ctx.fillRect(gutterWidth, 0, 1, canvasHeight);
  ctx.globalAlpha = 1;

  // Draw line numbers
  ctx.font = `normal ${lineNumberFontSize}px ${MONO_FONT_STACK}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = foregroundColor;

  for (let i = 0; i < lineCount; i++) {
    const cy = pad + i * lineHeight + lineHeight / 2;
    ctx.fillText(String(i + 1), gutterWidth / 2, cy);
  }

  ctx.restore();
}
