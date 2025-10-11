import type { LanguageProvider, Token } from "../types";

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
};
