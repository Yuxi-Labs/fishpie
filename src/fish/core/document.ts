export type DocPos = { line: number; column: number };

export class TextDocument {
  private _lines: string[];

  constructor(text: string = "") {
    this._lines = text.split("\n");
  }

  toString(): string {
    return this._lines.join("\n");
  }

  get lineCount(): number {
    return this._lines.length;
  }

  getLine(line: number): string {
    if (line < 0 || line >= this._lines.length) return "";
    return this._lines[line];
  }

  clampPosition(pos: DocPos): DocPos {
    const line = Math.max(0, Math.min(pos.line, this._lines.length - 1));
    const maxCol = this._lines[line]?.length ?? 0;
    const column = Math.max(0, Math.min(pos.column, maxCol));
    return { line, column };
  }

  insertText(pos: DocPos, text: string): DocPos {
    const p = this.clampPosition(pos);
    const lineText = this._lines[p.line] ?? "";
    const before = lineText.slice(0, p.column);
    const after = lineText.slice(p.column);
    if (text.indexOf("\n") === -1) {
      this._lines[p.line] = before + text + after;
      return { line: p.line, column: p.column + text.length };
    }
    const parts = text.split("\n");
    const first = before + parts[0];
    const middle = parts.slice(1, -1);
    const last = parts[parts.length - 1] + after;
    // Replace current line with first, then insert middle lines, then last
    this._lines[p.line] = first;
    if (middle.length > 0) {
      this._lines.splice(p.line + 1, 0, ...middle);
    }
    this._lines.splice(p.line + parts.length - 1, 0, last);
    // Remove the old 'after' segment that was appended as part of last splice
    // Actually not needed because we built 'last' including 'after'
    return { line: p.line + parts.length - 1, column: parts[parts.length - 1].length };
  }

  insertNewline(pos: DocPos): DocPos {
    const p = this.clampPosition(pos);
    const lineText = this._lines[p.line] ?? "";
    const before = lineText.slice(0, p.column);
    const after = lineText.slice(p.column);
    this._lines[p.line] = before;
    this._lines.splice(p.line + 1, 0, after);
    return { line: p.line + 1, column: 0 };
  }

  deleteBackward(pos: DocPos): DocPos {
    // If at start of doc, nothing
    if (pos.line === 0 && pos.column === 0) return pos;
    const p = this.clampPosition(pos);
    if (p.column > 0) {
      const lineText = this._lines[p.line] ?? "";
      const before = lineText.slice(0, p.column - 1);
      const after = lineText.slice(p.column);
      this._lines[p.line] = before + after;
      return { line: p.line, column: p.column - 1 };
    }
    // Merge with previous line
    const prevLine = p.line - 1;
    const prevText = this._lines[prevLine] ?? "";
    const currText = this._lines[p.line] ?? "";
    const newCol = prevText.length;
    this._lines[prevLine] = prevText + currText;
    this._lines.splice(p.line, 1);
    return { line: prevLine, column: newCol };
  }

  deleteForward(pos: DocPos): DocPos {
    const p = this.clampPosition(pos);
    const lineText = this._lines[p.line] ?? "";
    if (p.column < lineText.length) {
      const before = lineText.slice(0, p.column);
      const after = lineText.slice(p.column + 1);
      this._lines[p.line] = before + after;
      return p; // caret stays
    }
    // At end of line: merge with next line if exists
    if (p.line < this._lines.length - 1) {
      const nextText = this._lines[p.line + 1] ?? "";
      this._lines[p.line] = lineText + nextText;
      this._lines.splice(p.line + 1, 1);
      return p;
    }
    return p;
  }

  private _normalizeRange(a: DocPos, b: DocPos): { start: DocPos; end: DocPos } {
    const ca = this.clampPosition(a);
    const cb = this.clampPosition(b);
    if (ca.line < cb.line) return { start: ca, end: cb };
    if (ca.line > cb.line) return { start: cb, end: ca };
    // same line
    if (ca.column <= cb.column) return { start: ca, end: cb };
    return { start: cb, end: ca };
  }

  /**
   * Get text in a range (for history tracking)
   */
  getTextInRange(a: DocPos, b: DocPos): string {
    const { start, end } = this._normalizeRange(a, b);
    
    if (start.line === end.line) {
      // Same line
      const line = this._lines[start.line] ?? "";
      return line.slice(start.column, end.column);
    }
    
    // Multi-line range
    const result: string[] = [];
    
    // First line
    const firstLine = this._lines[start.line] ?? "";
    result.push(firstLine.slice(start.column));
    
    // Middle lines
    for (let i = start.line + 1; i < end.line; i++) {
      result.push(this._lines[i] ?? "");
    }
    
    // Last line
    const lastLine = this._lines[end.line] ?? "";
    result.push(lastLine.slice(0, end.column));
    
    return result.join("\n");
  }

  replaceRange(a: DocPos, b: DocPos, text: string): DocPos {
    const { start, end } = this._normalizeRange(a, b);
    const first = this._lines[start.line] ?? "";
    const last = this._lines[end.line] ?? "";
    const before = first.slice(0, start.column);
    const after = last.slice(end.column);
    const parts = text.split("\n");
    if (parts.length === 1) {
      const merged = before + parts[0] + after;
      this._lines.splice(start.line, end.line - start.line + 1, merged);
      return { line: start.line, column: before.length + parts[0].length };
    } else {
      const head = before + parts[0];
      const tail = parts[parts.length - 1] + after;
      const middle = parts.slice(1, -1);
      const replaceWith = [head, ...middle, tail];
      this._lines.splice(start.line, end.line - start.line + 1, ...replaceWith);
      return { line: start.line + replaceWith.length - 1, column: tail.length - after.length };
    }
  }

  deleteRange(a: DocPos, b: DocPos): DocPos {
    return this.replaceRange(a, b, "");
  }
}
