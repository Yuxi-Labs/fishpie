/**
 * Virtualization utilities for efficient rendering of large documents
 * Only renders visible lines in the viewport plus a buffer for smooth scrolling
 */

export interface ViewportInfo {
  /** Total number of lines in the document */
  totalLines: number;
  /** Height of each line in pixels */
  lineHeight: number;
  /** Height of the visible viewport in pixels */
  viewportHeight: number;
  /** Current scroll position in pixels */
  scrollTop: number;
  /** Number of lines to render above/below visible area (buffer for smooth scrolling) */
  bufferLines?: number;
}

export interface VisibleRange {
  /** First line index to render (0-based) */
  startLine: number;
  /** Last line index to render (0-based, inclusive) */
  endLine: number;
  /** Y-offset in pixels for the first rendered line */
  offsetY: number;
}

/**
 * Calculate which lines should be rendered based on viewport and scroll position
 */
export function calculateVisibleRange(viewport: ViewportInfo): VisibleRange {
  const { totalLines, lineHeight, viewportHeight, scrollTop, bufferLines = 10 } = viewport;
  
  // Calculate visible line range
  const firstVisibleLine = Math.floor(scrollTop / lineHeight);
  const lastVisibleLine = Math.ceil((scrollTop + viewportHeight) / lineHeight);
  
  // Add buffer for smooth scrolling
  const startLine = Math.max(0, firstVisibleLine - bufferLines);
  const endLine = Math.min(totalLines - 1, lastVisibleLine + bufferLines);
  
  // Calculate Y offset for first rendered line
  const offsetY = startLine * lineHeight;
  
  return { startLine, endLine, offsetY };
}

/**
 * Calculate total content height for all lines
 */
export function calculateContentHeight(totalLines: number, lineHeight: number, padding: number): number {
  return padding + (totalLines * lineHeight) + padding;
}

/**
 * Calculate scroll thumb position and size
 */
export interface ScrollbarInfo {
  /** Height of scrollbar track in pixels */
  trackHeight: number;
  /** Height of scrollbar thumb in pixels */
  thumbHeight: number;
  /** Y position of thumb top edge in pixels */
  thumbY: number;
}

export function calculateScrollbar(
  contentHeight: number,
  viewportHeight: number,
  scrollTop: number,
  minThumbHeight: number = 30
): ScrollbarInfo {
  const trackHeight = viewportHeight;
  
  // Thumb size represents the ratio of viewport to content
  const thumbRatio = Math.min(1, viewportHeight / contentHeight);
  const thumbHeight = Math.max(minThumbHeight, trackHeight * thumbRatio);
  
  // Thumb position represents scroll progress
  const maxScroll = Math.max(0, contentHeight - viewportHeight);
  const scrollRatio = maxScroll > 0 ? scrollTop / maxScroll : 0;
  const maxThumbY = trackHeight - thumbHeight;
  const thumbY = maxThumbY * scrollRatio;
  
  return { trackHeight, thumbHeight, thumbY };
}

/**
 * Convert mouse Y position on scrollbar to scroll position
 */
export function scrollbarYToScrollTop(
  mouseY: number,
  scrollbarInfo: ScrollbarInfo,
  contentHeight: number,
  viewportHeight: number
): number {
  const { trackHeight, thumbHeight } = scrollbarInfo;
  
  // Calculate where the thumb center should be
  const maxThumbY = trackHeight - thumbHeight;
  const thumbCenterY = Math.max(0, Math.min(maxThumbY, mouseY - thumbHeight / 2));
  
  // Convert thumb position to scroll position
  const scrollRatio = maxThumbY > 0 ? thumbCenterY / maxThumbY : 0;
  const maxScroll = Math.max(0, contentHeight - viewportHeight);
  
  return scrollRatio * maxScroll;
}
