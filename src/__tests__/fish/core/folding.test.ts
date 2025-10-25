import { describe, it, expect } from 'vitest';
import {
  FoldingManager,
  detectBracketFolds,
  detectJavaScriptFolds,
  detectCommentFolds,
  detectAllFolds,
  calculateNestingLevels,
  type FoldRegion
} from '../../../fish/core/folding';

describe('FoldingManager', () => {
  describe('basic operations', () => {
    it('should store and retrieve regions', () => {
      const regions: FoldRegion[] = [
        { startLine: 0, endLine: 5, type: 'bracket', folded: false, level: 0 }
      ];
      const manager = new FoldingManager(regions);
      
      expect(manager.getRegions()).toHaveLength(1);
      expect(manager.getRegions()[0].startLine).toBe(0);
    });

    it('should get regions at a specific line', () => {
      const regions: FoldRegion[] = [
        { startLine: 0, endLine: 5, type: 'bracket', folded: false, level: 0 },
        { startLine: 10, endLine: 15, type: 'bracket', folded: false, level: 0 }
      ];
      const manager = new FoldingManager(regions);
      
      const atLine3 = manager.getRegionsAtLine(3);
      expect(atLine3).toHaveLength(1);
      expect(atLine3[0].startLine).toBe(0);
      
      const atLine12 = manager.getRegionsAtLine(12);
      expect(atLine12).toHaveLength(1);
      expect(atLine12[0].startLine).toBe(10);
      
      const atLine7 = manager.getRegionsAtLine(7);
      expect(atLine7).toHaveLength(0);
    });

    it('should get region starting at specific line', () => {
      const regions: FoldRegion[] = [
        { startLine: 0, endLine: 5, type: 'bracket', folded: false, level: 0 },
        { startLine: 10, endLine: 15, type: 'bracket', folded: false, level: 0 }
      ];
      const manager = new FoldingManager(regions);
      
      const region = manager.getRegionStartingAtLine(10);
      expect(region).not.toBeNull();
      expect(region?.endLine).toBe(15);
      
      const noRegion = manager.getRegionStartingAtLine(5);
      expect(noRegion).toBeNull();
    });
  });

  describe('folding operations', () => {
    it('should toggle fold state', () => {
      const regions: FoldRegion[] = [
        { startLine: 0, endLine: 5, type: 'bracket', folded: false, level: 0 }
      ];
      const manager = new FoldingManager(regions);
      
      expect(manager.toggleFold(0)).toBe(true);
      expect(manager.getRegions()[0].folded).toBe(true);
      
      expect(manager.toggleFold(0)).toBe(true);
      expect(manager.getRegions()[0].folded).toBe(false);
    });

    it('should fold a region', () => {
      const regions: FoldRegion[] = [
        { startLine: 0, endLine: 5, type: 'bracket', folded: false, level: 0 }
      ];
      const manager = new FoldingManager(regions);
      
      expect(manager.fold(0)).toBe(true);
      expect(manager.getRegions()[0].folded).toBe(true);
    });

    it('should unfold a region', () => {
      const regions: FoldRegion[] = [
        { startLine: 0, endLine: 5, type: 'bracket', folded: true, level: 0 }
      ];
      const manager = new FoldingManager(regions);
      
      expect(manager.unfold(0)).toBe(true);
      expect(manager.getRegions()[0].folded).toBe(false);
    });

    it('should fold all regions', () => {
      const regions: FoldRegion[] = [
        { startLine: 0, endLine: 5, type: 'bracket', folded: false, level: 0 },
        { startLine: 10, endLine: 15, type: 'bracket', folded: false, level: 0 }
      ];
      const manager = new FoldingManager(regions);
      
      manager.foldAll();
      expect(manager.getRegions().every(r => r.folded)).toBe(true);
    });

    it('should unfold all regions', () => {
      const regions: FoldRegion[] = [
        { startLine: 0, endLine: 5, type: 'bracket', folded: true, level: 0 },
        { startLine: 10, endLine: 15, type: 'bracket', folded: true, level: 0 }
      ];
      const manager = new FoldingManager(regions);
      
      manager.unfoldAll();
      expect(manager.getRegions().every(r => !r.folded)).toBe(true);
    });
  });

  describe('line visibility', () => {
    it('should detect hidden lines', () => {
      const regions: FoldRegion[] = [
        { startLine: 0, endLine: 5, type: 'bracket', folded: true, level: 0 }
      ];
      const manager = new FoldingManager(regions);
      
      expect(manager.isLineHidden(0)).toBe(false); // Start line is visible
      expect(manager.isLineHidden(1)).toBe(true);
      expect(manager.isLineHidden(5)).toBe(true);
      expect(manager.isLineHidden(6)).toBe(false);
    });

    it('should get next visible line', () => {
      const regions: FoldRegion[] = [
        { startLine: 0, endLine: 5, type: 'bracket', folded: true, level: 0 }
      ];
      const manager = new FoldingManager(regions);
      
      expect(manager.getNextVisibleLine(0)).toBe(6);
      expect(manager.getNextVisibleLine(6)).toBe(7);
    });

    it('should get previous visible line', () => {
      const regions: FoldRegion[] = [
        { startLine: 5, endLine: 10, type: 'bracket', folded: true, level: 0 }
      ];
      const manager = new FoldingManager(regions);
      
      expect(manager.getPreviousVisibleLine(11)).toBe(5);
      expect(manager.getPreviousVisibleLine(5)).toBe(4);
    });

    it('should get all visible lines', () => {
      const regions: FoldRegion[] = [
        { startLine: 2, endLine: 4, type: 'bracket', folded: true, level: 0 }
      ];
      const manager = new FoldingManager(regions);
      
      const visible = manager.getVisibleLines(10);
      expect(visible).toEqual([0, 1, 2, 5, 6, 7, 8, 9]);
    });
  });

  describe('editing updates', () => {
    it('should shift regions after line insertion', () => {
      const regions: FoldRegion[] = [
        { startLine: 5, endLine: 10, type: 'bracket', folded: false, level: 0 }
      ];
      const manager = new FoldingManager(regions);
      
      // Insert 2 lines at line 3 (before region)
      manager.updateAfterEdit(3, 2, 0);
      
      const region = manager.getRegions()[0];
      expect(region.startLine).toBe(7);
      expect(region.endLine).toBe(12);
    });

    it('should adjust region when lines deleted before it', () => {
      const regions: FoldRegion[] = [
        { startLine: 5, endLine: 10, type: 'bracket', folded: false, level: 0 }
      ];
      const manager = new FoldingManager(regions);
      
      // Delete 2 lines at line 2 (before region)
      manager.updateAfterEdit(2, 0, 2);
      
      const region = manager.getRegions()[0];
      expect(region.startLine).toBe(3);
      expect(region.endLine).toBe(8);
    });

    it('should adjust region end when lines added inside', () => {
      const regions: FoldRegion[] = [
        { startLine: 5, endLine: 10, type: 'bracket', folded: false, level: 0 }
      ];
      const manager = new FoldingManager(regions);
      
      // Insert 2 lines at line 7 (inside region)
      manager.updateAfterEdit(7, 2, 0);
      
      const region = manager.getRegions()[0];
      expect(region.startLine).toBe(5);
      expect(region.endLine).toBe(12);
    });

    it('should remove region when it becomes invalid', () => {
      const regions: FoldRegion[] = [
        { startLine: 5, endLine: 10, type: 'bracket', folded: false, level: 0 }
      ];
      const manager = new FoldingManager(regions);
      
      // Delete 10 lines at line 6 (inside region, making it invalid)
      manager.updateAfterEdit(6, 0, 10);
      
      expect(manager.getRegions()).toHaveLength(0);
    });
  });

  describe('nested regions', () => {
    it('should get innermost region at line', () => {
      const regions: FoldRegion[] = [
        { startLine: 0, endLine: 10, type: 'bracket', folded: false, level: 0 },
        { startLine: 2, endLine: 8, type: 'bracket', folded: false, level: 1 },
        { startLine: 4, endLine: 6, type: 'bracket', folded: false, level: 2 }
      ];
      const manager = new FoldingManager(regions);
      
      const innermost = manager.getInnermostRegionAtLine(5);
      expect(innermost?.startLine).toBe(4);
      expect(innermost?.endLine).toBe(6);
    });

    it('should unfold containing regions', () => {
      const regions: FoldRegion[] = [
        { startLine: 0, endLine: 10, type: 'bracket', folded: true, level: 0 },
        { startLine: 2, endLine: 8, type: 'bracket', folded: true, level: 1 }
      ];
      const manager = new FoldingManager(regions);
      
      manager.unfoldContaining(5);
      
      expect(manager.getRegions()[0].folded).toBe(true); // Outer should be unfolded
      expect(manager.getRegions()[1].folded).toBe(true); // Inner should be unfolded
    });
  });
});

describe('detectBracketFolds', () => {
  it('should detect simple bracket fold', () => {
    const lines = [
      'function test() {',
      '  return 42;',
      '}'
    ];
    
    const regions = detectBracketFolds(lines);
    expect(regions).toHaveLength(1);
    expect(regions[0].startLine).toBe(0);
    expect(regions[0].endLine).toBe(2);
    expect(regions[0].type).toBe('bracket');
  });

  it('should detect nested brackets', () => {
    const lines = [
      'function outer() {',
      '  function inner() {',
      '    return 42;',
      '  }',
      '}'
    ];
    
    const regions = detectBracketFolds(lines);
    expect(regions).toHaveLength(2);
    expect(regions[0].startLine).toBe(0);
    expect(regions[0].endLine).toBe(4);
    expect(regions[1].startLine).toBe(1);
    expect(regions[1].endLine).toBe(3);
  });

  it('should detect array brackets', () => {
    const lines = [
      'const arr = [',
      '  1,',
      '  2,',
      '  3',
      '];'
    ];
    
    const regions = detectBracketFolds(lines);
    expect(regions).toHaveLength(1);
    expect(regions[0].startLine).toBe(0);
    expect(regions[0].endLine).toBe(4);
  });

  it('should not create fold for single-line brackets', () => {
    const lines = [
      'const obj = { a: 1, b: 2 };'
    ];
    
    const regions = detectBracketFolds(lines);
    expect(regions).toHaveLength(0);
  });

  it('should handle multiple independent blocks', () => {
    const lines = [
      'function a() {',
      '  return 1;',
      '}',
      'function b() {',
      '  return 2;',
      '}'
    ];
    
    const regions = detectBracketFolds(lines);
    expect(regions).toHaveLength(2);
  });
});

describe('detectJavaScriptFolds', () => {
  it('should detect function declarations', () => {
    const lines = [
      'function test() {',
      '  return 42;',
      '}'
    ];
    
    const regions = detectJavaScriptFolds(lines);
    expect(regions.length).toBeGreaterThan(0);
    expect(regions[0].type).toBe('function');
  });

  it('should detect class declarations', () => {
    const lines = [
      'class MyClass {',
      '  constructor() {}',
      '}'
    ];
    
    const regions = detectJavaScriptFolds(lines);
    expect(regions.length).toBeGreaterThan(0);
    const classRegion = regions.find(r => r.type === 'class');
    expect(classRegion).toBeDefined();
  });

  it('should detect arrow functions', () => {
    const lines = [
      'const fn = () => {',
      '  return 42;',
      '}'
    ];
    
    const regions = detectJavaScriptFolds(lines);
    expect(regions.length).toBeGreaterThan(0);
  });

  it('should detect async functions', () => {
    const lines = [
      'async function fetchData() {',
      '  const data = await fetch();',
      '  return data;',
      '}'
    ];
    
    const regions = detectJavaScriptFolds(lines);
    expect(regions.length).toBeGreaterThan(0);
    expect(regions[0].type).toBe('function');
  });
});

describe('detectCommentFolds', () => {
  it('should detect multi-line comments', () => {
    const lines = [
      '/* This is',
      ' * a multi-line',
      ' * comment */'
    ];
    
    const regions = detectCommentFolds(lines);
    expect(regions).toHaveLength(1);
    expect(regions[0].type).toBe('comment');
    expect(regions[0].startLine).toBe(0);
    expect(regions[0].endLine).toBe(2);
  });

  it('should detect consecutive single-line comments', () => {
    const lines = [
      '// Comment 1',
      '// Comment 2',
      '// Comment 3',
      'const x = 1;'
    ];
    
    const regions = detectCommentFolds(lines);
    expect(regions).toHaveLength(1);
    expect(regions[0].type).toBe('comment');
    expect(regions[0].startLine).toBe(0);
    expect(regions[0].endLine).toBe(2);
  });

  it('should not fold single-line comments', () => {
    const lines = [
      '// Single comment',
      'const x = 1;'
    ];
    
    const regions = detectCommentFolds(lines);
    expect(regions).toHaveLength(0);
  });
});

describe('calculateNestingLevels', () => {
  it('should calculate correct nesting levels', () => {
    const regions: FoldRegion[] = [
      { startLine: 0, endLine: 10, type: 'bracket', folded: false, level: 0 },
      { startLine: 2, endLine: 8, type: 'bracket', folded: false, level: 0 },
      { startLine: 4, endLine: 6, type: 'bracket', folded: false, level: 0 }
    ];
    
    calculateNestingLevels(regions);
    
    expect(regions[0].level).toBe(0); // Outermost
    expect(regions[1].level).toBe(1); // Middle
    expect(regions[2].level).toBe(2); // Innermost
  });
});

describe('detectAllFolds', () => {
  it('should combine all fold detection methods', () => {
    const lines = [
      '/* Comment',
      ' * block */',
      'function test() {',
      '  const arr = [',
      '    1, 2, 3',
      '  ];',
      '  return arr;',
      '}'
    ];
    
    const regions = detectAllFolds(lines, 'javascript');
    expect(regions.length).toBeGreaterThan(0);
  });

  it('should remove duplicate regions', () => {
    const lines = [
      'function test() {',
      '  return 42;',
      '}'
    ];
    
    // Both bracket and JS detection will find the same region
    const regions = detectAllFolds(lines, 'javascript');
    
    // Should deduplicate
    const uniqueRegions = new Set(regions.map(r => `${r.startLine}-${r.endLine}`));
    expect(uniqueRegions.size).toBe(regions.length);
  });

  it('should sort regions by start line', () => {
    const lines = [
      'function b() {',
      '  return 2;',
      '}',
      'function a() {',
      '  return 1;',
      '}'
    ];
    
    const regions = detectAllFolds(lines, 'javascript');
    
    for (let i = 1; i < regions.length; i++) {
      expect(regions[i].startLine).toBeGreaterThanOrEqual(regions[i - 1].startLine);
    }
  });
});
