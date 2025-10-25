/**
 * Bracket Matching Module
 * 
 * Provides utilities for detecting and matching bracket pairs:
 * - Parentheses: ()
 * - Square brackets: []
 * - Curly braces: {}
 * - Angle brackets: <>
 * 
 * Used for highlighting matching brackets when cursor is adjacent to one.
 */

import type { DocPos } from './document';

/**
 * Bracket pair configuration.
 */
export interface BracketPair {
  open: string;
  close: string;
}

/**
 * Standard bracket pairs supported for matching.
 */
export const BRACKET_PAIRS: BracketPair[] = [
  { open: '(', close: ')' },
  { open: '[', close: ']' },
  { open: '{', close: '}' },
  { open: '<', close: '>' },
];

/**
 * Result of a bracket match operation.
 */
export interface BracketMatch {
  /**
   * Position of the matching bracket.
   */
  position: DocPos;
  
  /**
   * The bracket character that was matched.
   */
  bracket: string;
  
  /**
   * Whether this is an opening or closing bracket.
   */
  type: 'open' | 'close';
}

/**
 * Check if a character is an opening bracket.
 */
export function isOpenBracket(char: string): boolean {
  return BRACKET_PAIRS.some(pair => pair.open === char);
}

/**
 * Check if a character is a closing bracket.
 */
export function isCloseBracket(char: string): boolean {
  return BRACKET_PAIRS.some(pair => pair.close === char);
}

/**
 * Get the matching bracket character for a given bracket.
 */
export function getMatchingBracket(bracket: string): string | null {
  for (const pair of BRACKET_PAIRS) {
    if (pair.open === bracket) return pair.close;
    if (pair.close === bracket) return pair.open;
  }
  return null;
}

/**
 * Get the bracket pair for a given bracket character.
 */
export function getBracketPair(bracket: string): BracketPair | null {
  return BRACKET_PAIRS.find(
    pair => pair.open === bracket || pair.close === bracket
  ) || null;
}

/**
 * Find the matching bracket for a bracket at the given position.
 * Handles nested brackets correctly.
 * 
 * @param text Full document text
 * @param pos Position of the bracket to match
 * @param bracket The bracket character at the position
 * @returns Match information if found, null otherwise
 */
export function findMatchingBracket(
  text: string,
  pos: DocPos,
  bracket: string
): BracketMatch | null {
  const pair = getBracketPair(bracket);
  if (!pair) return null;
  
  const isOpen = bracket === pair.open;
  const targetBracket = isOpen ? pair.close : pair.open;
  const direction = isOpen ? 1 : -1; // Forward for open, backward for close
  
  // Convert text to array of lines for easier navigation
  const lines = text.split('\n');
  
  // Validate position
  if (pos.line < 0 || pos.line >= lines.length) return null;
  if (pos.column < 0 || pos.column >= lines[pos.line].length) return null;
  
  let depth = 1; // Start with depth 1 (the bracket we're matching)
  let currentLine = pos.line;
  let currentCol = pos.column + direction; // Start from next/previous character
  
  while (currentLine >= 0 && currentLine < lines.length) {
    const line = lines[currentLine];
    
    // Adjust column bounds based on direction
    if (direction === 1) {
      // Forward search
      while (currentCol < line.length) {
        const char = line[currentCol];
        
        if (char === bracket) {
          depth++;
        } else if (char === targetBracket) {
          depth--;
          if (depth === 0) {
            return {
              position: { line: currentLine, column: currentCol },
              bracket: targetBracket,
              type: isOpen ? 'close' : 'open',
            };
          }
        }
        
        currentCol++;
      }
      
      // Move to next line
      currentLine++;
      currentCol = 0;
    } else {
      // Backward search
      while (currentCol >= 0) {
        const char = line[currentCol];
        
        if (char === bracket) {
          depth++;
        } else if (char === targetBracket) {
          depth--;
          if (depth === 0) {
            return {
              position: { line: currentLine, column: currentCol },
              bracket: targetBracket,
              type: isOpen ? 'close' : 'open',
            };
          }
        }
        
        currentCol--;
      }
      
      // Move to previous line
      currentLine--;
      if (currentLine >= 0) {
        currentCol = lines[currentLine].length - 1;
      }
    }
  }
  
  return null; // No match found
}

/**
 * Find bracket matches at or adjacent to a cursor position.
 * Checks both the character at the cursor and the character before it.
 * 
 * @param text Full document text
 * @param pos Cursor position
 * @returns Array of bracket matches (0, 1, or 2 matches)
 */
export function findBracketsAtCursor(
  text: string,
  pos: DocPos
): BracketMatch[] {
  const lines = text.split('\n');
  
  if (pos.line < 0 || pos.line >= lines.length) {
    return [];
  }
  
  const line = lines[pos.line];
  const matches: BracketMatch[] = [];
  
  // Check character at cursor
  if (pos.column < line.length) {
    const charAtCursor = line[pos.column];
    if (isOpenBracket(charAtCursor) || isCloseBracket(charAtCursor)) {
      const match = findMatchingBracket(text, pos, charAtCursor);
      if (match) {
        matches.push(match);
      }
    }
  }
  
  // Check character before cursor
  if (pos.column > 0) {
    const charBeforeCursor = line[pos.column - 1];
    if (isOpenBracket(charBeforeCursor) || isCloseBracket(charBeforeCursor)) {
      const match = findMatchingBracket(
        text,
        { line: pos.line, column: pos.column - 1 },
        charBeforeCursor
      );
      if (match) {
        matches.push(match);
      }
    }
  }
  
  return matches;
}
