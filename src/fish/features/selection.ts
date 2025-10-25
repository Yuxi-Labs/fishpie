/**
 * Selection utilities for managing text selections
 */

import type { CaretPos } from "../core/types";

export type NormalizedSelection = {
  start: CaretPos;
  end: CaretPos;
};

/**
 * Normalize selection so start is always before end
 */
export function normalizeSelection(
  caret: CaretPos,
  anchor: CaretPos
): NormalizedSelection {
  const isCaretAfter =
    caret.line > anchor.line ||
    (caret.line === anchor.line && caret.column > anchor.column);

  return isCaretAfter
    ? { start: anchor, end: caret }
    : { start: caret, end: anchor };
}

/**
 * Check if two positions represent a valid selection (not collapsed)
 */
export function hasSelection(caret: CaretPos, anchor: CaretPos | null): boolean {
  if (!anchor) return false;
  return caret.line !== anchor.line || caret.column !== anchor.column;
}

/**
 * Check if a position is within a selection range
 */
export function isInSelection(
  pos: CaretPos,
  start: CaretPos,
  end: CaretPos
): boolean {
  // Before start
  if (pos.line < start.line) return false;
  if (pos.line === start.line && pos.column < start.column) return false;

  // After end
  if (pos.line > end.line) return false;
  if (pos.line === end.line && pos.column > end.column) return false;

  return true;
}

/**
 * Select all text in document
 */
export function selectAll(lines: string[]): {
  anchor: CaretPos;
  caret: CaretPos;
} {
  const lastLine = lines[lines.length - 1] || "";
  return {
    anchor: { line: 0, column: 0 },
    caret: { line: lines.length - 1, column: lastLine.length },
  };
}
