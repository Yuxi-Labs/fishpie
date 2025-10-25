/**
 * Word wrap utilities for the Fish editor.
 * Handles line wrapping calculations when word wrap is enabled.
 */

export interface WrapResult {
  /** Original line index */
  lineIndex: number;
  /** Visual row index (line may span multiple rows when wrapped) */
  visualRow: number;
  /** Text content for this visual row */
  text: string;
  /** Start column in original line */
  startCol: number;
  /** End column in original line (exclusive) */
  endCol: number;
}

export interface WrapInfo {
  /** Total number of visual rows after wrapping */
  totalRows: number;
  /** Map from line index to array of WrapResult */
  wrappedLines: WrapResult[][];
  /** Map from visual row to WrapResult */
  rowToWrap: Map<number, WrapResult>;
}

/**
 * Calculate word wrap for all lines given a maximum width in pixels.
 * Uses canvas measureText to accurately determine character widths.
 * 
 * @param lines Array of text lines
 * @param maxWidth Maximum width in pixels before wrapping
 * @param ctx Canvas 2D context for text measurement
 * @returns WrapInfo with visual row mapping
 */
export function calculateWordWrap(
  lines: string[],
  maxWidth: number,
  ctx: CanvasRenderingContext2D
): WrapInfo {
  const wrappedLines: WrapResult[][] = [];
  const rowToWrap = new Map<number, WrapResult>();
  let visualRow = 0;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const lineText = lines[lineIndex];
    const lineWraps: WrapResult[] = [];

    if (lineText.length === 0) {
      // Empty line takes one visual row
      const wrap: WrapResult = {
        lineIndex,
        visualRow,
        text: '',
        startCol: 0,
        endCol: 0,
      };
      lineWraps.push(wrap);
      rowToWrap.set(visualRow, wrap);
      visualRow++;
    } else {
      // Measure and wrap line
      let startCol = 0;
      
      while (startCol < lineText.length) {
        const endCol = findWrapPoint(lineText, startCol, maxWidth, ctx);
        const text = lineText.substring(startCol, endCol);
        
        const wrap: WrapResult = {
          lineIndex,
          visualRow,
          text,
          startCol,
          endCol,
        };
        
        lineWraps.push(wrap);
        rowToWrap.set(visualRow, wrap);
        visualRow++;
        startCol = endCol;
      }
    }

    wrappedLines.push(lineWraps);
  }

  return {
    totalRows: visualRow,
    wrappedLines,
    rowToWrap,
  };
}

/**
 * Find the best wrap point within maxWidth.
 * Tries to break at word boundaries when possible.
 * 
 * @param line Full line text
 * @param startCol Starting column in line
 * @param maxWidth Maximum width in pixels
 * @param ctx Canvas context for measurement
 * @returns End column (exclusive) for this wrap segment
 */
function findWrapPoint(
  line: string,
  startCol: number,
  maxWidth: number,
  ctx: CanvasRenderingContext2D
): number {
  const remaining = line.substring(startCol);
  
  // Binary search for maximum characters that fit
  let low = 1;
  let high = remaining.length;
  let bestFit = low;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const text = remaining.substring(0, mid);
    const width = ctx.measureText(text).width;

    if (width <= maxWidth) {
      bestFit = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  // Try to break at word boundary
  if (bestFit < remaining.length) {
    // Look backwards for a space or punctuation
    let wrapAt = bestFit;
    for (let i = bestFit; i > Math.max(0, bestFit - 20); i--) {
      const ch = remaining[i];
      if (ch === ' ' || ch === '\t' || ch === '-' || ch === ',' || ch === ';') {
        wrapAt = i + 1; // Include the break character in this segment
        break;
      }
    }
    
    // Only use word boundary if it's not too far back (at least 50% of bestFit)
    if (wrapAt >= bestFit * 0.5) {
      bestFit = wrapAt;
    }
  }

  return startCol + bestFit;
}

/**
 * Convert a line+column position to a visual row index.
 * 
 * @param wrapInfo Wrap calculation result
 * @param lineIndex Line index
 * @param col Column within line
 * @returns Visual row index
 */
export function lineColToVisualRow(
  wrapInfo: WrapInfo,
  lineIndex: number,
  col: number
): number {
  if (lineIndex >= wrapInfo.wrappedLines.length) {
    return wrapInfo.totalRows - 1;
  }

  const wraps = wrapInfo.wrappedLines[lineIndex];
  for (const wrap of wraps) {
    if (col >= wrap.startCol && col < wrap.endCol) {
      return wrap.visualRow;
    }
    // If col is exactly at endCol of last wrap, it's on that row
    if (col === wrap.endCol && wrap === wraps[wraps.length - 1]) {
      return wrap.visualRow;
    }
  }

  // Fallback to last wrap of line
  return wraps[wraps.length - 1].visualRow;
}

/**
 * Convert a visual row index to line+column position.
 * Returns the start of the visual row.
 * 
 * @param wrapInfo Wrap calculation result
 * @param visualRow Visual row index
 * @returns { lineIndex, col } position
 */
export function visualRowToLineCol(
  wrapInfo: WrapInfo,
  visualRow: number
): { lineIndex: number; col: number } {
  const wrap = wrapInfo.rowToWrap.get(visualRow);
  if (!wrap) {
    // Clamp to last row
    const lastRow = wrapInfo.totalRows - 1;
    const lastWrap = wrapInfo.rowToWrap.get(lastRow);
    return lastWrap
      ? { lineIndex: lastWrap.lineIndex, col: lastWrap.startCol }
      : { lineIndex: 0, col: 0 };
  }

  return {
    lineIndex: wrap.lineIndex,
    col: wrap.startCol,
  };
}

/**
 * Get the number of visual rows for a given line.
 * 
 * @param wrapInfo Wrap calculation result
 * @param lineIndex Line index
 * @returns Number of visual rows this line spans
 */
export function getLineWrapCount(wrapInfo: WrapInfo, lineIndex: number): number {
  if (lineIndex >= wrapInfo.wrappedLines.length) {
    return 0;
  }
  return wrapInfo.wrappedLines[lineIndex].length;
}
