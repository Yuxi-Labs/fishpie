import { describe, it, expect } from 'vitest';
import { TextDocument } from '@/fish/core/document';

describe('TextDocument paste-like operations', () => {
  it('insertText handles multi-line text', () => {
    const doc = new TextDocument('hello');
    const pos = { line: 0, column: 5 };
    const next = doc.insertText(pos, '\nworld');
    expect(doc.toString()).toBe('hello\nworld');
    expect(next).toEqual({ line: 1, column: 5 });
  });

  it('replaceRange with multi-line text replaces across lines correctly', () => {
    const doc = new TextDocument('a1\na2\na3');
    // Replace from line 0 col 1 through line 2 col 1 with two lines
    const next = doc.replaceRange({ line: 0, column: 1 }, { line: 2, column: 1 }, 'X\nY');
    expect(doc.toString()).toBe('aX\nY3');
    expect(next).toEqual({ line: 1, column: 1 });
  });
});
