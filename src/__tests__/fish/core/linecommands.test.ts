import { describe, it, expect } from 'vitest';
import {
  moveLinesUp,
  moveLinesDown,
  duplicateLines,
  deleteLines,
} from '@/fish/core/linecommands';

describe('moveLinesUp', () => {
  it('should move single line up', () => {
    const lines = ['line 1', 'line 2', 'line 3'];
    const result = moveLinesUp(lines, 1, 1);
    
    expect(result.lines).toEqual(['line 2', 'line 1', 'line 3']);
    expect(result.newStartLine).toBe(0);
    expect(result.newEndLine).toBe(0);
  });
  
  it('should move multiple lines up', () => {
    const lines = ['line 1', 'line 2', 'line 3', 'line 4'];
    const result = moveLinesUp(lines, 2, 3);
    
    expect(result.lines).toEqual(['line 1', 'line 3', 'line 4', 'line 2']);
    expect(result.newStartLine).toBe(1);
    expect(result.newEndLine).toBe(2);
  });
  
  it('should not move if already at top', () => {
    const lines = ['line 1', 'line 2', 'line 3'];
    const result = moveLinesUp(lines, 0, 0);
    
    expect(result.lines).toEqual(lines);
    expect(result.newStartLine).toBe(0);
    expect(result.newEndLine).toBe(0);
  });
  
  it('should not move if selection starts at top', () => {
    const lines = ['line 1', 'line 2', 'line 3'];
    const result = moveLinesUp(lines, 0, 1);
    
    expect(result.lines).toEqual(lines);
    expect(result.newStartLine).toBe(0);
    expect(result.newEndLine).toBe(1);
  });
  
  it('should preserve indentation', () => {
    const lines = ['  line 1', '    line 2', '  line 3'];
    const result = moveLinesUp(lines, 1, 1);
    
    expect(result.lines).toEqual(['    line 2', '  line 1', '  line 3']);
  });
  
  it('should handle invalid bounds', () => {
    const lines = ['line 1', 'line 2'];
    const result = moveLinesUp(lines, -1, 0);
    
    expect(result.lines).toEqual(lines);
    expect(result.newStartLine).toBe(-1);
    expect(result.newEndLine).toBe(0);
  });
});

describe('moveLinesDown', () => {
  it('should move single line down', () => {
    const lines = ['line 1', 'line 2', 'line 3'];
    const result = moveLinesDown(lines, 1, 1);
    
    expect(result.lines).toEqual(['line 1', 'line 3', 'line 2']);
    expect(result.newStartLine).toBe(2);
    expect(result.newEndLine).toBe(2);
  });
  
  it('should move multiple lines down', () => {
    const lines = ['line 1', 'line 2', 'line 3', 'line 4'];
    const result = moveLinesDown(lines, 0, 1);
    
    expect(result.lines).toEqual(['line 3', 'line 1', 'line 2', 'line 4']);
    expect(result.newStartLine).toBe(1);
    expect(result.newEndLine).toBe(2);
  });
  
  it('should not move if already at bottom', () => {
    const lines = ['line 1', 'line 2', 'line 3'];
    const result = moveLinesDown(lines, 2, 2);
    
    expect(result.lines).toEqual(lines);
    expect(result.newStartLine).toBe(2);
    expect(result.newEndLine).toBe(2);
  });
  
  it('should not move if selection ends at bottom', () => {
    const lines = ['line 1', 'line 2', 'line 3'];
    const result = moveLinesDown(lines, 1, 2);
    
    expect(result.lines).toEqual(lines);
    expect(result.newStartLine).toBe(1);
    expect(result.newEndLine).toBe(2);
  });
  
  it('should preserve indentation', () => {
    const lines = ['  line 1', '    line 2', '  line 3'];
    const result = moveLinesDown(lines, 0, 0);
    
    expect(result.lines).toEqual(['    line 2', '  line 1', '  line 3']);
  });
  
  it('should handle invalid bounds', () => {
    const lines = ['line 1', 'line 2'];
    const result = moveLinesDown(lines, 0, 5);
    
    expect(result.lines).toEqual(lines);
    expect(result.newStartLine).toBe(0);
    expect(result.newEndLine).toBe(5);
  });
});

describe('duplicateLines', () => {
  it('should duplicate single line down', () => {
    const lines = ['line 1', 'line 2', 'line 3'];
    const result = duplicateLines(lines, 1, 1, 'down');
    
    expect(result.lines).toEqual(['line 1', 'line 2', 'line 2', 'line 3']);
    expect(result.newStartLine).toBe(2);
    expect(result.newEndLine).toBe(2);
  });
  
  it('should duplicate single line up', () => {
    const lines = ['line 1', 'line 2', 'line 3'];
    const result = duplicateLines(lines, 1, 1, 'up');
    
    expect(result.lines).toEqual(['line 1', 'line 2', 'line 2', 'line 3']);
    expect(result.newStartLine).toBe(1);
    expect(result.newEndLine).toBe(1);
  });
  
  it('should duplicate multiple lines down', () => {
    const lines = ['line 1', 'line 2', 'line 3', 'line 4'];
    const result = duplicateLines(lines, 1, 2, 'down');
    
    expect(result.lines).toEqual(['line 1', 'line 2', 'line 3', 'line 2', 'line 3', 'line 4']);
    expect(result.newStartLine).toBe(3);
    expect(result.newEndLine).toBe(4);
  });
  
  it('should duplicate multiple lines up', () => {
    const lines = ['line 1', 'line 2', 'line 3', 'line 4'];
    const result = duplicateLines(lines, 1, 2, 'up');
    
    expect(result.lines).toEqual(['line 1', 'line 2', 'line 3', 'line 2', 'line 3', 'line 4']);
    expect(result.newStartLine).toBe(1);
    expect(result.newEndLine).toBe(2);
  });
  
  it('should default to down direction', () => {
    const lines = ['line 1', 'line 2'];
    const result = duplicateLines(lines, 0, 0);
    
    expect(result.lines).toEqual(['line 1', 'line 1', 'line 2']);
    expect(result.newStartLine).toBe(1);
    expect(result.newEndLine).toBe(1);
  });
  
  it('should preserve indentation when duplicating', () => {
    const lines = ['  line 1', '    line 2', '  line 3'];
    const result = duplicateLines(lines, 1, 1, 'down');
    
    expect(result.lines).toEqual(['  line 1', '    line 2', '    line 2', '  line 3']);
  });
  
  it('should duplicate at document boundaries', () => {
    const lines = ['line 1', 'line 2'];
    const result = duplicateLines(lines, 1, 1, 'down');
    
    expect(result.lines).toEqual(['line 1', 'line 2', 'line 2']);
    expect(result.newStartLine).toBe(2);
    expect(result.newEndLine).toBe(2);
  });
  
  it('should handle invalid bounds', () => {
    const lines = ['line 1', 'line 2'];
    const result = duplicateLines(lines, 5, 10, 'down');
    
    expect(result.lines).toEqual(lines);
    expect(result.newStartLine).toBe(5);
    expect(result.newEndLine).toBe(10);
  });
});

describe('deleteLines', () => {
  it('should delete single line', () => {
    const lines = ['line 1', 'line 2', 'line 3'];
    const result = deleteLines(lines, 1, 1);
    
    expect(result.lines).toEqual(['line 1', 'line 3']);
    expect(result.newStartLine).toBe(1);
    expect(result.newEndLine).toBe(1);
  });
  
  it('should delete multiple lines', () => {
    const lines = ['line 1', 'line 2', 'line 3', 'line 4'];
    const result = deleteLines(lines, 1, 2);
    
    expect(result.lines).toEqual(['line 1', 'line 4']);
    expect(result.newStartLine).toBe(1);
    expect(result.newEndLine).toBe(1);
  });
  
  it('should delete first line', () => {
    const lines = ['line 1', 'line 2', 'line 3'];
    const result = deleteLines(lines, 0, 0);
    
    expect(result.lines).toEqual(['line 2', 'line 3']);
    expect(result.newStartLine).toBe(0);
    expect(result.newEndLine).toBe(0);
  });
  
  it('should delete last line', () => {
    const lines = ['line 1', 'line 2', 'line 3'];
    const result = deleteLines(lines, 2, 2);
    
    expect(result.lines).toEqual(['line 1', 'line 2']);
    expect(result.newStartLine).toBe(1);
    expect(result.newEndLine).toBe(1);
  });
  
  it('should preserve at least one empty line when deleting all', () => {
    const lines = ['line 1'];
    const result = deleteLines(lines, 0, 0);
    
    expect(result.lines).toEqual(['']);
    expect(result.newStartLine).toBe(0);
    expect(result.newEndLine).toBe(0);
  });
  
  it('should adjust cursor when deleting at end of document', () => {
    const lines = ['line 1', 'line 2', 'line 3'];
    const result = deleteLines(lines, 1, 2);
    
    expect(result.lines).toEqual(['line 1']);
    expect(result.newStartLine).toBe(0);
    expect(result.newEndLine).toBe(0);
  });
  
  it('should handle invalid bounds', () => {
    const lines = ['line 1', 'line 2'];
    const result = deleteLines(lines, -1, 0);
    
    expect(result.lines).toEqual(lines);
    expect(result.newStartLine).toBe(-1);
    expect(result.newEndLine).toBe(0);
  });
});
