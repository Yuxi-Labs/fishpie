/**
 * Line Commands Module
 * 
 * Provides utilities for common line manipulation operations:
 * - Move lines up/down (Alt+Up/Down)
 * - Duplicate lines (Shift+Alt+Up/Down)
 * 
 * All operations preserve indentation and handle multi-line selections.
 */

/**
 * Result of a line command operation.
 */
export interface LineCommandResult {
  /**
   * The modified array of lines.
   */
  lines: string[];
  
  /**
   * New start line index after the operation.
   */
  newStartLine: number;
  
  /**
   * New end line index after the operation.
   */
  newEndLine: number;
}

/**
 * Move selected lines up by one position.
 * If already at the top, does nothing.
 * 
 * @param lines Array of all lines in the document
 * @param startLine First line of the selection (0-indexed)
 * @param endLine Last line of the selection (0-indexed, inclusive)
 * @returns Result with modified lines and new selection range
 */
export function moveLinesUp(
  lines: string[],
  startLine: number,
  endLine: number
): LineCommandResult {
  // Validate bounds
  if (startLine < 0 || endLine >= lines.length || startLine > endLine) {
    return { lines, newStartLine: startLine, newEndLine: endLine };
  }
  
  // Can't move up if already at the top
  if (startLine === 0) {
    return { lines, newStartLine: startLine, newEndLine: endLine };
  }
  
  // Create a copy of the lines array
  const result = [...lines];
  
  // Extract the line above and the selected range
  const lineAbove = result[startLine - 1];
  const selectedLines = result.slice(startLine, endLine + 1);
  
  // Move the selected lines up by swapping with the line above
  result.splice(startLine - 1, selectedLines.length + 1, ...selectedLines, lineAbove);
  
  return {
    lines: result,
    newStartLine: startLine - 1,
    newEndLine: endLine - 1,
  };
}

/**
 * Move selected lines down by one position.
 * If already at the bottom, does nothing.
 * 
 * @param lines Array of all lines in the document
 * @param startLine First line of the selection (0-indexed)
 * @param endLine Last line of the selection (0-indexed, inclusive)
 * @returns Result with modified lines and new selection range
 */
export function moveLinesDown(
  lines: string[],
  startLine: number,
  endLine: number
): LineCommandResult {
  // Validate bounds
  if (startLine < 0 || endLine >= lines.length || startLine > endLine) {
    return { lines, newStartLine: startLine, newEndLine: endLine };
  }
  
  // Can't move down if already at the bottom
  if (endLine === lines.length - 1) {
    return { lines, newStartLine: startLine, newEndLine: endLine };
  }
  
  // Create a copy of the lines array
  const result = [...lines];
  
  // Extract the selected range and the line below
  const selectedLines = result.slice(startLine, endLine + 1);
  const lineBelow = result[endLine + 1];
  
  // Move the selected lines down by swapping with the line below
  result.splice(startLine, selectedLines.length + 1, lineBelow, ...selectedLines);
  
  return {
    lines: result,
    newStartLine: startLine + 1,
    newEndLine: endLine + 1,
  };
}

/**
 * Duplicate selected lines.
 * Creates a copy of the selected lines immediately below the selection.
 * 
 * @param lines Array of all lines in the document
 * @param startLine First line of the selection (0-indexed)
 * @param endLine Last line of the selection (0-indexed, inclusive)
 * @param direction Direction to duplicate ('up' or 'down')
 * @returns Result with modified lines and new selection range
 */
export function duplicateLines(
  lines: string[],
  startLine: number,
  endLine: number,
  direction: 'up' | 'down' = 'down'
): LineCommandResult {
  // Validate bounds
  if (startLine < 0 || endLine >= lines.length || startLine > endLine) {
    return { lines, newStartLine: startLine, newEndLine: endLine };
  }
  
  // Create a copy of the lines array
  const result = [...lines];
  
  // Extract the selected lines
  const selectedLines = result.slice(startLine, endLine + 1);
  
  if (direction === 'up') {
    // Insert duplicate above the selection
    result.splice(startLine, 0, ...selectedLines);
    
    return {
      lines: result,
      newStartLine: startLine,
      newEndLine: startLine + (endLine - startLine),
    };
  } else {
    // Insert duplicate below the selection
    result.splice(endLine + 1, 0, ...selectedLines);
    
    return {
      lines: result,
      newStartLine: endLine + 1,
      newEndLine: endLine + 1 + (endLine - startLine),
    };
  }
}

/**
 * Delete selected lines.
 * Removes the selected lines from the document.
 * 
 * @param lines Array of all lines in the document
 * @param startLine First line of the selection (0-indexed)
 * @param endLine Last line of the selection (0-indexed, inclusive)
 * @returns Result with modified lines and new cursor position
 */
export function deleteLines(
  lines: string[],
  startLine: number,
  endLine: number
): LineCommandResult {
  // Validate bounds
  if (startLine < 0 || endLine >= lines.length || startLine > endLine) {
    return { lines, newStartLine: startLine, newEndLine: endLine };
  }
  
  // Create a copy of the lines array
  const result = [...lines];
  
  // Remove the selected lines
  result.splice(startLine, endLine - startLine + 1);
  
  // If we deleted all lines, ensure at least one empty line remains
  if (result.length === 0) {
    result.push('');
  }
  
  // Adjust cursor position after deletion
  const newLine = Math.min(startLine, result.length - 1);
  
  return {
    lines: result,
    newStartLine: newLine,
    newEndLine: newLine,
  };
}
