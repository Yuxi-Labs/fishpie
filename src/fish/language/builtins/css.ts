import type { LanguageProvider, Token, Position, Hover, CompletionItem } from "../types";

export const css: LanguageProvider = {
  id: "css",
  tokenize(text: string): Token[] {
    const tokens: Token[] = [];
    const lines = text.split(/\n/);
    for (let line = 0; line < lines.length; line++) {
      const l = lines[line];
      // comments
      let m: RegExpExecArray | null;
      const comment = /\/\*.*?\*\//g;
      while ((m = comment.exec(l))) {
        tokens.push({ text: m[0], type: "comment", range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
      }
      // at-rules
      const at = /@[a-z-]+/g;
      while ((m = at.exec(l))) {
        tokens.push({ text: m[0], type: "at-rule", range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
      }
    }
    return tokens;
  },
  complete(_text: string, _position: Position): CompletionItem[] {
    return [
      { label: "@media", kind: "keyword" },
      { label: "@supports", kind: "keyword" },
      { label: "@import", kind: "keyword" },
      { label: "color", kind: "property" },
      { label: "background", kind: "property" },
      { label: "font-size", kind: "property" },
      { label: "margin", kind: "property" },
      { label: "padding", kind: "property" },
      { label: "display", kind: "property" },
      { label: "position", kind: "property" },
    ];
  },
  async hover(text: string, position: Position): Promise<Hover | null> {
    const maybe = css.tokenize ? css.tokenize(text) : [];
    const toks: Token[] = (maybe instanceof Promise) ? await maybe : (maybe as Token[]);
    const t = toks.find((tok: Token) => tok.range.start.line === position.line && position.column >= tok.range.start.column && position.column <= tok.range.end.column);
    if (!t) return null;
    const map: Record<string, string> = { "comment": "CSS comment", "at-rule": "CSS at-rule" };
    return { contents: map[t.type] ?? `CSS ${t.type}`, range: t.range };
  },
};
