import { describe, it, expect } from 'vitest';
import {
  isOpenBracket,
  isCloseBracket,
  getMatchingBracket,
  getBracketPair,
  findMatchingBracket,
  findBracketsAtCursor,
} from '@/fish/core/brackets';

describe('isOpenBracket', () => {
  it('should identify opening brackets', () => {
    expect(isOpenBracket('(')).toBe(true);
    expect(isOpenBracket('[')).toBe(true);
    expect(isOpenBracket('{')).toBe(true);
    expect(isOpenBracket('<')).toBe(true);
  });
  
  it('should reject closing brackets', () => {
    expect(isOpenBracket(')')).toBe(false);
    expect(isOpenBracket(']')).toBe(false);
    expect(isOpenBracket('}')).toBe(false);
    expect(isOpenBracket('>')).toBe(false);
  });
  
  it('should reject non-bracket characters', () => {
    expect(isOpenBracket('a')).toBe(false);
    expect(isOpenBracket('1')).toBe(false);
    expect(isOpenBracket(' ')).toBe(false);
  });
});

describe('isCloseBracket', () => {
  it('should identify closing brackets', () => {
    expect(isCloseBracket(')')).toBe(true);
    expect(isCloseBracket(']')).toBe(true);
    expect(isCloseBracket('}')).toBe(true);
    expect(isCloseBracket('>')).toBe(true);
  });
  
  it('should reject opening brackets', () => {
    expect(isCloseBracket('(')).toBe(false);
    expect(isCloseBracket('[')).toBe(false);
    expect(isCloseBracket('{')).toBe(false);
    expect(isCloseBracket('<')).toBe(false);
  });
  
  it('should reject non-bracket characters', () => {
    expect(isCloseBracket('a')).toBe(false);
    expect(isCloseBracket('1')).toBe(false);
    expect(isCloseBracket(' ')).toBe(false);
  });
});

describe('getMatchingBracket', () => {
  it('should return matching closing bracket for opening bracket', () => {
    expect(getMatchingBracket('(')).toBe(')');
    expect(getMatchingBracket('[')).toBe(']');
    expect(getMatchingBracket('{')).toBe('}');
    expect(getMatchingBracket('<')).toBe('>');
  });
  
  it('should return matching opening bracket for closing bracket', () => {
    expect(getMatchingBracket(')')).toBe('(');
    expect(getMatchingBracket(']')).toBe('[');
    expect(getMatchingBracket('}')).toBe('{');
    expect(getMatchingBracket('>')).toBe('<');
  });
  
  it('should return null for non-bracket characters', () => {
    expect(getMatchingBracket('a')).toBeNull();
    expect(getMatchingBracket('1')).toBeNull();
    expect(getMatchingBracket(' ')).toBeNull();
  });
});

describe('getBracketPair', () => {
  it('should return pair for opening bracket', () => {
    expect(getBracketPair('(')).toEqual({ open: '(', close: ')' });
    expect(getBracketPair('[')).toEqual({ open: '[', close: ']' });
  });
  
  it('should return pair for closing bracket', () => {
    expect(getBracketPair(')')).toEqual({ open: '(', close: ')' });
    expect(getBracketPair(']')).toEqual({ open: '[', close: ']' });
  });
  
  it('should return null for non-bracket', () => {
    expect(getBracketPair('a')).toBeNull();
  });
});

describe('findMatchingBracket', () => {
  it('should find matching closing bracket on same line', () => {
    const text = 'hello (world)';
    const result = findMatchingBracket(text, { line: 0, column: 6 }, '(');
    
    expect(result).toEqual({
      position: { line: 0, column: 12 },
      bracket: ')',
      type: 'close',
    });
  });
  
  it('should find matching opening bracket on same line', () => {
    const text = 'hello (world)';
    const result = findMatchingBracket(text, { line: 0, column: 12 }, ')');
    
    expect(result).toEqual({
      position: { line: 0, column: 6 },
      bracket: '(',
      type: 'open',
    });
  });
  
  it('should handle nested brackets', () => {
    const text = '((a + b) * c)';
    const result = findMatchingBracket(text, { line: 0, column: 0 }, '(');
    
    expect(result).toEqual({
      position: { line: 0, column: 12 },
      bracket: ')',
      type: 'close',
    });
  });
  
  it('should find match across multiple lines', () => {
    const text = 'function test() {\n  return 42;\n}';
    const result = findMatchingBracket(text, { line: 0, column: 16 }, '{');
    
    expect(result).toEqual({
      position: { line: 2, column: 0 },
      bracket: '}',
      type: 'close',
    });
  });
  
  it('should find match backward across multiple lines', () => {
    const text = 'function test() {\n  return 42;\n}';
    const result = findMatchingBracket(text, { line: 2, column: 0 }, '}');
    
    expect(result).toEqual({
      position: { line: 0, column: 16 },
      bracket: '{',
      type: 'open',
    });
  });
  
  it('should handle deeply nested brackets', () => {
    const text = '[[[a]]]';
    const result = findMatchingBracket(text, { line: 0, column: 0 }, '[');
    
    expect(result).toEqual({
      position: { line: 0, column: 6 },
      bracket: ']',
      type: 'close',
    });
  });
  
  it('should return null for unmatched bracket', () => {
    const text = 'hello (world';
    const result = findMatchingBracket(text, { line: 0, column: 6 }, '(');
    
    expect(result).toBeNull();
  });
  
  it('should return null for invalid position', () => {
    const text = 'hello';
    const result = findMatchingBracket(text, { line: 5, column: 0 }, '(');
    
    expect(result).toBeNull();
  });
  
  it('should handle mixed bracket types', () => {
    const text = '[({})]';
    const result = findMatchingBracket(text, { line: 0, column: 0 }, '[');
    
    expect(result).toEqual({
      position: { line: 0, column: 5 },
      bracket: ']',
      type: 'close',
    });
  });
  
  it('should find correct match with multiple same brackets', () => {
    const text = '(a)(b)(c)';
    const result = findMatchingBracket(text, { line: 0, column: 3 }, '(');
    
    expect(result).toEqual({
      position: { line: 0, column: 5 },
      bracket: ')',
      type: 'close',
    });
  });
});

describe('findBracketsAtCursor', () => {
  it('should find bracket at cursor position', () => {
    const text = 'hello (world)';
    const result = findBracketsAtCursor(text, { line: 0, column: 6 });
    
    expect(result).toHaveLength(1);
    expect(result[0].position).toEqual({ line: 0, column: 12 });
    expect(result[0].bracket).toBe(')');
  });
  
  it('should find bracket before cursor position', () => {
    const text = 'hello (world)';
    const result = findBracketsAtCursor(text, { line: 0, column: 7 });
    
    expect(result).toHaveLength(1);
    expect(result[0].position).toEqual({ line: 0, column: 12 });
    expect(result[0].bracket).toBe(')');
  });
  
  it('should find both brackets when between closing and opening', () => {
    const text = '(a)(b)';
    const result = findBracketsAtCursor(text, { line: 0, column: 3 });
    
    expect(result).toHaveLength(2);
  });
  
  it('should return empty array when no brackets nearby', () => {
    const text = 'hello world';
    const result = findBracketsAtCursor(text, { line: 0, column: 6 });
    
    expect(result).toHaveLength(0);
  });
  
  it('should return empty array when bracket has no match', () => {
    const text = 'hello (world';
    const result = findBracketsAtCursor(text, { line: 0, column: 6 });
    
    expect(result).toHaveLength(0);
  });
  
  it('should handle cursor at start of line', () => {
    const text = '(hello)';
    const result = findBracketsAtCursor(text, { line: 0, column: 0 });
    
    expect(result).toHaveLength(1);
    expect(result[0].position).toEqual({ line: 0, column: 6 });
  });
  
  it('should handle cursor at end of line', () => {
    const text = '(hello)';
    const result = findBracketsAtCursor(text, { line: 0, column: 7 });
    
    expect(result).toHaveLength(1);
    expect(result[0].position).toEqual({ line: 0, column: 0 });
  });
  
  it('should handle invalid cursor position', () => {
    const text = 'hello';
    const result = findBracketsAtCursor(text, { line: 5, column: 0 });
    
    expect(result).toHaveLength(0);
  });
  
  it('should work with multiline text', () => {
    const text = 'function test() {\n  return 42;\n}';
    const result = findBracketsAtCursor(text, { line: 0, column: 16 });
    
    expect(result).toHaveLength(1);
    expect(result[0].position).toEqual({ line: 2, column: 0 });
    expect(result[0].bracket).toBe('}');
  });
});
