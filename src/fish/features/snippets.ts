/**
 * VS Code-style snippet parsing with tabstops ($1, ${1:default}, $0)
 */

import type { SnippetSession, SnippetStop } from "../core/types";

export type ParsedSnippet = {
  text: string;
  stops: Array<{ order: number; start: number; end: number }>;
};

/**
 * Parse VS Code-like snippet and compute tabstops
 * Supports: $0, $1, ${1:default}, escaped chars (\$, \{, \}, \\)
 */
export function parseSnippet(input: string): ParsedSnippet {
  let i = 0;
  const out: string[] = [];
  const stops: Array<{ order: number; start: number; end: number }> = [];

  const pushText = (s: string) => {
    out.push(s);
  };

  while (i < input.length) {
    const ch = input[i];

    // Handle escapes
    if (ch === "\\" && i + 1 < input.length) {
      const nxt = input[i + 1];
      if (nxt === "$" || nxt === "{" || nxt === "}" || nxt === "\\") {
        pushText(nxt);
        i += 2;
        continue;
      }
    }

    // Handle $ placeholders
    if (ch === "$") {
      // $0 - final tabstop
      if (input.slice(i).startsWith("$0")) {
        const pos = out.join("").length;
        stops.push({ order: 0, start: pos, end: pos });
        i += 2;
        continue;
      }

      // ${n[:default]}
      const brace = /^\$\{(\d+)(?::([^}]*))?\}/.exec(input.slice(i));
      if (brace) {
        const n = Number(brace[1]);
        const def = brace[2] ?? "";
        const start = out.join("").length;
        pushText(def);
        const end = out.join("").length;
        stops.push({ order: n, start, end });
        i += brace[0].length;
        continue;
      }

      // $n
      const simple = /^\$(\d+)/.exec(input.slice(i));
      if (simple) {
        const n = Number(simple[1]);
        const pos = out.join("").length;
        stops.push({ order: n, start: pos, end: pos });
        i += simple[0].length;
        continue;
      }
    }

    pushText(ch);
    i++;
  }

  return { text: out.join(""), stops };
}

/**
 * Check if text contains snippet syntax
 */
export function hasSnippetSyntax(text: string): boolean {
  return /\$(\d+|\{\d+|0)/.test(text);
}

/**
 * Navigate to the next or previous snippet tabstop
 * Returns the new session or null if the session should end
 */
export function navigateSnippet(
  session: SnippetSession,
  direction: "forward" | "backward"
): SnippetSession | null {
  const nextIndex = session.index + (direction === "forward" ? 1 : -1);
  
  if (nextIndex < 0 || nextIndex >= session.stops.length) {
    // End of snippet navigation
    return null;
  }

  return {
    stops: session.stops,
    index: nextIndex,
  };
}

/**
 * Get the current tabstop from a snippet session
 */
export function getCurrentStop(session: SnippetSession): SnippetStop | null {
  if (session.index < 0 || session.index >= session.stops.length) {
    return null;
  }
  return session.stops[session.index];
}

