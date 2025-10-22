import type { LanguageProvider, Token, Position, CompletionItem, Hover } from "../types";

export const story: LanguageProvider = {
  id: "story",
  tokenize(text: string): Token[] {
    const tokens: Token[] = [];
    const lines = text.split(/\n/);
    for (let line = 0; line < lines.length; line++) {
      const l = lines[line];
      // Scene headers: === Title ===
      let m: RegExpExecArray | null;
      if ((m = /^=+\s*(.*?)\s*=+$/.exec(l))) {
        tokens.push({ text: m[0], type: "scene", range: { start: { line, column: 0 }, end: { line, column: l.length } } });
      }
      // Character dialogue: NAME: text
      if ((m = /^(\w[\w\s]+):\s+(.+)$/.exec(l))) {
        tokens.push({ text: m[1], type: "character", range: { start: { line, column: 0 }, end: { line, column: m[1].length } } });
        tokens.push({ text: m[2], type: "dialogue", range: { start: { line, column: (m.index ?? 0) + m[1].length + 2 }, end: { line, column: l.length } } });
      }
    }
    return tokens;
  },
  complete(_text: string, _pos: Position): CompletionItem[] {
    return [
      { label: "== Scene ==", kind: "keyword" },
      { label: "CHARACTER:", kind: "keyword" },
    ];
  },
  hover(text: string, position: Position): Hover | null {
    const toks = story.tokenize!(text) as Token[];
    const t = toks.find((tk: Token) => tk.range.start.line === position.line && position.column >= tk.range.start.column && position.column <= tk.range.end.column);
    if (!t) return null;
    const map: Record<string, string> = { scene: "Scene header", character: "Character name", dialogue: "Dialogue" };
    return { contents: map[t.type] ?? t.type, range: t.range };
  }
};
