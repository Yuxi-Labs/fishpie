import { describe, it, expect } from 'vitest';
import { TextDocument } from './document';

describe('TextDocument', () => {
  it('initializes with provided text and toString returns same', () => {
    const doc = new TextDocument('hello\nworld');
    expect(doc.toString()).toBe('hello\nworld');
    expect(doc.lineCount).toBe(2);
    expect(doc.getLine(0)).toBe('hello');
    expect(doc.getLine(1)).toBe('world');
  });

  it('insertText inserts at position', () => {
    const doc = new TextDocument('abc');
    const pos = doc.insertText({ line: 0, column: 1 }, 'X');
    expect(doc.toString()).toBe('aXbc');
    expect(pos).toEqual({ line: 0, column: 2 });
  });

  it('insertNewline splits the line', () => {
    const doc = new TextDocument('abc');
    const pos = doc.insertNewline({ line: 0, column: 1 });
    expect(doc.toString()).toBe('a\nbc');
    expect(pos).toEqual({ line: 1, column: 0 });
  });

  it('deleteBackward deletes a char and merges lines at start', () => {
    const doc = new TextDocument('ab\ncd');
    let pos = doc.deleteBackward({ line: 1, column: 0 });
    expect(doc.toString()).toBe('abcd');
    expect(pos).toEqual({ line: 0, column: 2 });

    pos = doc.deleteBackward({ line: 0, column: 0 });
    expect(doc.toString()).toBe('abcd');
    expect(pos).toEqual({ line: 0, column: 0 });
  });

  it('deleteForward deletes a char and merges with next line at EOL', () => {
    const doc = new TextDocument('ab\ncd');
    let pos = doc.deleteForward({ line: 0, column: 2 });
    expect(doc.toString()).toBe('abcd');
    expect(pos).toEqual({ line: 0, column: 2 });

    pos = doc.deleteForward({ line: 0, column: 10 });
    expect(doc.toString()).toBe('abcd');
    expect(pos).toEqual({ line: 0, column: 2 });
  });

  it('replaceRange replaces text across lines', () => {
    const doc = new TextDocument('ab\ncd\nef');
    const pos = doc.replaceRange({ line: 0, column: 1 }, { line: 2, column: 1 }, 'X');
    expect(doc.toString()).toBe('aXf');
    expect(pos).toEqual({ line: 0, column: 2 });
  });

  it('deleteRange deletes text across lines', () => {
    const doc = new TextDocument('ab\ncd\nef');
    const pos = doc.deleteRange({ line: 0, column: 1 }, { line: 2, column: 1 });
    expect(doc.toString()).toBe('af');
    expect(pos).toEqual({ line: 0, column: 1 });
  });
});
