import type { LanguageProvider, Token } from "../types";
import { javascript } from "./javascript";

const tsTypes = new Set(["interface","type","enum","namespace","abstract","declare","implements","readonly","keyof","infer","is","as","satisfies","override","public","private","protected"]);

export const typescript: LanguageProvider = {
  id: "typescript",
  async tokenize(text: string): Promise<Token[]> {
    const baseMaybe = javascript.tokenize?.(text) ?? [];
    const base = baseMaybe instanceof Promise ? await baseMaybe : baseMaybe;
    const tokens: Token[] = [...base];
    const lines = text.split(/\n/);
    for (let line = 0; line < lines.length; line++) {
      const l = lines[line];
      const word = /\b[a-zA-Z_$][\w$]*\b/g;
      let m: RegExpExecArray | null;
      while ((m = word.exec(l))) {
        if (tsTypes.has(m[0])) {
          tokens.push({ text: m[0], type: "type-keyword", range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
        }
      }
    }
    return tokens;
  },
};
