import type { LanguageProvider, Token, Position, CompletionItem, Hover } from "../types";

export const html: LanguageProvider = {
  id: "html",
  tokenize(text: string): Token[] {
    const tokens: Token[] = [];
    const tag = /<\/?[a-zA-Z][^>]*>/g;
  let m: RegExpExecArray | null;
  const lines = text.split(/\n/);
    for (let line = 0; line < lines.length; line++) {
      const l = lines[line];
      tag.lastIndex = 0;
      while ((m = tag.exec(l))) {
        tokens.push({
          text: m[0],
          type: "tag",
          range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } },
        });
      }
      // no-op
    }
    return tokens;
  },
  complete(_text: string, _pos: Position): CompletionItem[] {
    return [
      { label: "<div>", kind: "tag", insertText: "<div>\n  $0\n</div>" },
      { label: "<span>", kind: "tag" },
      { label: "<script>", kind: "tag" },
      { label: "<link>", kind: "tag" },
      { label: "<meta>", kind: "tag" },
    ];
  },
  async hover(text: string, position: Position): Promise<Hover | null> {
    const maybe = html.tokenize?.(text) ?? [];
    const toks: Token[] = maybe instanceof Promise ? await maybe : maybe as Token[];
    const t = toks.find((tk: Token) => tk.range.start.line === position.line && position.column >= tk.range.start.column && position.column <= tk.range.end.column);
    if (!t) return null;
    return { contents: t.type === 'tag' ? 'HTML tag' : 'HTML', range: t.range };
  }
};
