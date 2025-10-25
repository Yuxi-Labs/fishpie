import { describe, it, expect } from 'vitest';
import {
  getCommentConfig,
  isLineCommented,
  toggleLineComments,
  calculateColumnOffset,
  toggleBlockComment,
} from '../../../fish/core/comments';

describe('getCommentConfig', () => {
  it('should return JavaScript config', () => {
    const config = getCommentConfig('javascript');
    expect(config.lineComment).toBe('//');
    expect(config.blockCommentStart).toBe('/*');
    expect(config.blockCommentEnd).toBe('*/');
  });

  it('should return TypeScript config', () => {
    const config = getCommentConfig('typescript');
    expect(config.lineComment).toBe('//');
    expect(config.blockCommentStart).toBe('/*');
  });

  it('should return HTML config', () => {
    const config = getCommentConfig('html');
    expect(config.blockCommentStart).toBe('<!--');
    expect(config.blockCommentEnd).toBe('-->');
  });

  it('should return Python config', () => {
    const config = getCommentConfig('python');
    expect(config.lineComment).toBe('#');
  });

  it('should return default config for unknown language', () => {
    const config = getCommentConfig('unknown');
    expect(config.lineComment).toBe('//');
  });
});

describe('isLineCommented', () => {
  it('should detect commented line', () => {
    expect(isLineCommented('// hello', '//')).toBe(true);
  });

  it('should detect commented line with leading whitespace', () => {
    expect(isLineCommented('  // hello', '//')).toBe(true);
  });

  it('should detect hash comment', () => {
    expect(isLineCommented('# comment', '#')).toBe(true);
  });

  it('should return false for uncommented line', () => {
    expect(isLineCommented('hello', '//')).toBe(false);
  });

  it('should return false for comment in middle of line', () => {
    expect(isLineCommented('hello // comment', '//')).toBe(false);
  });

  it('should handle empty line', () => {
    expect(isLineCommented('', '//')).toBe(false);
  });
});

describe('toggleLineComments', () => {
  it('should comment uncommented lines', () => {
    const lines = ['hello', 'world'];
    const result = toggleLineComments(lines, 0, 1, '//');
    
    expect(result.lines[0]).toBe('// hello');
    expect(result.lines[1]).toBe('// world');
  });

  it('should uncomment commented lines', () => {
    const lines = ['// hello', '// world'];
    const result = toggleLineComments(lines, 0, 1, '//');
    
    expect(result.lines[0]).toBe('hello');
    expect(result.lines[1]).toBe('world');
  });

  it('should preserve indentation when commenting', () => {
    const lines = ['  hello', '    world'];
    const result = toggleLineComments(lines, 0, 1, '//');
    
    expect(result.lines[0]).toBe('  // hello');
    expect(result.lines[1]).toBe('    // world');
  });

  it('should preserve indentation when uncommenting', () => {
    const lines = ['  // hello', '    // world'];
    const result = toggleLineComments(lines, 0, 1, '//');
    
    expect(result.lines[0]).toBe('  hello');
    expect(result.lines[1]).toBe('    world');
  });

  it('should comment all lines if any is uncommented', () => {
    const lines = ['// hello', 'world', '// test'];
    const result = toggleLineComments(lines, 0, 2, '//');
    
    expect(result.lines[0]).toBe('// // hello');
    expect(result.lines[1]).toBe('// world');
    expect(result.lines[2]).toBe('// // test');
  });

  it('should handle single line', () => {
    const lines = ['hello'];
    const result = toggleLineComments(lines, 0, 0, '//');
    
    expect(result.lines[0]).toBe('// hello');
  });

  it('should not modify empty lines', () => {
    const lines = ['hello', '', 'world'];
    const result = toggleLineComments(lines, 0, 2, '//');
    
    expect(result.lines[0]).toBe('// hello');
    expect(result.lines[1]).toBe('');
    expect(result.lines[2]).toBe('// world');
  });

  it('should handle hash comments', () => {
    const lines = ['print("hello")', 'print("world")'];
    const result = toggleLineComments(lines, 0, 1, '#');
    
    expect(result.lines[0]).toBe('# print("hello")');
    expect(result.lines[1]).toBe('# print("world")');
  });

  it('should uncomment hash comments', () => {
    const lines = ['# print("hello")', '# print("world")'];
    const result = toggleLineComments(lines, 0, 1, '#');
    
    expect(result.lines[0]).toBe('print("hello")');
    expect(result.lines[1]).toBe('print("world")');
  });

  it('should handle out of bounds indices', () => {
    const lines = ['hello', 'world'];
    const result = toggleLineComments(lines, -1, 10, '//');
    
    expect(result.lines[0]).toBe('// hello');
    expect(result.lines[1]).toBe('// world');
  });

  it('should not modify lines outside range', () => {
    const lines = ['first', 'second', 'third'];
    const result = toggleLineComments(lines, 1, 1, '//');
    
    expect(result.lines[0]).toBe('first');
    expect(result.lines[1]).toBe('// second');
    expect(result.lines[2]).toBe('third');
  });

  it('should handle comments without trailing space', () => {
    const lines = ['//hello', '//world'];
    const result = toggleLineComments(lines, 0, 1, '//');
    
    expect(result.lines[0]).toBe('hello');
    expect(result.lines[1]).toBe('world');
  });

  it('should treat whitespace-only lines as empty', () => {
    const lines = ['hello', '   ', 'world'];
    const result = toggleLineComments(lines, 0, 2, '//');
    
    // All non-empty lines should get commented
    expect(result.lines[0]).toBe('// hello');
    expect(result.lines[1]).toBe('   '); // Whitespace-only stays unchanged
    expect(result.lines[2]).toBe('// world');
  });
});

describe('calculateColumnOffset', () => {
  it('should return positive offset when commenting', () => {
    const offset = calculateColumnOffset(false, '//');
    expect(offset).toBe(3); // "//" + space
  });

  it('should return negative offset when uncommenting', () => {
    const offset = calculateColumnOffset(true, '//');
    expect(offset).toBe(-3);
  });

  it('should handle different comment prefixes', () => {
    const offset = calculateColumnOffset(false, '#');
    expect(offset).toBe(2); // "#" + space
  });
});

describe('toggleBlockComment', () => {
  it('should add block comment', () => {
    const result = toggleBlockComment('hello', '/*', '*/');
    expect(result).toBe('/* hello */');
  });

  it('should remove block comment', () => {
    const result = toggleBlockComment('/* hello */', '/*', '*/');
    expect(result).toBe('hello');
  });

  it('should handle HTML comments', () => {
    const result = toggleBlockComment('text', '<!--', '-->');
    expect(result).toBe('<!-- text -->');
  });

  it('should remove HTML comments', () => {
    const result = toggleBlockComment('<!-- text -->', '<!--', '-->');
    expect(result).toBe('text');
  });

  it('should handle multi-line text', () => {
    const text = 'line1\nline2';
    const result = toggleBlockComment(text, '/*', '*/');
    expect(result).toBe('/* line1\nline2 */');
  });

  it('should handle text with whitespace', () => {
    const result = toggleBlockComment('  hello  ', '/*', '*/');
    expect(result).toBe('/* hello */');
  });
});
