import { describe, it, expect } from 'vitest';
import {
  searchText,
  findNextMatch,
  findPreviousMatch,
  replaceMatch,
  replaceAllMatches,
  getCurrentMatchIndex,
  type SearchMatch,
} from '../../../fish/core/search';

describe('Search Core Module', () => {
  describe('searchText - basic text search', () => {
    it('should find single occurrence', () => {
      const text = 'Hello World';
      const result = searchText(text, 'World');
      
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].text).toBe('World');
      expect(result.matches[0].startPos).toEqual({ line: 0, column: 6 });
      expect(result.matches[0].endPos).toEqual({ line: 0, column: 11 });
    });

    it('should find multiple occurrences', () => {
      const text = 'foo bar foo baz foo';
      const result = searchText(text, 'foo');
      
      expect(result.matches).toHaveLength(3);
      expect(result.matches[0].startPos).toEqual({ line: 0, column: 0 });
      expect(result.matches[1].startPos).toEqual({ line: 0, column: 8 });
      expect(result.matches[2].startPos).toEqual({ line: 0, column: 16 });
    });

    it('should find matches across multiple lines', () => {
      const text = 'line one\nline two\nline three';
      const result = searchText(text, 'line');
      
      expect(result.matches).toHaveLength(3);
      expect(result.matches[0].startPos).toEqual({ line: 0, column: 0 });
      expect(result.matches[1].startPos).toEqual({ line: 1, column: 0 });
      expect(result.matches[2].startPos).toEqual({ line: 2, column: 0 });
    });

    it('should return empty array when no matches found', () => {
      const text = 'Hello World';
      const result = searchText(text, 'xyz');
      
      expect(result.matches).toHaveLength(0);
    });

    it('should return empty array for empty query', () => {
      const text = 'Hello World';
      const result = searchText(text, '');
      
      expect(result.matches).toHaveLength(0);
    });

    it('should return empty array for empty text', () => {
      const text = '';
      const result = searchText(text, 'hello');
      
      expect(result.matches).toHaveLength(0);
    });
  });

  describe('searchText - case sensitivity', () => {
    it('should be case-insensitive by default', () => {
      const text = 'Hello HELLO hello';
      const result = searchText(text, 'hello');
      
      expect(result.matches).toHaveLength(3);
    });

    it('should respect case-sensitive option', () => {
      const text = 'Hello HELLO hello';
      const result = searchText(text, 'hello', { caseSensitive: true });
      
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].text).toBe('hello');
    });

    it('should find uppercase matches with case-sensitive', () => {
      const text = 'Hello HELLO hello';
      const result = searchText(text, 'HELLO', { caseSensitive: true });
      
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].text).toBe('HELLO');
    });
  });

  describe('searchText - whole word matching', () => {
    it('should match whole words only', () => {
      const text = 'cat catch cathedral';
      const result = searchText(text, 'cat', { wholeWord: true });
      
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].text).toBe('cat');
      expect(result.matches[0].startPos).toEqual({ line: 0, column: 0 });
    });

    it('should match word with punctuation boundaries', () => {
      const text = 'hello, world! hello.';
      const result = searchText(text, 'hello', { wholeWord: true });
      
      expect(result.matches).toHaveLength(2);
    });

    it('should not match partial words', () => {
      const text = 'javascript typescript';
      const result = searchText(text, 'script', { wholeWord: true });
      
      expect(result.matches).toHaveLength(0);
    });
  });

  describe('searchText - regex patterns', () => {
    it('should support basic regex patterns', () => {
      const text = 'test123 test456 test789';
      const result = searchText(text, 'test\\d+', { useRegex: true });
      
      expect(result.matches).toHaveLength(3);
    });

    it('should support character classes', () => {
      const text = 'cat bat rat mat';
      const result = searchText(text, '[cbr]at', { useRegex: true });
      
      expect(result.matches).toHaveLength(3);
    });

    it('should support quantifiers', () => {
      const text = 'a aa aaa aaaa';
      const result = searchText(text, 'a{2,3}', { useRegex: true });
      
      expect(result.matches).toHaveLength(3); // aa, aaa, aaa (first 3 from aaaa)
    });

    it('should support alternation', () => {
      const text = 'cat dog bird cat';
      const result = searchText(text, 'cat|dog', { useRegex: true });
      
      expect(result.matches).toHaveLength(3);
    });

    it('should handle invalid regex gracefully', () => {
      const text = 'hello world';
      const result = searchText(text, '[invalid(', { useRegex: true });
      
      expect(result.matches).toHaveLength(0);
    });

    it('should escape special characters when not using regex', () => {
      const text = 'price: $10.00';
      const result = searchText(text, '$10.00', { useRegex: false });
      
      expect(result.matches).toHaveLength(1);
    });
  });

  describe('findNextMatch', () => {
    const createMatches = (): SearchMatch[] => [
      { startPos: { line: 0, column: 0 }, endPos: { line: 0, column: 3 }, text: 'foo' },
      { startPos: { line: 0, column: 8 }, endPos: { line: 0, column: 11 }, text: 'foo' },
      { startPos: { line: 1, column: 5 }, endPos: { line: 1, column: 8 }, text: 'foo' },
      { startPos: { line: 2, column: 0 }, endPos: { line: 2, column: 3 }, text: 'foo' }
    ];

    it('should find next match after cursor', () => {
      const matches = createMatches();
      const index = findNextMatch(matches, { line: 0, column: 5 });
      
      expect(index).toBe(1);
    });

    it('should find first match when cursor is before all matches', () => {
      const matches = createMatches();
      const index = findNextMatch(matches, { line: 0, column: 0 });
      
      expect(index).toBe(0);
    });

    it('should wrap to beginning when at end', () => {
      const matches = createMatches();
      const index = findNextMatch(matches, { line: 3, column: 0 }, true);
      
      expect(index).toBe(0);
    });

    it('should not wrap when wrap is false', () => {
      const matches = createMatches();
      const index = findNextMatch(matches, { line: 3, column: 0 }, false);
      
      expect(index).toBe(-1);
    });

    it('should return -1 for empty matches', () => {
      const index = findNextMatch([], { line: 0, column: 0 });
      
      expect(index).toBe(-1);
    });
  });

  describe('findPreviousMatch', () => {
    const createMatches = (): SearchMatch[] => [
      { startPos: { line: 0, column: 0 }, endPos: { line: 0, column: 3 }, text: 'foo' },
      { startPos: { line: 0, column: 8 }, endPos: { line: 0, column: 11 }, text: 'foo' },
      { startPos: { line: 1, column: 5 }, endPos: { line: 1, column: 8 }, text: 'foo' },
      { startPos: { line: 2, column: 0 }, endPos: { line: 2, column: 3 }, text: 'foo' }
    ];

    it('should find previous match before cursor', () => {
      const matches = createMatches();
      const index = findPreviousMatch(matches, { line: 1, column: 0 });
      
      expect(index).toBe(1);
    });

    it('should find last match when cursor is after all matches', () => {
      const matches = createMatches();
      const index = findPreviousMatch(matches, { line: 3, column: 0 });
      
      expect(index).toBe(3);
    });

    it('should wrap to end when at beginning', () => {
      const matches = createMatches();
      const index = findPreviousMatch(matches, { line: 0, column: 0 }, true);
      
      expect(index).toBe(3);
    });

    it('should not wrap when wrap is false', () => {
      const matches = createMatches();
      const index = findPreviousMatch(matches, { line: 0, column: 0 }, false);
      
      expect(index).toBe(-1);
    });

    it('should return -1 for empty matches', () => {
      const index = findPreviousMatch([], { line: 0, column: 0 });
      
      expect(index).toBe(-1);
    });
  });

  describe('replaceMatch', () => {
    it('should replace single match in single line', () => {
      const text = 'Hello World';
      const match: SearchMatch = {
        startPos: { line: 0, column: 6 },
        endPos: { line: 0, column: 11 },
        text: 'World'
      };
      
      const result = replaceMatch(text, match, 'Universe');
      
      expect(result.text).toBe('Hello Universe');
      expect(result.endPos).toEqual({ line: 0, column: 14 });
    });

    it('should replace match with shorter text', () => {
      const text = 'Hello World';
      const match: SearchMatch = {
        startPos: { line: 0, column: 6 },
        endPos: { line: 0, column: 11 },
        text: 'World'
      };
      
      const result = replaceMatch(text, match, 'Hi');
      
      expect(result.text).toBe('Hello Hi');
    });

    it('should replace match in multiline text', () => {
      const text = 'line one\nline two\nline three';
      const match: SearchMatch = {
        startPos: { line: 1, column: 5 },
        endPos: { line: 1, column: 8 },
        text: 'two'
      };
      
      const result = replaceMatch(text, match, '2');
      
      expect(result.text).toBe('line one\nline 2\nline three');
    });

    it('should replace with empty string', () => {
      const text = 'Hello World';
      const match: SearchMatch = {
        startPos: { line: 0, column: 5 },
        endPos: { line: 0, column: 11 },
        text: ' World'
      };
      
      const result = replaceMatch(text, match, '');
      
      expect(result.text).toBe('Hello');
    });
  });

  describe('replaceAllMatches', () => {
    it('should replace all matches', () => {
      const text = 'foo bar foo baz foo';
      const matches: SearchMatch[] = [
        { startPos: { line: 0, column: 0 }, endPos: { line: 0, column: 3 }, text: 'foo' },
        { startPos: { line: 0, column: 8 }, endPos: { line: 0, column: 11 }, text: 'foo' },
        { startPos: { line: 0, column: 16 }, endPos: { line: 0, column: 19 }, text: 'foo' }
      ];
      
      const result = replaceAllMatches(text, matches, 'bar');
      
      expect(result).toBe('bar bar bar baz bar');
    });

    it('should replace all matches across multiple lines', () => {
      const text = 'line one\nline two\nline three';
      const matches: SearchMatch[] = [
        { startPos: { line: 0, column: 0 }, endPos: { line: 0, column: 4 }, text: 'line' },
        { startPos: { line: 1, column: 0 }, endPos: { line: 1, column: 4 }, text: 'line' },
        { startPos: { line: 2, column: 0 }, endPos: { line: 2, column: 4 }, text: 'line' }
      ];
      
      const result = replaceAllMatches(text, matches, 'row');
      
      expect(result).toBe('row one\nrow two\nrow three');
    });

    it('should handle empty matches array', () => {
      const text = 'Hello World';
      const result = replaceAllMatches(text, [], 'replacement');
      
      expect(result).toBe('Hello World');
    });

    it('should replace with different length text', () => {
      const text = 'a b a b a';
      const matches: SearchMatch[] = [
        { startPos: { line: 0, column: 0 }, endPos: { line: 0, column: 1 }, text: 'a' },
        { startPos: { line: 0, column: 4 }, endPos: { line: 0, column: 5 }, text: 'a' },
        { startPos: { line: 0, column: 8 }, endPos: { line: 0, column: 9 }, text: 'a' }
      ];
      
      const result = replaceAllMatches(text, matches, 'longer');
      
      expect(result).toBe('longer b longer b longer');
    });
  });

  describe('getCurrentMatchIndex', () => {
    const createMatches = (): SearchMatch[] => [
      { startPos: { line: 0, column: 0 }, endPos: { line: 0, column: 3 }, text: 'foo' },
      { startPos: { line: 0, column: 8 }, endPos: { line: 0, column: 11 }, text: 'foo' },
      { startPos: { line: 1, column: 5 }, endPos: { line: 1, column: 8 }, text: 'foo' }
    ];

    it('should find match containing cursor', () => {
      const matches = createMatches();
      const index = getCurrentMatchIndex(matches, { line: 0, column: 1 });
      
      expect(index).toBe(0);
    });

    it('should find match at cursor start', () => {
      const matches = createMatches();
      const index = getCurrentMatchIndex(matches, { line: 0, column: 0 });
      
      expect(index).toBe(0);
    });

    it('should find match at cursor end', () => {
      const matches = createMatches();
      const index = getCurrentMatchIndex(matches, { line: 0, column: 3 });
      
      expect(index).toBe(0);
    });

    it('should find next match when cursor between matches', () => {
      const matches = createMatches();
      const index = getCurrentMatchIndex(matches, { line: 0, column: 5 });
      
      expect(index).toBe(1);
    });

    it('should return -1 when no matches after cursor', () => {
      const matches = createMatches();
      const index = getCurrentMatchIndex(matches, { line: 5, column: 0 });
      
      expect(index).toBe(-1);
    });

    it('should return -1 for empty matches', () => {
      const index = getCurrentMatchIndex([], { line: 0, column: 0 });
      
      expect(index).toBe(-1);
    });
  });

  describe('edge cases', () => {
    it('should handle search at document boundaries', () => {
      const text = 'start middle end';
      
      const startResult = searchText(text, 'start');
      expect(startResult.matches[0].startPos).toEqual({ line: 0, column: 0 });
      
      const endResult = searchText(text, 'end');
      expect(endResult.matches[0].endPos).toEqual({ line: 0, column: 16 });
    });

    it('should handle overlapping potential matches', () => {
      const text = 'aaaa';
      const result = searchText(text, 'aa');
      
      // Should find non-overlapping matches
      expect(result.matches).toHaveLength(2);
    });

    it('should handle special characters in non-regex search', () => {
      const text = 'cost is $100 (approx)';
      const result = searchText(text, '$100', { useRegex: false });
      
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].text).toBe('$100');
    });

    it('should handle newlines in search query', () => {
      const text = 'line one\nline two';
      const result = searchText(text, 'one\nline');
      
      expect(result.matches).toHaveLength(1);
    });

    it('should handle unicode characters', () => {
      const text = '🎉 Hello 世界 🎉';
      const result = searchText(text, '🎉');
      
      expect(result.matches).toHaveLength(2);
    });
  });
});
