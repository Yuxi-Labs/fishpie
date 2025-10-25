// import type { DocPos } from "./document"; // Reserved for future use

/**
 * Represents a foldable region in the document
 */
export interface FoldRegion {
  /** Starting line of the fold region (inclusive) */
  startLine: number;
  /** Ending line of the fold region (inclusive) */
  endLine: number;
  /** Type of fold (for icon/behavior differentiation) */
  type: 'bracket' | 'function' | 'class' | 'block' | 'comment' | 'imports';
  /** Whether this region is currently folded */
  folded: boolean;
  /** Nesting level (0 = top level) */
  level: number;
}

/**
 * Manages fold regions and folding state for a document
 */
export class FoldingManager {
  private regions: FoldRegion[] = [];

  constructor(regions: FoldRegion[] = []) {
    this.regions = regions;
  }

  /**
   * Get all fold regions
   */
  getRegions(): FoldRegion[] {
    return [...this.regions];
  }

  /**
   * Get fold regions for a specific line
   */
  getRegionsAtLine(line: number): FoldRegion[] {
    return this.regions.filter(r => line >= r.startLine && line <= r.endLine);
  }

  /**
   * Get the innermost fold region at a line
   */
  getInnermostRegionAtLine(line: number): FoldRegion | null {
    const regions = this.getRegionsAtLine(line);
    if (regions.length === 0) return null;
    // Return the region with the highest nesting level (most nested)
    return regions.reduce((innermost, current) => 
      current.level > innermost.level ? current : innermost
    );
  }

  /**
   * Get fold region that starts at a specific line
   */
  getRegionStartingAtLine(line: number): FoldRegion | null {
    return this.regions.find(r => r.startLine === line) || null;
  }

  /**
   * Toggle fold state for a region starting at a specific line
   */
  toggleFold(line: number): boolean {
    const region = this.getRegionStartingAtLine(line);
    if (!region) return false;
    region.folded = !region.folded;
    return true;
  }

  /**
   * Fold a region at a specific line
   */
  fold(line: number): boolean {
    const region = this.getRegionStartingAtLine(line);
    if (!region) return false;
    region.folded = true;
    return true;
  }

  /**
   * Unfold a region at a specific line
   */
  unfold(line: number): boolean {
    const region = this.getRegionStartingAtLine(line);
    if (!region) return false;
    region.folded = false;
    return true;
  }

  /**
   * Fold all regions
   */
  foldAll(): void {
    for (const region of this.regions) {
      region.folded = true;
    }
  }

  /**
   * Unfold all regions
   */
  unfoldAll(): void {
    for (const region of this.regions) {
      region.folded = false;
    }
  }

  /**
   * Check if a line is hidden due to folding
   */
  isLineHidden(line: number): boolean {
    // A line is hidden if it's inside a folded region (but not the start line)
    for (const region of this.regions) {
      if (region.folded && line > region.startLine && line <= region.endLine) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get the next visible line after a given line
   */
  getNextVisibleLine(line: number): number {
    let nextLine = line + 1;
    while (this.isLineHidden(nextLine)) {
      // Find the fold region that's hiding this line and jump past it
      const hidingRegion = this.regions.find(
        r => r.folded && nextLine > r.startLine && nextLine <= r.endLine
      );
      if (hidingRegion) {
        nextLine = hidingRegion.endLine + 1;
      } else {
        nextLine++;
      }
    }
    return nextLine;
  }

  /**
   * Get the previous visible line before a given line
   */
  getPreviousVisibleLine(line: number): number {
    let prevLine = line - 1;
    while (prevLine >= 0 && this.isLineHidden(prevLine)) {
      // Find the fold region that's hiding this line and jump before it
      const hidingRegion = this.regions.find(
        r => r.folded && prevLine > r.startLine && prevLine <= r.endLine
      );
      if (hidingRegion) {
        prevLine = hidingRegion.startLine;
      } else {
        prevLine--;
      }
    }
    return prevLine;
  }

  /**
   * Get all visible lines as an array of line numbers
   */
  getVisibleLines(totalLines: number): number[] {
    const visible: number[] = [];
    for (let i = 0; i < totalLines; i++) {
      if (!this.isLineHidden(i)) {
        visible.push(i);
      }
    }
    return visible;
  }

  /**
   * Update fold regions after text changes
   * This adjusts line numbers when lines are inserted or deleted
   */
  updateAfterEdit(startLine: number, linesAdded: number, linesRemoved: number): void {
    const lineDelta = linesAdded - linesRemoved;
    
    if (lineDelta === 0) return; // No line count change
    
    // Remove or adjust regions that are affected by the edit
    this.regions = this.regions.filter(region => {
      // If edit is before the region, shift it
      if (startLine <= region.startLine) {
        region.startLine += lineDelta;
        region.endLine += lineDelta;
        return region.startLine <= region.endLine; // Keep if still valid
      }
      
      // If edit is inside the region, adjust end line
      if (startLine > region.startLine && startLine <= region.endLine) {
        region.endLine += lineDelta;
        // If region becomes invalid (end before start), remove it
        return region.endLine > region.startLine;
      }
      
      // Edit is after the region, no change needed
      return true;
    });
  }

  /**
   * Unfold any regions containing a specific position
   * Used when editing inside a folded region
   */
  unfoldContaining(line: number): void {
    for (const region of this.regions) {
      if (region.folded && line >= region.startLine && line <= region.endLine) {
        region.folded = false;
      }
    }
  }

  /**
   * Set fold regions (replaces all existing regions)
   */
  setRegions(regions: FoldRegion[]): void {
    this.regions = regions;
  }

  /**
   * Clear all fold regions
   */
  clear(): void {
    this.regions = [];
  }
}

/**
 * Detect fold regions based on bracket matching
 * Works for any language with {}, [], or () blocks
 */
export function detectBracketFolds(lines: string[]): FoldRegion[] {
  const regions: FoldRegion[] = [];
  const stack: Array<{ char: string; line: number; level: number }> = [];
  const openBrackets = ['{', '[', '('];
  const closeBrackets = ['}', ']', ')'];
  const bracketPairs: Record<string, string> = { '}': '{', ']': '[', ')': '(' };

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    
    // Simple bracket scanning (doesn't handle strings/comments perfectly)
    for (let col = 0; col < line.length; col++) {
      const char = line[col];
      
      if (openBrackets.includes(char)) {
        stack.push({ char, line: lineNum, level: stack.length });
      } else if (closeBrackets.includes(char)) {
        const expected = bracketPairs[char];
        if (stack.length > 0 && stack[stack.length - 1].char === expected) {
          const opening = stack.pop()!;
          // Only create fold region if it spans multiple lines
          if (lineNum > opening.line) {
            regions.push({
              startLine: opening.line,
              endLine: lineNum,
              type: 'bracket',
              folded: false,
              level: opening.level
            });
          }
        }
      }
    }
  }

  return regions.sort((a, b) => a.startLine - b.startLine);
}

/**
 * Detect fold regions for JavaScript/TypeScript functions and classes
 */
export function detectJavaScriptFolds(lines: string[]): FoldRegion[] {
  const regions: FoldRegion[] = [];
  
  // Detect function declarations/expressions
  const functionPattern = /\b(function|async\s+function|const\s+\w+\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>))\b/;
  
  // Detect class declarations
  const classPattern = /\bclass\s+\w+/;
  
  // Future: Detect if statement blocks and loops
  // const _ifPattern = /\bif\s*\(/;
  // const _loopPattern = /\b(for|while)\s*\(/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (functionPattern.test(line) || classPattern.test(line)) {
      // Find the opening brace
      let braceCount = 0;
      let foundStart = false;
      
      for (let j = i; j < lines.length; j++) {
        const currentLine = lines[j];
        for (const char of currentLine) {
          if (char === '{') {
            braceCount++;
            if (!foundStart) {
              // Track where brace block starts (currently unused but reserved for future features)
              // const _startLine = j;
              foundStart = true;
            }
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0 && foundStart) {
              regions.push({
                startLine: i,
                endLine: j,
                type: functionPattern.test(line) ? 'function' : 'class',
                folded: false,
                level: 0 // Will be calculated later
              });
              break;
            }
          }
        }
        if (braceCount === 0 && foundStart) break;
      }
    }
  }
  
  return regions;
}

/**
 * Detect fold regions for comment blocks
 */
export function detectCommentFolds(lines: string[]): FoldRegion[] {
  const regions: FoldRegion[] = [];
  let blockStart = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Multi-line comment start
    if (line.startsWith('/*') && !line.includes('*/')) {
      blockStart = i;
    }
    // Multi-line comment end
    else if (blockStart !== -1 && line.includes('*/')) {
      if (i > blockStart) {
        regions.push({
          startLine: blockStart,
          endLine: i,
          type: 'comment',
          folded: false,
          level: 0
        });
      }
      blockStart = -1;
    }
    // Consecutive single-line comments
    else if (line.startsWith('//')) {
      if (blockStart === -1) {
        blockStart = i;
      }
    } else if (blockStart !== -1 && !line.startsWith('//')) {
      // End of consecutive comment block
      if (i - 1 > blockStart) {
        regions.push({
          startLine: blockStart,
          endLine: i - 1,
          type: 'comment',
          folded: false,
          level: 0
        });
      }
      blockStart = -1;
    }
  }
  
  return regions;
}

/**
 * Calculate nesting levels for fold regions
 */
export function calculateNestingLevels(regions: FoldRegion[]): void {
  for (const region of regions) {
    region.level = 0;
    // Count how many other regions contain this one
    for (const other of regions) {
      if (other !== region && 
          other.startLine <= region.startLine && 
          other.endLine >= region.endLine) {
        region.level++;
      }
    }
  }
}

/**
 * Detect all fold regions for a document
 * Combines bracket-based, language-specific, and comment folding
 */
export function detectAllFolds(lines: string[], languageId?: string): FoldRegion[] {
  let regions: FoldRegion[] = [];
  
  // Always add bracket-based folding
  regions = regions.concat(detectBracketFolds(lines));
  
  // Add language-specific folding
  if (languageId === 'javascript' || languageId === 'typescript') {
    regions = regions.concat(detectJavaScriptFolds(lines));
  }
  
  // Add comment folding
  regions = regions.concat(detectCommentFolds(lines));
  
  // Remove duplicates (regions with same start/end)
  const seen = new Set<string>();
  regions = regions.filter(r => {
    const key = `${r.startLine}-${r.endLine}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  // Calculate nesting levels
  calculateNestingLevels(regions);
  
  // Sort by start line, then by end line (descending for same start)
  return regions.sort((a, b) => {
    if (a.startLine !== b.startLine) return a.startLine - b.startLine;
    return b.endLine - a.endLine;
  });
}
