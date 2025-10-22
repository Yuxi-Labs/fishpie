import type { LanguageProvider, Token, Position, CompletionItem, Hover } from "../types";

export const markdown: LanguageProvider = {
  id: "markdown",
  tokenize(text: string): Token[] {
    const tokens: Token[] = [];
    const lines = text.split(/\n/);
    let line = 0;
    for (const l of lines) {
      // headings
      const m = /^(#{1,6})\s+(.*)$/.exec(l);
      if (m) {
        tokens.push({
          text: m[0],
          type: "heading",
          range: { start: { line, column: 0 }, end: { line, column: l.length } },
        });
      }
      // emphasis / code spans (simple)
      for (const r of [ /`[^`]+`/g, /\*\*[^*]+\*\*/g, /\*[^*]+\*/g, /_[^_]+_/g ]) {
        let m2: RegExpExecArray | null;
        while ((m2 = r.exec(l))) {
          tokens.push({
            text: m2[0],
            type: "inline",
            range: { start: { line, column: m2.index }, end: { line, column: m2.index + m2[0].length } },
          });
        }
      }
      line++;
    }
    return tokens;
  },
  complete(_text: string, _pos: Position): CompletionItem[] {
    return [
      { label: "# ", kind: "heading" },
      { label: "## ", kind: "heading" },
      { label: "### ", kind: "heading" },
      { label: "**bold**", kind: "format" },
      { label: "*italic*", kind: "format" },
      { label: "`code`", kind: "format" },
      { label: "- ", kind: "list" },
    ];
  },
  hover(text: string, position: Position): Hover | null {
    const toks = markdown.tokenize!(text) as Token[];
    const t = toks.find((tk: Token) => tk.range.start.line === position.line && position.column >= tk.range.start.column && position.column <= tk.range.end.column);
    if (!t) return null;
    const map: Record<string, string> = { heading: "Markdown heading", inline: "Inline formatting" };
    return { contents: map[t.type] ?? t.type, range: t.range };
  }
};
