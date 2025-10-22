import type { LanguageProvider, Token, Position, CompletionItem, Hover } from "../types";
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
  complete(_text: string, _pos: Position): CompletionItem[] {
    return Array.from(tsTypes).slice(0, 20).map(k => ({ label: k, kind: "type-keyword" }));
  },
  async hover(text: string, position: Position): Promise<Hover | null> {
    const baseMaybe = javascript.tokenize?.(text) ?? [];
    const base = baseMaybe instanceof Promise ? await baseMaybe : baseMaybe;
    const t = (base as Token[]).find((tk: Token) => tk.range.start.line === position.line && position.column >= tk.range.start.column && position.column <= tk.range.end.column);
    if (t) return { contents: t.type === 'type-keyword' ? 'TypeScript type keyword' : (t.type === 'keyword' ? 'JavaScript keyword' : t.type), range: t.range };
    return null;
  }
};
