/**
 * Clipboard operations for editor text manipulation
 */

import type { CaretPos } from "../core/types";
import { hasSelection } from "../core/caret";

export type ClipboardConfig = {
  caret: CaretPos;
  anchor: CaretPos | null;
  lines: string[];
};

export type NormalizedSelection = {
  start: CaretPos;
  end: CaretPos;
};

/**
 * Get selected text or empty string if no selection
 */
export function getSelectedText(config: ClipboardConfig): string {
  const { caret, anchor, lines } = config;
  
  if (!anchor || !hasSelection(caret, anchor)) {
    return "";
  }

  const selection = normalizeSelection(caret, anchor);
  const { start, end } = selection;

  if (start.line === end.line) {
    // Single line selection
    const line = lines[start.line] ?? "";
    return line.slice(start.column, end.column);
  } else {
    // Multi-line selection
    const result: string[] = [];
    
    // First line
    const firstLine = lines[start.line] ?? "";
    result.push(firstLine.slice(start.column));
    
    // Middle lines
    for (let i = start.line + 1; i < end.line; i++) {
      result.push(lines[i]);
    }
    
    // Last line
    const lastLine = lines[end.line] ?? "";
    result.push(lastLine.slice(0, end.column));
    
    return result.join("\n");
  }
}

/**
 * Delete selected text and return new lines and caret position
 */
export function deleteSelection(config: ClipboardConfig): {
  lines: string[];
  caret: CaretPos;
} {
  const { caret, anchor, lines } = config;

  if (!anchor || !hasSelection(caret, anchor)) {
    return { lines, caret };
  }

  const selection = normalizeSelection(caret, anchor);
  const { start, end } = selection;

  if (start.line === end.line) {
    // Single line deletion
    const line = lines[start.line] ?? "";
    const newLine = line.slice(0, start.column) + line.slice(end.column);
    const newLines = [...lines];
    newLines[start.line] = newLine;
    return { lines: newLines, caret: start };
  } else {
    // Multi-line deletion
    const firstLine = lines[start.line] ?? "";
    const lastLine = lines[end.line] ?? "";
    const mergedLine = firstLine.slice(0, start.column) + lastLine.slice(end.column);
    
    const newLines = [
      ...lines.slice(0, start.line),
      mergedLine,
      ...lines.slice(end.line + 1),
    ];
    
    return { lines: newLines, caret: start };
  }
}

/**
 * Insert text at caret position, optionally replacing selection
 */
export function insertText(config: ClipboardConfig & { text: string }): {
  lines: string[];
  caret: CaretPos;
} {
  const { caret, anchor, lines, text } = config;

  // First delete any selection
  const { lines: clearedLines, caret: insertCaret } = deleteSelection({
    caret,
    anchor,
    lines,
  });

  // Split inserted text into lines
  const insertLines = text.split("\n");

  if (insertLines.length === 1) {
    // Single line insert
    const line = clearedLines[insertCaret.line] ?? "";
    const newLine = line.slice(0, insertCaret.column) + text + line.slice(insertCaret.column);
    const newLines = [...clearedLines];
    newLines[insertCaret.line] = newLine;
    
    return {
      lines: newLines,
      caret: { line: insertCaret.line, column: insertCaret.column + text.length },
    };
  } else {
    // Multi-line insert
    const line = clearedLines[insertCaret.line] ?? "";
    const before = line.slice(0, insertCaret.column);
    const after = line.slice(insertCaret.column);

    const firstNewLine = before + insertLines[0];
    const lastNewLine = insertLines[insertLines.length - 1] + after;
    const middleLines = insertLines.slice(1, -1);

    const newLines = [
      ...clearedLines.slice(0, insertCaret.line),
      firstNewLine,
      ...middleLines,
      lastNewLine,
      ...clearedLines.slice(insertCaret.line + 1),
    ];

    return {
      lines: newLines,
      caret: {
        line: insertCaret.line + insertLines.length - 1,
        column: insertLines[insertLines.length - 1].length + (insertLines.length === 1 ? insertCaret.column : 0),
      },
    };
  }
}

/**
 * Normalize selection to ensure start is before end
 */
function normalizeSelection(caret: CaretPos, anchor: CaretPos): NormalizedSelection {
  const isCaretAfter =
    caret.line > anchor.line ||
    (caret.line === anchor.line && caret.column > anchor.column);

  return isCaretAfter
    ? { start: anchor, end: caret }
    : { start: caret, end: anchor };
}
