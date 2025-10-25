/**
 * Keyboard navigation utilities for moving caret position
 */

import type { CaretPos } from "../core/types";

/**
 * Move caret one character left
 */
export function moveLeft(caret: CaretPos, lines: string[]): CaretPos {
  if (caret.column > 0) {
    return { line: caret.line, column: caret.column - 1 };
  } else if (caret.line > 0) {
    const prevLine = lines[caret.line - 1];
    return { line: caret.line - 1, column: prevLine.length };
  }
  return caret;
}

/**
 * Move caret one character right
 */
export function moveRight(caret: CaretPos, lines: string[]): CaretPos {
  const currentLine = lines[caret.line] ?? "";
  if (caret.column < currentLine.length) {
    return { line: caret.line, column: caret.column + 1 };
  } else if (caret.line < lines.length - 1) {
    return { line: caret.line + 1, column: 0 };
  }
  return caret;
}

/**
 * Move caret one line up
 */
export function moveUp(caret: CaretPos, lines: string[]): CaretPos {
  if (caret.line > 0) {
    const prevLine = lines[caret.line - 1];
    return { line: caret.line - 1, column: Math.min(caret.column, prevLine.length) };
  }
  return caret;
}

/**
 * Move caret one line down
 */
export function moveDown(caret: CaretPos, lines: string[]): CaretPos {
  if (caret.line < lines.length - 1) {
    const nextLine = lines[caret.line + 1];
    return { line: caret.line + 1, column: Math.min(caret.column, nextLine.length) };
  }
  return caret;
}

/**
 * Move caret to start of line
 */
export function moveToLineStart(caret: CaretPos): CaretPos {
  return { line: caret.line, column: 0 };
}

/**
 * Move caret to end of line
 */
export function moveToLineEnd(caret: CaretPos, lines: string[]): CaretPos {
  const currentLine = lines[caret.line] ?? "";
  return { line: caret.line, column: currentLine.length };
}

/**
 * Move caret to start of document
 */
export function moveToDocStart(): CaretPos {
  return { line: 0, column: 0 };
}

/**
 * Move caret to end of document
 */
export function moveToDocEnd(lines: string[]): CaretPos {
  const lastLine = lines[lines.length - 1] ?? "";
  return { line: lines.length - 1, column: lastLine.length };
}

/**
 * Find word boundary moving left from position
 */
export function findWordBoundaryLeft(caret: CaretPos, lines: string[]): CaretPos {
  const line = lines[caret.line] ?? "";
  let col = caret.column;

  // Skip whitespace
  while (col > 0 && /\s/.test(line[col - 1])) {
    col--;
  }

  // Skip word characters
  while (col > 0 && /\S/.test(line[col - 1])) {
    col--;
  }

  return { line: caret.line, column: col };
}

/**
 * Find word boundary moving right from position
 */
export function findWordBoundaryRight(caret: CaretPos, lines: string[]): CaretPos {
  const line = lines[caret.line] ?? "";
  let col = caret.column;

  // Skip whitespace
  while (col < line.length && /\s/.test(line[col])) {
    col++;
  }

  // Skip word characters
  while (col < line.length && /\S/.test(line[col])) {
    col++;
  }

  return { line: caret.line, column: col };
}
