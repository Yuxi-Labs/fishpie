import { describe, it, expect } from 'vitest';
import { TextDocument } from '@/fish/core/document';

describe('TextDocument', () => {
  it('inserts text within a line and advances caret', () => {
    const doc = new TextDocument('hello');
    const pos = doc.insertText({ line: 0, column: 5 }, '!');
    expect(doc.toString()).toBe('hello!');
    expect(pos).toEqual({ line: 0, column: 6 });
  });

  it('inserts newline and splits line', () => {
    const doc = new TextDocument('hello world');
    const pos = doc.insertNewline({ line: 0, column: 5 });
    expect(doc.toString()).toBe('hello\n world');
    expect(pos).toEqual({ line: 1, column: 0 });
  });

  it('delete backward merges lines at start of line', () => {
    const doc = new TextDocument('foo\nbar');
    const pos = doc.deleteBackward({ line: 1, column: 0 });
    expect(doc.toString()).toBe('foobar');
    expect(pos).toEqual({ line: 0, column: 3 });
  });

  it('delete forward deletes a char or merges with next line', () => {
    const doc = new TextDocument('ab\nc');
    let pos = doc.deleteForward({ line: 0, column: 1 });
    expect(doc.toString()).toBe('a\nc');
    expect(pos).toEqual({ line: 0, column: 1 });

    pos = doc.deleteForward({ line: 0, column: 1 });
    expect(doc.toString()).toBe('ac');
    expect(pos).toEqual({ line: 0, column: 1 });
  });

  it('replaceRange across lines and within line', () => {
    const doc = new TextDocument('abc\ndef');
    const pos1 = doc.replaceRange({ line: 0, column: 1 }, { line: 0, column: 2 }, 'X');
    expect(doc.toString()).toBe('aXc\ndef');
    expect(pos1).toEqual({ line: 0, column: 2 });

    const pos2 = doc.replaceRange({ line: 0, column: 2 }, { line: 1, column: 1 }, '-');
    expect(doc.toString()).toBe('aX-ef');
    expect(pos2).toEqual({ line: 0, column: 3 });
  });

  it('deleteRange is replaceRange with empty string', () => {
    const doc = new TextDocument('abc\ndef');
    const pos = doc.deleteRange({ line: 0, column: 1 }, { line: 1, column: 2 });
    expect(doc.toString()).toBe('af');
    expect(pos).toEqual({ line: 0, column: 1 });
  });

  it('clampPosition clamps to valid line/column', () => {
    const doc = new TextDocument('x\ny');
    expect(doc.clampPosition({ line: -1, column: -10 })).toEqual({ line: 0, column: 0 });
    expect(doc.clampPosition({ line: 10, column: 10 })).toEqual({ line: 1, column: 1 });
  });
});
