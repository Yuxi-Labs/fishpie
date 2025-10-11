import type { LanguageProvider, Token } from "../types";

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
};
