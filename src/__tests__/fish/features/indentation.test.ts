/**
 * Unit tests for indentation utilities
 */

import { describe, it, expect } from "vitest";
import {
  detectIndentStyle,
  getLineIndent,
  shouldIncreaseIndent,
  isBetweenMatchingPairs,
  calculateEnterIndent,
} from "@/fish/features/indentation";

describe("detectIndentStyle", () => {
  it("should detect 2-space indentation", () => {
    const text = "function test() {\n  const x = 1;\n  return x;\n}";
    const result = detectIndentStyle(text);
    expect(result.useTabs).toBe(false);
    expect(result.spaceSize).toBe(2);
    expect(result.tabChar).toBe("  ");
  });

  it("should detect 4-space indentation", () => {
    const text = "function test() {\n    const x = 1;\n    return x;\n}";
    const result = detectIndentStyle(text);
    expect(result.useTabs).toBe(false);
    expect(result.spaceSize).toBe(4);
    expect(result.tabChar).toBe("    ");
  });

  it("should detect tab indentation", () => {
    const text = "function test() {\n\tconst x = 1;\n\treturn x;\n}";
    const result = detectIndentStyle(text);
    expect(result.useTabs).toBe(true);
    expect(result.tabChar).toBe("\t");
  });

  it("should default to 2 spaces for plain text", () => {
    const text = "hello\nworld\nfoo\nbar";
    const result = detectIndentStyle(text);
    expect(result.useTabs).toBe(false);
    expect(result.spaceSize).toBe(2);
  });
});

describe("getLineIndent", () => {
  it("should return empty string for unindented line", () => {
    const result = getLineIndent("hello world");
    expect(result).toBe("");
  });

  it("should return spaces", () => {
    const result = getLineIndent("  hello");
    expect(result).toBe("  ");
  });

  it("should return tabs", () => {
    const result = getLineIndent("\t\thello");
    expect(result).toBe("\t\t");
  });

  it("should return mixed whitespace", () => {
    const result = getLineIndent(" \t hello");
    expect(result).toBe(" \t ");
  });

  it("should return empty for empty line", () => {
    const result = getLineIndent("");
    expect(result).toBe("");
  });

  it("should return entire line if only whitespace", () => {
    const result = getLineIndent("   ");
    expect(result).toBe("   ");
  });
});

describe("shouldIncreaseIndent", () => {
  it("should return true for lines ending with {", () => {
    expect(shouldIncreaseIndent("function test() {")).toBe(true);
  });

  it("should return true for lines ending with [", () => {
    expect(shouldIncreaseIndent("const arr = [")).toBe(true);
  });

  it("should return true for lines ending with (", () => {
    expect(shouldIncreaseIndent("if (condition")).toBe(true);
  });

  it("should ignore trailing whitespace", () => {
    expect(shouldIncreaseIndent("function test() {  ")).toBe(true);
  });

  it("should return false for normal lines", () => {
    expect(shouldIncreaseIndent("const x = 1;")).toBe(false);
  });

  it("should return false for closing braces", () => {
    expect(shouldIncreaseIndent("}")).toBe(false);
  });
});

describe("isBetweenMatchingPairs", () => {
  it("should detect {} pairs", () => {
    const result = isBetweenMatchingPairs("function() {", "}");
    expect(result).toBe(true);
  });

  it("should detect [] pairs", () => {
    const result = isBetweenMatchingPairs("const arr = [", "]");
    expect(result).toBe(true);
  });

  it("should detect () pairs", () => {
    const result = isBetweenMatchingPairs("function(", ")");
    expect(result).toBe(true);
  });

  it("should return false for mismatched pairs", () => {
    const result = isBetweenMatchingPairs("function() {", "]");
    expect(result).toBe(false);
  });

  it("should return false when no opening character", () => {
    const result = isBetweenMatchingPairs("hello", "}");
    expect(result).toBe(false);
  });

  it("should handle whitespace", () => {
    const result = isBetweenMatchingPairs("  {  ", "  }  ");
    expect(result).toBe(true);
  });
});

describe("calculateEnterIndent", () => {
  const indent2 = { tabChar: "  ", useTabs: false, spaceSize: 2 };
  const indent4 = { tabChar: "    ", useTabs: false, spaceSize: 4 };
  const indentTab = { tabChar: "\t", useTabs: true, spaceSize: 2 };

  it("should maintain current indentation", () => {
    const result = calculateEnterIndent({
      currentLineText: "  const x = 1;",
      caretColumn: 14,
      indentStyle: indent2,
    });
    expect(result.textToInsert).toBe("\n  ");
  });

  it("should increase indentation after {", () => {
    const result = calculateEnterIndent({
      currentLineText: "  function() {",
      caretColumn: 14,
      indentStyle: indent2,
    });
    expect(result.textToInsert).toBe("\n    ");
  });

  it("should add extra line between matching pairs", () => {
    const result = calculateEnterIndent({
      currentLineText: "  {}",
      caretColumn: 3, // Between {|}
      indentStyle: indent2,
    });
    expect(result.textToInsert).toBe("\n    \n  ");
    // Caret should be on middle line after extra indent
    expect(result.caretOffset).toBe(7); // "\n    ".length
  });

  it("should use 4 spaces when configured", () => {
    const result = calculateEnterIndent({
      currentLineText: "function() {",
      caretColumn: 12,
      indentStyle: indent4,
    });
    expect(result.textToInsert).toBe("\n    ");
  });

  it("should use tabs when configured", () => {
    const result = calculateEnterIndent({
      currentLineText: "function() {",
      caretColumn: 12,
      indentStyle: indentTab,
    });
    expect(result.textToInsert).toBe("\n\t");
  });

  it("should handle nested indentation", () => {
    const result = calculateEnterIndent({
      currentLineText: "    if (true) {",
      caretColumn: 15,
      indentStyle: indent2,
    });
    expect(result.textToInsert).toBe("\n      ");
  });

  it("should preserve indentation for normal lines", () => {
    const result = calculateEnterIndent({
      currentLineText: "    const x = 1;",
      caretColumn: 16,
      indentStyle: indent2,
    });
    expect(result.textToInsert).toBe("\n    ");
  });

  it("should handle empty lines", () => {
    const result = calculateEnterIndent({
      currentLineText: "",
      caretColumn: 0,
      indentStyle: indent2,
    });
    expect(result.textToInsert).toBe("\n");
  });
});
