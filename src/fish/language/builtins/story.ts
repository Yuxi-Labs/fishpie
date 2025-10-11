import type { LanguageProvider, Token } from "../types";

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
};
