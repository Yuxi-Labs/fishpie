/**
 * Multi-cursor editing support for the Fish editor.
 * Manages multiple independent cursors and selections.
 */

import type { DocPos } from './document';

export interface Cursor {
  /** Unique identifier for this cursor */
  id: number;
  /** Cursor position (primary end of selection) */
  caret: DocPos;
  /** Anchor position (start of selection, null if no selection) */
  anchor: DocPos | null;
}

export class MultiCursorManager {
  private cursors: Cursor[] = [];
  private nextId = 1;

  constructor() {
    // Start with one cursor at origin
    this.cursors = [{ id: 0, caret: { line: 0, column: 0 }, anchor: null }];
  }

  /**
   * Get all cursors.
   */
  getCursors(): Cursor[] {
    return [...this.cursors];
  }

  /**
   * Get the primary (most recently added) cursor.
   */
  getPrimaryCursor(): Cursor {
    return this.cursors[this.cursors.length - 1];
  }

  /**
   * Set a single cursor, removing all others.
   */
  setSingleCursor(caret: DocPos, anchor: DocPos | null = null): void {
    this.cursors = [{ id: this.nextId++, caret, anchor }];
  }

  /**
   * Add a new cursor at the specified position.
   * Avoids adding duplicate cursors at the same position.
   */
  addCursor(caret: DocPos, anchor: DocPos | null = null): void {
    // Check if cursor already exists at this position
    const exists = this.cursors.some(
      (c) =>
        c.caret.line === caret.line &&
        c.caret.column === caret.column &&
        ((c.anchor === null && anchor === null) ||
          (c.anchor !== null &&
            anchor !== null &&
            c.anchor.line === anchor.line &&
            c.anchor.column === anchor.column))
    );

    if (!exists) {
      this.cursors.push({ id: this.nextId++, caret, anchor });
      this.sortCursors();
    }
  }

  /**
   * Remove cursor by ID.
   */
  removeCursor(id: number): void {
    if (this.cursors.length > 1) {
      this.cursors = this.cursors.filter((c) => c.id !== id);
    }
  }

  /**
   * Remove all cursors except the primary one.
   */
  clearSecondaryCursors(): void {
    if (this.cursors.length > 1) {
      const primary = this.getPrimaryCursor();
      this.cursors = [primary];
    }
  }

  /**
   * Update cursor position by ID.
   */
  updateCursor(id: number, caret: DocPos, anchor: DocPos | null = null): void {
    const cursor = this.cursors.find((c) => c.id === id);
    if (cursor) {
      cursor.caret = caret;
      cursor.anchor = anchor;
    }
  }

  /**
   * Sort cursors by position (top to bottom, left to right).
   * Maintains stable order for cursors on the same line.
   */
  private sortCursors(): void {
    this.cursors.sort((a, b) => {
      if (a.caret.line !== b.caret.line) {
        return a.caret.line - b.caret.line;
      }
      return a.caret.column - b.caret.column;
    });
  }

  /**
   * Merge overlapping cursors and selections.
   * Called after bulk operations to clean up duplicates.
   */
  mergeOverlapping(): void {
    if (this.cursors.length <= 1) return;

    this.sortCursors();

    const merged: Cursor[] = [];
    let current = this.cursors[0];

    for (let i = 1; i < this.cursors.length; i++) {
      const next = this.cursors[i];

      // Check if cursors overlap or are adjacent
      if (this.cursorsOverlap(current, next)) {
        // Merge: extend current to include next
        current = this.mergeTwoCursors(current, next);
      } else {
        // No overlap: save current and move to next
        merged.push(current);
        current = next;
      }
    }

    merged.push(current);
    this.cursors = merged;
  }

  /**
   * Check if two cursors overlap or are at the same position.
   */
  private cursorsOverlap(a: Cursor, b: Cursor): boolean {
    const aStart = a.anchor ?? a.caret;
    const aEnd = a.anchor ? a.caret : a.caret;
    const bStart = b.anchor ?? b.caret;
    const bEnd = b.anchor ? b.caret : b.caret;

    // Normalize to ensure start < end
    const [_aMin, aMax] = this.normalizeRange(aStart, aEnd);
    const [bMin, _bMax] = this.normalizeRange(bStart, bEnd);

    // Check overlap: aMax >= bMin
    if (aMax.line < bMin.line) return false;
    if (aMax.line === bMin.line && aMax.column < bMin.column) return false;

    return true;
  }

  /**
   * Merge two overlapping cursors into one.
   */
  private mergeTwoCursors(a: Cursor, b: Cursor): Cursor {
    const aStart = a.anchor ?? a.caret;
    const aEnd = a.anchor ? a.caret : a.caret;
    const bStart = b.anchor ?? b.caret;
    const bEnd = b.anchor ? b.caret : b.caret;

    const [aMin, aMax] = this.normalizeRange(aStart, aEnd);
    const [bMin, bMax] = this.normalizeRange(bStart, bEnd);

    // Find overall min and max
    const min = this.comparePos(aMin, bMin) < 0 ? aMin : bMin;
    const max = this.comparePos(aMax, bMax) > 0 ? aMax : bMax;

    // Return merged cursor with selection from min to max
    return {
      id: a.id, // Keep first cursor's ID
      caret: max,
      anchor: this.posEqual(min, max) ? null : min,
    };
  }

  /**
   * Normalize a range so that start <= end.
   */
  private normalizeRange(start: DocPos, end: DocPos): [DocPos, DocPos] {
    return this.comparePos(start, end) <= 0 ? [start, end] : [end, start];
  }

  /**
   * Compare two positions.
   * Returns: -1 if a < b, 0 if a == b, 1 if a > b
   */
  private comparePos(a: DocPos, b: DocPos): number {
    if (a.line !== b.line) return a.line - b.line;
    return a.column - b.column;
  }

  /**
   * Check if two positions are equal.
   */
  private posEqual(a: DocPos, b: DocPos): boolean {
    return a.line === b.line && a.column === b.column;
  }

  /**
   * Get number of cursors.
   */
  get count(): number {
    return this.cursors.length;
  }

  /**
   * Check if multi-cursor mode is active (more than one cursor).
   */
  get isMultiCursor(): boolean {
    return this.cursors.length > 1;
  }
}

/**
 * Find next occurrence of selected text in document.
 * Used for Ctrl+D "add selection to next find match" functionality.
 * 
 * @param text Document text
 * @param searchText Text to search for
 * @param startPos Position to start searching from
 * @param caseSensitive Whether search is case-sensitive
 * @returns { startPos, endPos } of match, or null if not found
 */
export function findNextOccurrence(
  text: string,
  searchText: string,
  startPos: { line: number; column: number },
  caseSensitive: boolean = true
): { startPos: DocPos; endPos: DocPos } | null {
  if (!searchText) return null;

  const lines = text.split('\n');
  const searchLower = caseSensitive ? searchText : searchText.toLowerCase();

  // Start from startPos and search forward
  for (let line = startPos.line; line < lines.length; line++) {
    const lineText = lines[line];
    const searchFrom = line === startPos.line ? startPos.column : 0;
    const haystack = caseSensitive ? lineText : lineText.toLowerCase();

    const column = haystack.indexOf(searchLower, searchFrom);
    if (column !== -1) {
      return {
        startPos: { line, column },
        endPos: { line, column: column + searchText.length },
      };
    }
  }

  // Wrap around to beginning
  for (let line = 0; line < startPos.line; line++) {
    const lineText = lines[line];
    const haystack = caseSensitive ? lineText : lineText.toLowerCase();

    const column = haystack.indexOf(searchLower);
    if (column !== -1) {
      return {
        startPos: { line, column },
        endPos: { line, column: column + searchText.length },
      };
    }
  }

  // Check remaining part of start line (before startPos)
  if (startPos.column > 0) {
    const lineText = lines[startPos.line];
    const haystack = caseSensitive ? lineText : lineText.toLowerCase();
    const column = haystack.indexOf(searchLower, 0);
    if (column !== -1 && column < startPos.column) {
      return {
        startPos: { line: startPos.line, column },
        endPos: { line: startPos.line, column: column + searchText.length },
      };
    }
  }

  return null;
}
