import type { DocPos } from "./history";

/**
 * Represents a single search match in the document
 */
export interface SearchMatch {
  startPos: DocPos;
  endPos: DocPos;
  text: string;
}

/**
 * Search options for customizing search behavior
 */
export interface SearchOptions {
  caseSensitive?: boolean;
  useRegex?: boolean;
  wholeWord?: boolean;
}

/**
 * Result of a search operation
 */
export interface SearchResult {
  matches: SearchMatch[];
  query: string;
  options: SearchOptions;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create a regex pattern from search query and options
 */
function createSearchPattern(query: string, options: SearchOptions): RegExp | null {
  if (!query) return null;

  try {
    let pattern = query;
    
    if (!options.useRegex) {
      // Escape special characters if not using regex
      pattern = escapeRegex(query);
    }

    if (options.wholeWord) {
      // Wrap pattern with word boundaries
      pattern = `\\b${pattern}\\b`;
    }

    const flags = options.caseSensitive ? 'g' : 'gi';
    return new RegExp(pattern, flags);
  } catch {
    // Invalid regex pattern
    return null;
  }
}

/**
 * Convert a line and column offset to a global character offset
 */
function posToOffset(lines: string[], pos: DocPos): number {
  let offset = 0;
  for (let i = 0; i < pos.line && i < lines.length; i++) {
    offset += lines[i].length + 1; // +1 for newline
  }
  offset += Math.min(pos.column, (lines[pos.line] || "").length);
  return offset;
}

/**
 * Convert a global character offset to line and column position
 */
function offsetToPos(lines: string[], offset: number): DocPos {
  let remaining = offset;
  let line = 0;

  while (line < lines.length) {
    const lineLength = lines[line].length;
    if (remaining <= lineLength) {
      return { line, column: remaining };
    }
    remaining -= lineLength + 1; // +1 for newline
    line++;
  }

  // If offset is beyond document, return last position
  const lastLine = Math.max(0, lines.length - 1);
  return { line: lastLine, column: (lines[lastLine] || "").length };
}

/**
 * Search for all occurrences of a pattern in text
 * 
 * @param text - The text to search in
 * @param query - The search query
 * @param options - Search options (case sensitivity, regex, whole word)
 * @returns Array of matches with their positions
 */
export function searchText(
  text: string,
  query: string,
  options: SearchOptions = {}
): SearchResult {
  const matches: SearchMatch[] = [];
  
  if (!query || !text) {
    return { matches, query, options };
  }

  const pattern = createSearchPattern(query, options);
  if (!pattern) {
    return { matches, query, options };
  }

  const lines = text.split('\n');
  const fullText = text;

  // Find all matches using regex
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(fullText)) !== null) {
    const startOffset = match.index;
    const endOffset = startOffset + match[0].length;

    const startPos = offsetToPos(lines, startOffset);
    const endPos = offsetToPos(lines, endOffset);

    matches.push({
      startPos,
      endPos,
      text: match[0]
    });

    // Prevent infinite loop for zero-length matches
    if (match[0].length === 0) {
      pattern.lastIndex++;
    }
  }

  return { matches, query, options };
}

/**
 * Find the next match starting from a given position
 * 
 * @param matches - Array of all matches
 * @param currentPos - Current cursor position
 * @param wrap - Whether to wrap around to the beginning if no match found
 * @returns Index of next match, or -1 if none found
 */
export function findNextMatch(
  matches: SearchMatch[],
  currentPos: DocPos,
  wrap: boolean = true
): number {
  if (matches.length === 0) return -1;

  // Find first match after current position
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    if (
      match.startPos.line > currentPos.line ||
      (match.startPos.line === currentPos.line && match.startPos.column >= currentPos.column)
    ) {
      return i;
    }
  }

  // If wrap is enabled, return first match
  return wrap ? 0 : -1;
}

/**
 * Find the previous match before a given position
 * 
 * @param matches - Array of all matches
 * @param currentPos - Current cursor position
 * @param wrap - Whether to wrap around to the end if no match found
 * @returns Index of previous match, or -1 if none found
 */
export function findPreviousMatch(
  matches: SearchMatch[],
  currentPos: DocPos,
  wrap: boolean = true
): number {
  if (matches.length === 0) return -1;

  // Find last match before current position
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    if (
      match.startPos.line < currentPos.line ||
      (match.startPos.line === currentPos.line && match.startPos.column < currentPos.column)
    ) {
      return i;
    }
  }

  // If wrap is enabled, return last match
  return wrap ? matches.length - 1 : -1;
}

/**
 * Replace a specific match with replacement text
 * 
 * @param text - Original text
 * @param match - The match to replace
 * @param replacement - Replacement text (supports $1, $2, etc. for regex groups if regex is used)
 * @param isRegex - Whether the original search was regex (for group substitution)
 * @returns Object with new text and the end position of the replacement
 */
export function replaceMatch(
  text: string,
  match: SearchMatch,
  replacement: string,
  _isRegex: boolean = false // Reserved for future regex group support ($1, $2, etc.)
): { text: string; endPos: DocPos } {
  const lines = text.split('\n');
  const startOffset = posToOffset(lines, match.startPos);
  const endOffset = posToOffset(lines, match.endPos);

  // For regex replacements, we would need the original regex pattern and groups
  // For now, we do simple text replacement
  // TODO: Enhance with regex group support ($1, $2, etc.)
  
  const before = text.substring(0, startOffset);
  const after = text.substring(endOffset);
  const newText = before + replacement + after;

  // Calculate new end position
  const newLines = newText.split('\n');
  const newEndOffset = startOffset + replacement.length;
  const endPos = offsetToPos(newLines, newEndOffset);

  return { text: newText, endPos };
}

/**
 * Replace all matches with replacement text
 * 
 * @param text - Original text
 * @param matches - Array of matches to replace
 * @param replacement - Replacement text
 * @param isRegex - Whether the original search was regex
 * @returns New text with all matches replaced
 */
export function replaceAllMatches(
  text: string,
  matches: SearchMatch[],
  replacement: string,
  _isRegex: boolean = false // Reserved for future regex group support
): string {
  if (matches.length === 0) return text;

  const lines = text.split('\n');
  const replacements: Array<{ start: number; end: number; text: string }> = [];

  // Collect all replacements
  for (const match of matches) {
    const startOffset = posToOffset(lines, match.startPos);
    const endOffset = posToOffset(lines, match.endPos);
    replacements.push({ start: startOffset, end: endOffset, text: replacement });
  }

  // Sort by start position (descending) to replace from end to beginning
  // This prevents offset shifts from affecting later replacements
  replacements.sort((a, b) => b.start - a.start);

  let result = text;
  for (const repl of replacements) {
    result = result.substring(0, repl.start) + repl.text + result.substring(repl.end);
  }

  return result;
}

/**
 * Get the current match index based on cursor position
 * Returns the index of the match that contains or is closest to the cursor
 */
export function getCurrentMatchIndex(
  matches: SearchMatch[],
  cursorPos: DocPos
): number {
  if (matches.length === 0) return -1;

  // Check if cursor is inside any match
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    if (
      (match.startPos.line < cursorPos.line ||
        (match.startPos.line === cursorPos.line && match.startPos.column <= cursorPos.column)) &&
      (match.endPos.line > cursorPos.line ||
        (match.endPos.line === cursorPos.line && match.endPos.column >= cursorPos.column))
    ) {
      return i;
    }
  }

  // Find closest match
  return findNextMatch(matches, cursorPos, false);
}
