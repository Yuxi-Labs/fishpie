/**
 * Canvas sizing utilities - reads CSS variables and configures canvas for HiDPI
 */

import type { EditorSizing } from "../core/types";

export const MONO_FONT_STACK =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

export const DEFAULTS = {
  textFontSize: 18, // px
  lineNumberFontSize: 22, // px
  lineHeight: 28, // px
  caretWidth: 2, // px
  pad: 16, // general padding
  gutterExtra: 12, // extra pixels to widen gutter beyond digit measure
};

/**
 * Read CSS variables from the container element to determine sizing
 */
export function readSizing(el: HTMLElement | null): EditorSizing {
  const styles = getComputedStyle(el ?? document.body);
  const rootFontPx = parseFloat(
    getComputedStyle(document.documentElement).fontSize || "16"
  );

  const parseLength = (
    value: string | null | undefined,
    fallback: number
  ): number => {
    const raw = (value ?? "").trim();
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

  return {
    textFontSize: parseLength(
      styles.getPropertyValue("--fish-text-font-size"),
      DEFAULTS.textFontSize
    ),
    lineNumberFontSize: parseLength(
      styles.getPropertyValue("--fish-line-number-font-size"),
      DEFAULTS.lineNumberFontSize
    ),
    lineHeight: parseLength(
      styles.getPropertyValue("--fish-line-height"),
      DEFAULTS.lineHeight
    ),
    caretWidth: parseLength(
      styles.getPropertyValue("--fish-caret-width"),
      DEFAULTS.caretWidth
    ),
    pad: parseLength(
      styles.getPropertyValue("--fish-editor-padding"),
      DEFAULTS.pad
    ),
    gutterExtra: parseLength(
      styles.getPropertyValue("--fish-gutter-extra"),
      DEFAULTS.gutterExtra
    ),
  };
}

/**
 * Setup canvas with proper DPR for crisp rendering on HiDPI displays
 */
export function setupCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  return ctx;
}
