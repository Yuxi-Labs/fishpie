/**
 * Unit tests for snippet parsing and navigation
 */

import { describe, it, expect } from "vitest";
import {
  parseSnippet,
  hasSnippetSyntax,
  navigateSnippet,
  getCurrentStop,
} from "@/fish/features/snippets";
import type { SnippetSession } from "@/fish/core/types";

describe("hasSnippetSyntax", () => {
  it("should detect $0", () => {
    expect(hasSnippetSyntax("foo$0")).toBe(true);
  });

  it("should detect $1", () => {
    expect(hasSnippetSyntax("foo$1")).toBe(true);
  });

  it("should detect ${1}", () => {
    expect(hasSnippetSyntax("foo${1}")).toBe(true);
  });

  it("should return false for plain text", () => {
    expect(hasSnippetSyntax("hello world")).toBe(false);
  });

  it("should return false for escaped $", () => {
    expect(hasSnippetSyntax("price: \\$100")).toBe(false);
  });
});

describe("parseSnippet", () => {
  it("should parse plain text", () => {
    const result = parseSnippet("hello world");
    expect(result.text).toBe("hello world");
    expect(result.stops).toEqual([]);
  });

  it("should parse $0 final tabstop", () => {
    const result = parseSnippet("hello$0");
    expect(result.text).toBe("hello");
    expect(result.stops).toEqual([
      { order: 0, start: 5, end: 5 },
    ]);
  });

  it("should parse simple $1 tabstop", () => {
    const result = parseSnippet("hello $1 world");
    expect(result.text).toBe("hello  world");
    expect(result.stops).toEqual([
      { order: 1, start: 6, end: 6 },
    ]);
  });

  it("should parse ${1:default}", () => {
    const result = parseSnippet("hello ${1:name} world");
    expect(result.text).toBe("hello name world");
    expect(result.stops).toEqual([
      { order: 1, start: 6, end: 10 },
    ]);
  });

  it("should parse multiple tabstops", () => {
    const result = parseSnippet("function ${1:name}(${2:params}) {$0}");
    expect(result.text).toBe("function name(params) {}");
    expect(result.stops).toHaveLength(3);
    expect(result.stops).toContainEqual({ order: 1, start: 9, end: 13 });
    expect(result.stops).toContainEqual({ order: 2, start: 14, end: 20 });
    expect(result.stops).toContainEqual({ order: 0, start: 23, end: 23 });
  });

  it("should handle escaped characters", () => {
    const result = parseSnippet("price: \\$${1:100}");
    expect(result.text).toBe("price: $100");
    expect(result.stops).toEqual([
      { order: 1, start: 8, end: 11 },
    ]);
  });

  it("should handle empty default", () => {
    const result = parseSnippet("test ${1:}end");
    expect(result.text).toBe("test end");
    expect(result.stops).toEqual([
      { order: 1, start: 5, end: 5 },
    ]);
  });

  it("should handle no default (${1})", () => {
    const result = parseSnippet("test ${1}end");
    expect(result.text).toBe("test end");
    expect(result.stops).toEqual([
      { order: 1, start: 5, end: 5 },
    ]);
  });
});

describe("navigateSnippet", () => {
  const session: SnippetSession = {
    stops: [
      { start: { line: 0, column: 0 }, end: { line: 0, column: 4 } },
      { start: { line: 0, column: 5 }, end: { line: 0, column: 10 } },
      { start: { line: 0, column: 12 }, end: { line: 0, column: 12 } },
    ],
    index: 0,
  };

  it("should move forward to next stop", () => {
    const result = navigateSnippet(session, "forward");
    expect(result).not.toBeNull();
    expect(result?.index).toBe(1);
  });

  it("should move backward to previous stop", () => {
    const currentSession = { ...session, index: 1 };
    const result = navigateSnippet(currentSession, "backward");
    expect(result).not.toBeNull();
    expect(result?.index).toBe(0);
  });

  it("should return null when moving forward past last stop", () => {
    const currentSession = { ...session, index: 2 };
    const result = navigateSnippet(currentSession, "forward");
    expect(result).toBeNull();
  });

  it("should return null when moving backward past first stop", () => {
    const result = navigateSnippet(session, "backward");
    expect(result).toBeNull();
  });
});

describe("getCurrentStop", () => {
  const session: SnippetSession = {
    stops: [
      { start: { line: 0, column: 0 }, end: { line: 0, column: 4 } },
      { start: { line: 0, column: 5 }, end: { line: 0, column: 10 } },
    ],
    index: 1,
  };

  it("should return current stop", () => {
    const stop = getCurrentStop(session);
    expect(stop).toEqual({ start: { line: 0, column: 5 }, end: { line: 0, column: 10 } });
  });

  it("should return null for invalid index", () => {
    const invalidSession = { ...session, index: 99 };
    const stop = getCurrentStop(invalidSession);
    expect(stop).toBeNull();
  });

  it("should return null for negative index", () => {
    const invalidSession = { ...session, index: -1 };
    const stop = getCurrentStop(invalidSession);
    expect(stop).toBeNull();
  });
});
