/**
 * Caret rendering with blink timer
 */

export type CaretRenderConfig = {
  x: number;
  y: number;
  width: number;
  height: number;
  yOffset: number;
  color: string;
  visible: boolean;
};

/**
 * Render the caret at the specified position
 */
export function renderCaret(
  ctx: CanvasRenderingContext2D,
  config: CaretRenderConfig
): void {
  if (!config.visible) return;

  ctx.fillStyle = config.color;
  ctx.fillRect(config.x, config.y + config.yOffset, config.width, config.height);
}

/**
 * Calculate caret size based on line height
 */
export function calculateCaretSize(lineHeight: number, _caretWidth: number): {
  height: number;
  yOffset: number;
} {
  const height = Math.max(1, lineHeight - 4);
  const yOffset = (lineHeight - height) / 2;
  return { height, yOffset };
}
