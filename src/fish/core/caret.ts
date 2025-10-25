/**
 * Caret position utilities
 */

import type { CaretPos } from "./types";

/**
 * Check if two caret positions are equal
 */
export function caretEquals(a: CaretPos, b: CaretPos): boolean {
  return a.line === b.line && a.column === b.column;
}

/**
 * Check if a selection exists (anchor !== caret)
 */
export function hasSelection(anchor: CaretPos | null, caret: CaretPos): boolean {
  return !!anchor && !caretEquals(anchor, caret);
}

/**
 * Convert offset in inserted text to caret position
 */
export function offsetToCaret(
  base: CaretPos,
  insertedText: string,
  offset: number
): CaretPos {
  let line = base.line;
  let col = base.column;
  let i = 0;

  while (i < offset && i < insertedText.length) {
    const c = insertedText[i++];
    if (c === "\n") {
      line++;
      col = 0;
    } else {
      col++;
    }
  }

  return { line, column: col };
}
