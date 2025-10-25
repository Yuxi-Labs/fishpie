/**
 * Unit tests for keyboard navigation utilities
 */

import { describe, it, expect } from "vitest";
import {
  moveLeft,
  moveRight,
  moveUp,
  moveDown,
  moveToLineStart,
  moveToLineEnd,
  moveToDocStart,
  moveToDocEnd,
  findWordBoundaryLeft,
  findWordBoundaryRight,
} from "@/fish/input/navigation";
import type { CaretPos } from "@/fish/core/types";

const lines = [
  "hello world",
  "foo bar",
  "test",
];

describe("moveLeft", () => {
  it("should move left within a line", () => {
    const caret: CaretPos = { line: 0, column: 5 };
    const result = moveLeft(caret, lines);
    expect(result).toEqual({ line: 0, column: 4 });
  });

  it("should move to end of previous line at line start", () => {
    const caret: CaretPos = { line: 1, column: 0 };
    const result = moveLeft(caret, lines);
    expect(result).toEqual({ line: 0, column: 11 });
  });

  it("should stay at start of document", () => {
    const caret: CaretPos = { line: 0, column: 0 };
    const result = moveLeft(caret, lines);
    expect(result).toEqual({ line: 0, column: 0 });
  });
});

describe("moveRight", () => {
  it("should move right within a line", () => {
    const caret: CaretPos = { line: 0, column: 5 };
    const result = moveRight(caret, lines);
    expect(result).toEqual({ line: 0, column: 6 });
  });

  it("should move to start of next line at line end", () => {
    const caret: CaretPos = { line: 0, column: 11 };
    const result = moveRight(caret, lines);
    expect(result).toEqual({ line: 1, column: 0 });
  });

  it("should stay at end of document", () => {
    const caret: CaretPos = { line: 2, column: 4 };
    const result = moveRight(caret, lines);
    expect(result).toEqual({ line: 2, column: 4 });
  });
});

describe("moveUp", () => {
  it("should move up one line", () => {
    const caret: CaretPos = { line: 1, column: 5 };
    const result = moveUp(caret, lines);
    expect(result).toEqual({ line: 0, column: 5 });
  });

  it("should clamp column to line length", () => {
    const caret: CaretPos = { line: 1, column: 7 };
    const result = moveUp(caret, lines); // line 0 is 11 chars
    expect(result).toEqual({ line: 0, column: 7 });
  });

  it("should stay at first line", () => {
    const caret: CaretPos = { line: 0, column: 5 };
    const result = moveUp(caret, lines);
    expect(result).toEqual({ line: 0, column: 5 });
  });
});

describe("moveDown", () => {
  it("should move down one line", () => {
    const caret: CaretPos = { line: 0, column: 5 };
    const result = moveDown(caret, lines);
    expect(result).toEqual({ line: 1, column: 5 });
  });

  it("should clamp column to shorter line", () => {
    const caret: CaretPos = { line: 0, column: 10 };
    const result = moveDown(caret, lines); // line 1 is 7 chars
    expect(result).toEqual({ line: 1, column: 7 });
  });

  it("should stay at last line", () => {
    const caret: CaretPos = { line: 2, column: 2 };
    const result = moveDown(caret, lines);
    expect(result).toEqual({ line: 2, column: 2 });
  });
});

describe("moveToLineStart", () => {
  it("should move to column 0", () => {
    const caret: CaretPos = { line: 1, column: 5 };
    const result = moveToLineStart(caret);
    expect(result).toEqual({ line: 1, column: 0 });
  });
});

describe("moveToLineEnd", () => {
  it("should move to end of line", () => {
    const caret: CaretPos = { line: 0, column: 5 };
    const result = moveToLineEnd(caret, lines);
    expect(result).toEqual({ line: 0, column: 11 });
  });
});

describe("moveToDocStart", () => {
  it("should move to line 0, column 0", () => {
    const result = moveToDocStart();
    expect(result).toEqual({ line: 0, column: 0 });
  });
});

describe("moveToDocEnd", () => {
  it("should move to end of last line", () => {
    const result = moveToDocEnd(lines);
    expect(result).toEqual({ line: 2, column: 4 });
  });

  it("should handle empty document", () => {
    const result = moveToDocEnd([""]);
    expect(result).toEqual({ line: 0, column: 0 });
  });
});

describe("findWordBoundaryLeft", () => {
  const testLines = ["hello world test"];

  it("should skip whitespace moving left", () => {
    const caret: CaretPos = { line: 0, column: 12 }; // After "hello world "
    const result = findWordBoundaryLeft(caret, testLines);
    expect(result).toEqual({ line: 0, column: 6 }); // Start of "world"
  });

  it("should find word start", () => {
    const caret: CaretPos = { line: 0, column: 9 }; // Middle of "world"
    const result = findWordBoundaryLeft(caret, testLines);
    expect(result).toEqual({ line: 0, column: 6 }); // Start of "world"
  });

  it("should stop at line start", () => {
    const caret: CaretPos = { line: 0, column: 2 };
    const result = findWordBoundaryLeft(caret, testLines);
    expect(result).toEqual({ line: 0, column: 0 });
  });
});

describe("findWordBoundaryRight", () => {
  const testLines = ["hello world test"];

  it("should skip whitespace moving right", () => {
    const caret: CaretPos = { line: 0, column: 5 }; // End of "hello"
    const result = findWordBoundaryRight(caret, testLines);
    expect(result).toEqual({ line: 0, column: 11 }); // End of "world"
  });

  it("should find word end", () => {
    const caret: CaretPos = { line: 0, column: 7 }; // Middle of "world"
    const result = findWordBoundaryRight(caret, testLines);
    expect(result).toEqual({ line: 0, column: 11 }); // End of "world"
  });

  it("should stop at line end", () => {
    const caret: CaretPos = { line: 0, column: 14 };
    const result = findWordBoundaryRight(caret, testLines);
    expect(result).toEqual({ line: 0, column: 16 });
  });
});
