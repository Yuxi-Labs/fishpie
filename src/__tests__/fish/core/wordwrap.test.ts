import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateWordWrap,
  lineColToVisualRow,
  visualRowToLineCol,
  getLineWrapCount,
  type WrapInfo,
} from '../../../fish/core/wordwrap';

// Mock canvas context for testing
class MockCanvasContext {
  private charWidth = 10; // Assume fixed-width font for testing

  measureText(text: string): TextMetrics {
    return {
      width: text.length * this.charWidth,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: text.length * this.charWidth,
      actualBoundingBoxAscent: 12,
      actualBoundingBoxDescent: 3,
      fontBoundingBoxAscent: 12,
      fontBoundingBoxDescent: 3,
      emHeightAscent: 12,
      emHeightDescent: 3,
      hangingBaseline: 0,
      alphabeticBaseline: 0,
      ideographicBaseline: 0,
    };
  }
}

describe('calculateWordWrap', () => {
  let ctx: MockCanvasContext;

  beforeEach(() => {
    ctx = new MockCanvasContext();
  });

  it('should not wrap short lines', () => {
    const lines = ['Hello', 'World'];
    const maxWidth = 100; // 10 chars
    const result = calculateWordWrap(lines, maxWidth, ctx as unknown as CanvasRenderingContext2D);

    expect(result.totalRows).toBe(2);
    expect(result.wrappedLines).toHaveLength(2);
    expect(result.wrappedLines[0]).toHaveLength(1);
    expect(result.wrappedLines[1]).toHaveLength(1);
    expect(result.wrappedLines[0][0].text).toBe('Hello');
    expect(result.wrappedLines[1][0].text).toBe('World');
  });

  it('should wrap long lines', () => {
    const lines = ['This is a very long line that needs wrapping'];
    const maxWidth = 100; // 10 chars at 10px each
    const result = calculateWordWrap(lines, maxWidth, ctx as unknown as CanvasRenderingContext2D);

    expect(result.totalRows).toBeGreaterThan(1);
    expect(result.wrappedLines[0].length).toBeGreaterThan(1);
    
    // Verify each segment is within maxWidth
    result.wrappedLines[0].forEach(wrap => {
      expect(wrap.text.length * 10).toBeLessThanOrEqual(maxWidth);
    });
  });

  it('should handle empty lines', () => {
    const lines = ['Hello', '', 'World'];
    const maxWidth = 100;
    const result = calculateWordWrap(lines, maxWidth, ctx as unknown as CanvasRenderingContext2D);

    expect(result.totalRows).toBe(3);
    expect(result.wrappedLines[1]).toHaveLength(1);
    expect(result.wrappedLines[1][0].text).toBe('');
  });

  it('should preserve line indices', () => {
    const lines = ['Short', 'This is a long line', 'End'];
    const maxWidth = 80; // 8 chars
    const result = calculateWordWrap(lines, maxWidth, ctx as unknown as CanvasRenderingContext2D);

    result.wrappedLines.forEach((wraps, lineIndex) => {
      wraps.forEach(wrap => {
        expect(wrap.lineIndex).toBe(lineIndex);
      });
    });
  });

  it('should create sequential visual rows', () => {
    const lines = ['Line 1', 'This is a long line that wraps', 'Line 3'];
    const maxWidth = 80;
    const result = calculateWordWrap(lines, maxWidth, ctx as unknown as CanvasRenderingContext2D);

    let expectedRow = 0;
    result.wrappedLines.forEach(wraps => {
      wraps.forEach(wrap => {
        expect(wrap.visualRow).toBe(expectedRow);
        expectedRow++;
      });
    });
    expect(expectedRow).toBe(result.totalRows);
  });

  it('should break at word boundaries when possible', () => {
    const lines = ['Hello world this is wrapped'];
    const maxWidth = 120; // 12 chars - should break between words
    const result = calculateWordWrap(lines, maxWidth, ctx as unknown as CanvasRenderingContext2D);

    // Each wrap should end at a word boundary (space) when possible
    result.wrappedLines[0].forEach((wrap, i) => {
      if (i < result.wrappedLines[0].length - 1) {
        const lastChar = wrap.text[wrap.text.length - 1];
        // Should end with space or be a forced break
        if (wrap.endCol - wrap.startCol < 12) {
          expect([' ', 'e', 'd', 's', 't', 'o', 'l', 'd'].includes(lastChar)).toBe(true);
        }
      }
    });
  });

  it('should handle single long word', () => {
    const lines = ['VeryLongWordWithNoSpaces'];
    const maxWidth = 80; // 8 chars
    const result = calculateWordWrap(lines, maxWidth, ctx as unknown as CanvasRenderingContext2D);

    expect(result.wrappedLines[0].length).toBeGreaterThan(1);
    // Should force-break the word
    result.wrappedLines[0].forEach((wrap, i) => {
      if (i < result.wrappedLines[0].length - 1) {
        expect(wrap.text.length).toBeLessThanOrEqual(8);
      }
    });
  });
});

describe('lineColToVisualRow', () => {
  let ctx: MockCanvasContext;
  let wrapInfo: WrapInfo;

  beforeEach(() => {
    ctx = new MockCanvasContext();
    const lines = ['Short', 'This is a long line that wraps', 'End'];
    wrapInfo = calculateWordWrap(lines, 80, ctx as unknown as CanvasRenderingContext2D); // 8 chars
  });

  it('should map start of line to first visual row', () => {
    const row = lineColToVisualRow(wrapInfo, 1, 0);
    expect(row).toBe(wrapInfo.wrappedLines[1][0].visualRow);
  });

  it('should map position within first wrap', () => {
    const row = lineColToVisualRow(wrapInfo, 1, 4);
    expect(row).toBe(wrapInfo.wrappedLines[1][0].visualRow);
  });

  it('should map position to correct wrap segment', () => {
    const wraps = wrapInfo.wrappedLines[1];
    if (wraps.length > 1) {
      const col = wraps[1].startCol + 2; // 2 chars into second wrap
      const row = lineColToVisualRow(wrapInfo, 1, col);
      expect(row).toBe(wraps[1].visualRow);
    }
  });

  it('should handle end of line', () => {
    const line = 'This is a long line that wraps';
    const row = lineColToVisualRow(wrapInfo, 1, line.length);
    const wraps = wrapInfo.wrappedLines[1];
    expect(row).toBe(wraps[wraps.length - 1].visualRow);
  });

  it('should clamp out of bounds line index', () => {
    const row = lineColToVisualRow(wrapInfo, 999, 0);
    expect(row).toBe(wrapInfo.totalRows - 1);
  });
});

describe('visualRowToLineCol', () => {
  let ctx: MockCanvasContext;
  let wrapInfo: WrapInfo;

  beforeEach(() => {
    ctx = new MockCanvasContext();
    const lines = ['Short', 'This is a long line that wraps', 'End'];
    wrapInfo = calculateWordWrap(lines, 80, ctx as unknown as CanvasRenderingContext2D);
  });

  it('should map visual row to line start', () => {
    const pos = visualRowToLineCol(wrapInfo, 0);
    expect(pos.lineIndex).toBe(0);
    expect(pos.col).toBe(0);
  });

  it('should map wrapped row to correct line and column', () => {
    const wraps = wrapInfo.wrappedLines[1];
    if (wraps.length > 1) {
      const pos = visualRowToLineCol(wrapInfo, wraps[1].visualRow);
      expect(pos.lineIndex).toBe(1);
      expect(pos.col).toBe(wraps[1].startCol);
    }
  });

  it('should handle last visual row', () => {
    const lastRow = wrapInfo.totalRows - 1;
    const pos = visualRowToLineCol(wrapInfo, lastRow);
    expect(pos.lineIndex).toBe(2); // "End" line
  });

  it('should clamp invalid visual row', () => {
    const pos = visualRowToLineCol(wrapInfo, 999);
    expect(pos.lineIndex).toBeLessThanOrEqual(2);
  });
});

describe('getLineWrapCount', () => {
  let ctx: MockCanvasContext;
  let wrapInfo: WrapInfo;

  beforeEach(() => {
    ctx = new MockCanvasContext();
    const lines = ['Short', 'This is a long line that wraps', 'End'];
    wrapInfo = calculateWordWrap(lines, 80, ctx as unknown as CanvasRenderingContext2D);
  });

  it('should return 1 for unwrapped line', () => {
    const count = getLineWrapCount(wrapInfo, 0);
    expect(count).toBe(1);
  });

  it('should return correct count for wrapped line', () => {
    const count = getLineWrapCount(wrapInfo, 1);
    expect(count).toBeGreaterThan(1);
    expect(count).toBe(wrapInfo.wrappedLines[1].length);
  });

  it('should return 0 for out of bounds line', () => {
    const count = getLineWrapCount(wrapInfo, 999);
    expect(count).toBe(0);
  });
});

describe('edge cases', () => {
  let ctx: MockCanvasContext;

  beforeEach(() => {
    ctx = new MockCanvasContext();
  });

  it('should handle empty document', () => {
    const lines: string[] = [];
    const result = calculateWordWrap(lines, 100, ctx as unknown as CanvasRenderingContext2D);
    expect(result.totalRows).toBe(0);
    expect(result.wrappedLines).toHaveLength(0);
  });

  it('should handle single empty line', () => {
    const lines = [''];
    const result = calculateWordWrap(lines, 100, ctx as unknown as CanvasRenderingContext2D);
    expect(result.totalRows).toBe(1);
    expect(result.wrappedLines[0][0].text).toBe('');
  });

  it('should handle very small maxWidth', () => {
    const lines = ['Hello'];
    const result = calculateWordWrap(lines, 15, ctx as unknown as CanvasRenderingContext2D); // Only 1-2 chars fit
    expect(result.wrappedLines[0].length).toBeGreaterThan(1);
  });

  it('should handle very large maxWidth', () => {
    const lines = ['Short line'];
    const result = calculateWordWrap(lines, 10000, ctx as unknown as CanvasRenderingContext2D);
    expect(result.wrappedLines[0]).toHaveLength(1);
    expect(result.wrappedLines[0][0].text).toBe('Short line');
  });
});
