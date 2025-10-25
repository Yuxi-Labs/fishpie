import { describe, it, expect, beforeEach } from 'vitest';
import {
  MultiCursorManager,
  findNextOccurrence,
} from '../../../fish/core/multicursor';

describe('MultiCursorManager', () => {
  let manager: MultiCursorManager;

  beforeEach(() => {
    manager = new MultiCursorManager();
  });

  describe('initialization', () => {
    it('should start with one cursor at origin', () => {
      const cursors = manager.getCursors();
      expect(cursors).toHaveLength(1);
      expect(cursors[0].caret).toEqual({ line: 0, column: 0 });
      expect(cursors[0].anchor).toBeNull();
    });

    it('should not be in multi-cursor mode initially', () => {
      expect(manager.isMultiCursor).toBe(false);
      expect(manager.count).toBe(1);
    });
  });

  describe('setSingleCursor', () => {
    it('should set a single cursor without selection', () => {
      manager.setSingleCursor({ line: 5, column: 10 });
      
      const cursors = manager.getCursors();
      expect(cursors).toHaveLength(1);
      expect(cursors[0].caret).toEqual({ line: 5, column: 10 });
      expect(cursors[0].anchor).toBeNull();
    });

    it('should set a single cursor with selection', () => {
      manager.setSingleCursor(
        { line: 5, column: 10 },
        { line: 5, column: 5 }
      );
      
      const cursors = manager.getCursors();
      expect(cursors).toHaveLength(1);
      expect(cursors[0].caret).toEqual({ line: 5, column: 10 });
      expect(cursors[0].anchor).toEqual({ line: 5, column: 5 });
    });

    it('should replace all existing cursors', () => {
      manager.addCursor({ line: 1, column: 0 });
      manager.addCursor({ line: 2, column: 0 });
      expect(manager.count).toBe(3);

      manager.setSingleCursor({ line: 10, column: 0 });
      expect(manager.count).toBe(1);
    });
  });

  describe('addCursor', () => {
    it('should add a new cursor', () => {
      manager.addCursor({ line: 1, column: 5 });
      
      expect(manager.count).toBe(2);
      expect(manager.isMultiCursor).toBe(true);
    });

    it('should not add duplicate cursor at same position', () => {
      manager.setSingleCursor({ line: 5, column: 10 });
      manager.addCursor({ line: 5, column: 10 });
      
      expect(manager.count).toBe(1);
    });

    it('should sort cursors by position', () => {
      manager.setSingleCursor({ line: 5, column: 0 });
      manager.addCursor({ line: 2, column: 0 });
      manager.addCursor({ line: 8, column: 0 });
      manager.addCursor({ line: 1, column: 0 });
      
      const cursors = manager.getCursors();
      expect(cursors[0].caret.line).toBe(1);
      expect(cursors[1].caret.line).toBe(2);
      expect(cursors[2].caret.line).toBe(5);
      expect(cursors[3].caret.line).toBe(8);
    });

    it('should sort cursors on same line by column', () => {
      manager.setSingleCursor({ line: 5, column: 10 });
      manager.addCursor({ line: 5, column: 5 });
      manager.addCursor({ line: 5, column: 15 });
      
      const cursors = manager.getCursors();
      expect(cursors[0].caret.column).toBe(5);
      expect(cursors[1].caret.column).toBe(10);
      expect(cursors[2].caret.column).toBe(15);
    });
  });

  describe('removeCursor', () => {
    it('should remove cursor by ID', () => {
      manager.addCursor({ line: 1, column: 0 });
      manager.addCursor({ line: 2, column: 0 });
      
      const cursors = manager.getCursors();
      const idToRemove = cursors[1].id;
      
      manager.removeCursor(idToRemove);
      expect(manager.count).toBe(2);
      expect(manager.getCursors().some(c => c.id === idToRemove)).toBe(false);
    });

    it('should not remove last cursor', () => {
      const cursor = manager.getPrimaryCursor();
      manager.removeCursor(cursor.id);
      
      expect(manager.count).toBe(1);
    });
  });

  describe('clearSecondaryCursors', () => {
    it('should keep only primary cursor', () => {
      manager.addCursor({ line: 1, column: 0 });
      manager.addCursor({ line: 2, column: 0 });
      manager.addCursor({ line: 3, column: 0 });
      
      const primaryBefore = manager.getPrimaryCursor();
      manager.clearSecondaryCursors();
      
      expect(manager.count).toBe(1);
      expect(manager.getPrimaryCursor().id).toBe(primaryBefore.id);
    });

    it('should do nothing if only one cursor exists', () => {
      manager.clearSecondaryCursors();
      expect(manager.count).toBe(1);
    });
  });

  describe('updateCursor', () => {
    it('should update cursor position', () => {
      const cursor = manager.getPrimaryCursor();
      manager.updateCursor(cursor.id, { line: 10, column: 5 });
      
      const updated = manager.getPrimaryCursor();
      expect(updated.caret).toEqual({ line: 10, column: 5 });
      expect(updated.anchor).toBeNull();
    });

    it('should update cursor with selection', () => {
      const cursor = manager.getPrimaryCursor();
      manager.updateCursor(
        cursor.id,
        { line: 10, column: 10 },
        { line: 10, column: 5 }
      );
      
      const updated = manager.getPrimaryCursor();
      expect(updated.caret).toEqual({ line: 10, column: 10 });
      expect(updated.anchor).toEqual({ line: 10, column: 5 });
    });
  });

  describe('mergeOverlapping', () => {
    it('should merge cursors at same position', () => {
      manager.setSingleCursor({ line: 5, column: 10 });
      // Manually add duplicate (bypassing deduplication check)
      const cursors = manager.getCursors();
      cursors.push({ id: 999, caret: { line: 5, column: 10 }, anchor: null });
      
      manager.mergeOverlapping();
      expect(manager.count).toBe(1);
    });

    it('should merge overlapping selections', () => {
      manager.setSingleCursor(
        { line: 5, column: 10 },
        { line: 5, column: 5 }
      );
      manager.addCursor(
        { line: 5, column: 15 },
        { line: 5, column: 8 }
      );
      
      manager.mergeOverlapping();
      expect(manager.count).toBe(1);
      
      const cursor = manager.getPrimaryCursor();
      // Should merge to span from 5 to 15
      expect(cursor.anchor?.column).toBe(5);
      expect(cursor.caret.column).toBe(15);
    });

    it('should not merge non-overlapping cursors', () => {
      manager.setSingleCursor({ line: 1, column: 0 });
      manager.addCursor({ line: 3, column: 0 });
      manager.addCursor({ line: 5, column: 0 });
      
      manager.mergeOverlapping();
      expect(manager.count).toBe(3);
    });

    it('should handle multi-line selections', () => {
      manager.setSingleCursor(
        { line: 5, column: 0 },
        { line: 3, column: 0 }
      );
      manager.addCursor(
        { line: 7, column: 0 },
        { line: 4, column: 0 }
      );
      
      manager.mergeOverlapping();
      expect(manager.count).toBe(1);
      
      const cursor = manager.getPrimaryCursor();
      expect(cursor.anchor?.line).toBe(3);
      expect(cursor.caret.line).toBe(7);
    });
  });

  describe('getPrimaryCursor', () => {
    it('should return last added cursor', () => {
      manager.setSingleCursor({ line: 1, column: 0 });
      manager.addCursor({ line: 2, column: 0 });
      manager.addCursor({ line: 3, column: 0 });
      
      const primary = manager.getPrimaryCursor();
      // Primary is the last in sorted order (line 3)
      expect(primary.caret.line).toBe(3);
    });
  });
});

describe('findNextOccurrence', () => {
  const sampleText = `Hello world
This is a test
Hello again
test test test`;

  it('should find next occurrence of text', () => {
    const result = findNextOccurrence(
      sampleText,
      'test',
      { line: 0, column: 0 },
      true
    );
    
    expect(result).not.toBeNull();
    expect(result?.startPos.line).toBe(1);
    expect(result?.startPos.column).toBe(10);
    expect(result?.endPos.column).toBe(14);
  });

  it('should find occurrence after start position', () => {
    const result = findNextOccurrence(
      sampleText,
      'test',
      { line: 2, column: 0 },
      true
    );
    
    expect(result).not.toBeNull();
    expect(result?.startPos.line).toBe(3);
  });

  it('should wrap around to beginning', () => {
    const result = findNextOccurrence(
      sampleText,
      'Hello',
      { line: 3, column: 0 },
      true
    );
    
    expect(result).not.toBeNull();
    expect(result?.startPos.line).toBe(0);
    expect(result?.startPos.column).toBe(0);
  });

  it('should handle case-insensitive search', () => {
    const result = findNextOccurrence(
      sampleText,
      'HELLO',
      { line: 0, column: 0 },
      false
    );
    
    expect(result).not.toBeNull();
    expect(result?.startPos.line).toBe(0);
  });

  it('should return null if text not found', () => {
    const result = findNextOccurrence(
      sampleText,
      'nonexistent',
      { line: 0, column: 0 },
      true
    );
    
    expect(result).toBeNull();
  });

  it('should return null for empty search text', () => {
    const result = findNextOccurrence(
      sampleText,
      '',
      { line: 0, column: 0 },
      true
    );
    
    expect(result).toBeNull();
  });

  it('should find multiple occurrences on same line', () => {
    const result1 = findNextOccurrence(
      sampleText,
      'test',
      { line: 3, column: 0 },
      true
    );
    
    expect(result1?.startPos.column).toBe(0);
    
    const result2 = findNextOccurrence(
      sampleText,
      'test',
      { line: 3, column: 5 },
      true
    );
    
    expect(result2?.startPos.column).toBe(5);
  });

  it('should handle search at end of line', () => {
    const result = findNextOccurrence(
      'test',
      'test',
      { line: 0, column: 4 },
      true
    );
    
    expect(result).not.toBeNull();
    expect(result?.startPos.line).toBe(0);
    expect(result?.startPos.column).toBe(0);
  });
});
