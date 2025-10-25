import { describe, it, expect } from 'vitest';
import {
  calculateVisibleRange,
  calculateContentHeight,
  calculateScrollbar,
  scrollbarYToScrollTop,
  type ViewportInfo,
} from '../../../fish/core/virtualization';

describe('virtualization utilities', () => {
  describe('calculateVisibleRange', () => {
    it('should calculate visible range at scroll top', () => {
      const viewport: ViewportInfo = {
        totalLines: 1000,
        lineHeight: 20,
        viewportHeight: 600,
        scrollTop: 0,
        bufferLines: 5,
      };

      const range = calculateVisibleRange(viewport);

      expect(range.startLine).toBe(0); // 0 - 5, clamped to 0
      expect(range.endLine).toBeLessThanOrEqual(999);
      expect(range.offsetY).toBe(0);
    });

    it('should calculate visible range at middle of document', () => {
      const viewport: ViewportInfo = {
        totalLines: 1000,
        lineHeight: 20,
        viewportHeight: 600,
        scrollTop: 5000, // Line 250
        bufferLines: 10,
      };

      const range = calculateVisibleRange(viewport);

      // First visible line is ~250, with buffer should start around 240
      expect(range.startLine).toBeGreaterThanOrEqual(240);
      expect(range.startLine).toBeLessThanOrEqual(250);

      // Last visible line is ~280, with buffer should end around 290
      expect(range.endLine).toBeGreaterThanOrEqual(280);
      expect(range.endLine).toBeLessThanOrEqual(290);

      expect(range.offsetY).toBe(range.startLine * 20);
    });

    it('should calculate visible range at scroll bottom', () => {
      const viewport: ViewportInfo = {
        totalLines: 1000,
        lineHeight: 20,
        viewportHeight: 600,
        scrollTop: 19400, // At bottom (total height 20000, viewport 600)
        bufferLines: 5,
      };

      const range = calculateVisibleRange(viewport);

      expect(range.endLine).toBe(999); // Clamped to last line
      expect(range.startLine).toBeGreaterThanOrEqual(960);
    });

    it('should handle small documents that fit in viewport', () => {
      const viewport: ViewportInfo = {
        totalLines: 10,
        lineHeight: 20,
        viewportHeight: 600,
        scrollTop: 0,
        bufferLines: 5,
      };

      const range = calculateVisibleRange(viewport);

      expect(range.startLine).toBe(0);
      expect(range.endLine).toBe(9); // All lines visible
    });

    it('should use default buffer of 10 lines when not specified', () => {
      const viewport: ViewportInfo = {
        totalLines: 1000,
        lineHeight: 20,
        viewportHeight: 600,
        scrollTop: 0,
      };

      const range = calculateVisibleRange(viewport);

      // With default buffer of 10, should render up to line 40 (30 visible + 10 buffer)
      expect(range.endLine).toBeGreaterThanOrEqual(39);
      expect(range.endLine).toBeLessThanOrEqual(41);
    });
  });

  describe('calculateContentHeight', () => {
    it('should calculate height for document with lines', () => {
      const height = calculateContentHeight(1000, 20, 10);
      expect(height).toBe(10 + 1000 * 20 + 10); // padding + lines + padding
      expect(height).toBe(20020);
    });

    it('should handle empty document', () => {
      const height = calculateContentHeight(0, 20, 10);
      expect(height).toBe(20); // Just padding
    });

    it('should handle single line', () => {
      const height = calculateContentHeight(1, 20, 10);
      expect(height).toBe(40); // padding + 1 line + padding
    });
  });

  describe('calculateScrollbar', () => {
    it('should calculate scrollbar when content fits in viewport', () => {
      const scrollbar = calculateScrollbar(
        600,  // contentHeight
        600,  // viewportHeight
        0,    // scrollTop
        30    // minThumbHeight
      );

      expect(scrollbar.trackHeight).toBe(600);
      expect(scrollbar.thumbHeight).toBe(600); // Full height
      expect(scrollbar.thumbY).toBe(0);
    });

    it('should calculate scrollbar at top of scrollable content', () => {
      const scrollbar = calculateScrollbar(
        20000, // contentHeight
        600,   // viewportHeight
        0,     // scrollTop
        30     // minThumbHeight
      );

      expect(scrollbar.trackHeight).toBe(600);
      expect(scrollbar.thumbHeight).toBeGreaterThanOrEqual(30); // At least minThumbHeight
      expect(scrollbar.thumbHeight).toBeLessThan(600);
      expect(scrollbar.thumbY).toBe(0);
    });

    it('should calculate scrollbar at middle of scrollable content', () => {
      const scrollbar = calculateScrollbar(
        20000, // contentHeight
        600,   // viewportHeight
        9700,  // scrollTop (50% of max scroll 19400)
        30     // minThumbHeight
      );

      expect(scrollbar.trackHeight).toBe(600);
      
      // Thumb should be roughly in the middle
      const expectedMiddle = (scrollbar.trackHeight - scrollbar.thumbHeight) / 2;
      expect(scrollbar.thumbY).toBeGreaterThan(expectedMiddle - 10);
      expect(scrollbar.thumbY).toBeLessThan(expectedMiddle + 10);
    });

    it('should calculate scrollbar at bottom of scrollable content', () => {
      const scrollbar = calculateScrollbar(
        20000,  // contentHeight
        600,    // viewportHeight
        19400,  // scrollTop (max scroll)
        30      // minThumbHeight
      );

      expect(scrollbar.trackHeight).toBe(600);
      
      // Thumb should be at bottom
      const expectedBottom = scrollbar.trackHeight - scrollbar.thumbHeight;
      expect(scrollbar.thumbY).toBeCloseTo(expectedBottom, 1);
    });

    it('should respect minimum thumb height', () => {
      const scrollbar = calculateScrollbar(
        100000, // Very large content
        600,    // viewportHeight
        0,      // scrollTop
        50      // minThumbHeight
      );

      expect(scrollbar.thumbHeight).toBeGreaterThanOrEqual(50);
    });
  });

  describe('scrollbarYToScrollTop', () => {
    it('should convert top position to zero scroll', () => {
      const scrollbarInfo = {
        trackHeight: 600,
        thumbHeight: 60,
        thumbY: 0,
      };

      const scrollTop = scrollbarYToScrollTop(
        30,    // mouseY (thumb center)
        scrollbarInfo,
        20000, // contentHeight
        600    // viewportHeight
      );

      expect(scrollTop).toBeCloseTo(0, 0);
    });

    it('should convert middle position to middle scroll', () => {
      const scrollbarInfo = {
        trackHeight: 600,
        thumbHeight: 60,
        thumbY: 270, // Middle
      };

      const scrollTop = scrollbarYToScrollTop(
        300,   // mouseY (roughly middle)
        scrollbarInfo,
        20000, // contentHeight
        600    // viewportHeight
      );

      // Max scroll is 19400, middle is ~9700
      expect(scrollTop).toBeGreaterThan(9000);
      expect(scrollTop).toBeLessThan(10000);
    });

    it('should convert bottom position to max scroll', () => {
      const scrollbarInfo = {
        trackHeight: 600,
        thumbHeight: 60,
        thumbY: 540, // Bottom
      };

      const scrollTop = scrollbarYToScrollTop(
        570,   // mouseY (near bottom)
        scrollbarInfo,
        20000, // contentHeight
        600    // viewportHeight
      );

      // Max scroll is 19400
      expect(scrollTop).toBeGreaterThan(19000);
      expect(scrollTop).toBeLessThanOrEqual(19400);
    });

    it('should handle click at top of track', () => {
      const scrollbarInfo = {
        trackHeight: 600,
        thumbHeight: 60,
        thumbY: 270,
      };

      const scrollTop = scrollbarYToScrollTop(
        0,     // mouseY at very top
        scrollbarInfo,
        20000, // contentHeight
        600    // viewportHeight
      );

      // Should scroll to top (or near it due to thumb centering)
      expect(scrollTop).toBeLessThan(1000);
    });

    it('should handle click at bottom of track', () => {
      const scrollbarInfo = {
        trackHeight: 600,
        thumbHeight: 60,
        thumbY: 270,
      };

      const scrollTop = scrollbarYToScrollTop(
        600,   // mouseY at very bottom
        scrollbarInfo,
        20000, // contentHeight
        600    // viewportHeight
      );

      // Should scroll to bottom (max scroll)
      expect(scrollTop).toBeGreaterThan(19000);
    });
  });
});
