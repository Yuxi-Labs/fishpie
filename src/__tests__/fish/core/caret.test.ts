/**
 * Unit tests for caret position utilities
 */

import { describe, it, expect } from "vitest";
import { caretEquals, hasSelection, offsetToCaret } from "@/fish/core/caret";
import type { CaretPos } from "@/fish/core/types";

describe("caretEquals", () => {
  it("should return true for identical positions", () => {
    const pos1: CaretPos = { line: 5, column: 10 };
    const pos2: CaretPos = { line: 5, column: 10 };
    expect(caretEquals(pos1, pos2)).toBe(true);
  });

  it("should return false for different lines", () => {
    const pos1: CaretPos = { line: 5, column: 10 };
    const pos2: CaretPos = { line: 6, column: 10 };
    expect(caretEquals(pos1, pos2)).toBe(false);
  });

  it("should return false for different columns", () => {
    const pos1: CaretPos = { line: 5, column: 10 };
    const pos2: CaretPos = { line: 5, column: 11 };
    expect(caretEquals(pos1, pos2)).toBe(false);
  });
});

describe("hasSelection", () => {
  it("should return false when anchor is null", () => {
    const caret: CaretPos = { line: 5, column: 10 };
    expect(hasSelection(null, caret)).toBe(false);
  });

  it("should return false when caret equals anchor", () => {
    const caret: CaretPos = { line: 5, column: 10 };
    const anchor: CaretPos = { line: 5, column: 10 };
    expect(hasSelection(anchor, caret)).toBe(false);
  });

  it("should return true when positions differ by line", () => {
    const caret: CaretPos = { line: 5, column: 10 };
    const anchor: CaretPos = { line: 4, column: 10 };
    expect(hasSelection(anchor, caret)).toBe(true);
  });

  it("should return true when positions differ by column", () => {
    const caret: CaretPos = { line: 5, column: 10 };
    const anchor: CaretPos = { line: 5, column: 8 };
    expect(hasSelection(anchor, caret)).toBe(true);
  });
});

describe("offsetToCaret", () => {
  it("should convert offset 0 to base position", () => {
    const base: CaretPos = { line: 0, column: 0 };
    const result = offsetToCaret(base, "hello", 0);
    expect(result).toEqual({ line: 0, column: 0 });
  });

  it("should convert offset within single line text", () => {
    const base: CaretPos = { line: 0, column: 0 };
    const result = offsetToCaret(base, "hello", 3);
    expect(result).toEqual({ line: 0, column: 3 });
  });

  it("should handle newline creating new line", () => {
    const base: CaretPos = { line: 0, column: 0 };
    const result = offsetToCaret(base, "hello\nworld", 6); // After "hello\n"
    expect(result).toEqual({ line: 1, column: 0 });
  });

  it("should handle offset after newline", () => {
    const base: CaretPos = { line: 0, column: 0 };
    const result = offsetToCaret(base, "hello\nworld", 9); // "hello\nwor"
    expect(result).toEqual({ line: 1, column: 3 });
  });

  it("should handle multiple newlines", () => {
    const base: CaretPos = { line: 0, column: 0 };
    const result = offsetToCaret(base, "a\nb\nc", 4); // "a\nb\n"
    expect(result).toEqual({ line: 2, column: 0 });
  });

  it("should work with non-zero base position", () => {
    const base: CaretPos = { line: 5, column: 10 };
    const result = offsetToCaret(base, "hello", 3);
    expect(result).toEqual({ line: 5, column: 13 });
  });

  it("should handle newline with non-zero base", () => {
    const base: CaretPos = { line: 5, column: 10 };
    const result = offsetToCaret(base, "abc\ndef", 4); // "abc\n"
    expect(result).toEqual({ line: 6, column: 0 });
  });

  it("should handle offset beyond text length", () => {
    const base: CaretPos = { line: 0, column: 0 };
    const result = offsetToCaret(base, "hi", 100);
    expect(result).toEqual({ line: 0, column: 2 }); // stops at text end
  });
});
