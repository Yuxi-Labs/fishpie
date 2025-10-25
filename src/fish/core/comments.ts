/**
 * Comment toggling utilities for the Fish editor.
 * Handles language-specific comment syntax detection and toggling.
 */

export interface CommentConfig {
  /** Line comment prefix (e.g., "//" for JavaScript) */
  lineComment?: string;
  /** Block comment start (e.g., "/*" for JavaScript) */
  blockCommentStart?: string;
  /** Block comment end (e.g., closing star-slash for JavaScript) */
  blockCommentEnd?: string;
}

/**
 * Get comment configuration for a language.
 */
export function getCommentConfig(languageId: string): CommentConfig {
  const configs: Record<string, CommentConfig> = {
    javascript: { lineComment: '//', blockCommentStart: '/*', blockCommentEnd: '*/' },
    typescript: { lineComment: '//', blockCommentStart: '/*', blockCommentEnd: '*/' },
    html: { blockCommentStart: '<!--', blockCommentEnd: '-->' },
    css: { blockCommentStart: '/*', blockCommentEnd: '*/' },
    scss: { lineComment: '//', blockCommentStart: '/*', blockCommentEnd: '*/' },
    python: { lineComment: '#' },
    shell: { lineComment: '#' },
    bash: { lineComment: '#' },
    markdown: { blockCommentStart: '<!--', blockCommentEnd: '-->' },
    plaintext: { lineComment: '//' }, // Default fallback
  };

  return configs[languageId] || { lineComment: '//' };
}

/**
 * Check if a line is commented with the given comment prefix.
 * A line is considered commented if the first non-whitespace characters are the comment prefix.
 */
export function isLineCommented(line: string, commentPrefix: string): boolean {
  const trimmed = line.trimStart();
  return trimmed.startsWith(commentPrefix);
}

/**
 * Result of a line comment toggle operation.
 */
export interface ToggleResult {
  /** Modified lines array. */
  lines: string[];
  /** True if lines were commented before the operation (i.e., they were uncommented). */
  wasCommented: boolean;
}

/**
 * Toggle comments on a range of lines.
 * If all lines are commented, uncomments them.
 * If any line is not commented, comments all lines.
 * 
 * @param lines Array of text lines
 * @param startLine Starting line index (inclusive)
 * @param endLine Ending line index (inclusive)
 * @param commentPrefix Comment prefix to use (e.g., "//")
 * @returns Result with modified lines and whether they were commented before
 */
export function toggleLineComments(
  lines: string[],
  startLine: number,
  endLine: number,
  commentPrefix: string
): ToggleResult {
  // Clamp line indices
  const start = Math.max(0, startLine);
  const end = Math.min(lines.length - 1, endLine);

  // Check if all non-empty lines in range are commented
  let allCommented = true;
  for (let i = start; i <= end; i++) {
    const line = lines[i];
    if (line.trim().length > 0 && !isLineCommented(line, commentPrefix)) {
      allCommented = false;
      break;
    }
  }

  // Create new lines array
  const newLines = [...lines];

  if (allCommented) {
    // Uncomment: remove comment prefix
    for (let i = start; i <= end; i++) {
      newLines[i] = uncommentLine(newLines[i], commentPrefix);
    }
  } else {
    // Comment: add comment prefix
    for (let i = start; i <= end; i++) {
      newLines[i] = commentLine(newLines[i], commentPrefix);
    }
  }

  return {
    lines: newLines,
    wasCommented: allCommented,
  };
}

/**
 * Add comment prefix to a line.
 * Preserves indentation by inserting comment after leading whitespace.
 */
function commentLine(line: string, commentPrefix: string): string {
  // Find leading whitespace
  const match = line.match(/^(\s*)/);
  const indent = match ? match[1] : '';
  const rest = line.slice(indent.length);

  // Don't comment empty lines
  if (rest.length === 0) {
    return line;
  }

  return `${indent}${commentPrefix} ${rest}`;
}

/**
 * Remove comment prefix from a line.
 * Handles both with and without trailing space after comment prefix.
 */
function uncommentLine(line: string, commentPrefix: string): string {
  const trimmed = line.trimStart();
  
  if (!trimmed.startsWith(commentPrefix)) {
    return line;
  }

  // Find leading whitespace
  const match = line.match(/^(\s*)/);
  const indent = match ? match[1] : '';

  // Remove comment prefix (and optional space after it)
  let rest = trimmed.slice(commentPrefix.length);
  if (rest.startsWith(' ')) {
    rest = rest.slice(1);
  }

  return `${indent}${rest}`;
}

/**
 * Calculate the column offset after commenting/uncommenting.
 * Used to adjust cursor position.
 * 
 * @param wasCommented Whether line was commented before toggle
 * @param commentPrefix Comment prefix used
 * @returns Column offset (positive = shifted right, negative = shifted left)
 */
export function calculateColumnOffset(
  wasCommented: boolean,
  commentPrefix: string
): number {
  if (wasCommented) {
    // Uncommenting: cursor moves left by prefix length + 1 space
    return -(commentPrefix.length + 1);
  } else {
    // Commenting: cursor moves right by prefix length + 1 space
    return commentPrefix.length + 1;
  }
}

/**
 * Toggle block comment around a selection.
 * Wraps selection with block comment delimiters or removes them if present.
 * 
 * @param text Selected text
 * @param blockStart Block comment start (e.g., "/*")
 * @param blockEnd Block comment end (e.g., closing star-slash)
 * @returns Toggled text
 */
export function toggleBlockComment(
  text: string,
  blockStart: string,
  blockEnd: string
): string {
  const trimmed = text.trim();
  
  // Check if already block commented
  if (trimmed.startsWith(blockStart) && trimmed.endsWith(blockEnd)) {
    // Remove block comment and trim inner content
    const inner = trimmed.slice(blockStart.length, -blockEnd.length);
    return inner.trim();
  } else {
    // Add block comment, trim input first
    return `${blockStart} ${trimmed} ${blockEnd}`;
  }
}
