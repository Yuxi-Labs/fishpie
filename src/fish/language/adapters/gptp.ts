import type { LanguageProvider, Token, Position, Hover, CompletionItem } from "../types";

// Lightweight client-side adapter for .gptp files. For now, provide superficial tokenization and basic key completions.
// Validation/execute will live on the server via /api endpoints to call @yuxilabs/gptp-core.

function tokenizeGptp(text: string): Token[] {
  const tokens: Token[] = [];
  const lines = text.split(/\n/);
  for (let line = 0; line < lines.length; line++) {
    const l = lines[line];
    // Keys like "connections", "providers", "messages", etc. (JSON-like files)
    const keyRe = /"([A-Za-z0-9_\-]+)"\s*:/g;
    let m: RegExpExecArray | null;
    while ((m = keyRe.exec(l))) {
      const start = m.index + 1;
      const key = m[1];
      tokens.push({ text: key, type: "property", range: { start: { line, column: start }, end: { line, column: start + key.length } } });
    }
    // Strings
    const strRe = /"([^"\\]|\\.)*"/g;
    while ((m = strRe.exec(l))) {
      const start = m.index;
      const textSeg = m[0];
      tokens.push({ text: textSeg, type: "string", range: { start: { line, column: start }, end: { line, column: start + textSeg.length } } });
    }
    // Braces/brackets
    const braceRe = /[{}\[\]]/g;
    while ((m = braceRe.exec(l))) {
      tokens.push({ text: m[0], type: "punctuation", range: { start: { line, column: m.index }, end: { line, column: m.index + 1 } } });
    }
  }
  return tokens;
}

const gptpCompletions: CompletionItem[] = [
  { label: "connections", kind: "property", detail: "Provider routing config" },
  { label: "providers", kind: "property" },
  { label: "active", kind: "property" },
  { label: "messages", kind: "property" },
  { label: "input", kind: "property" },
  { label: "output", kind: "property" },
  { label: "format", kind: "property" },
];

export const gptpProvider: LanguageProvider = {
  id: "gptp",
  tokenize(text: string) {
    return tokenizeGptp(text);
  },
  async complete(text: string, position: Position) {
    return gptpCompletions;
  },
  async hover(text: string, position: Position): Promise<Hover | null> {
    const tokens = tokenizeGptp(text);
    const t = tokens.find(t => t.range.start.line === position.line && position.column >= t.range.start.column && position.column <= t.range.end.column);
    if (!t) return null;
    const docs: Record<string, string> = {
      property: "GPTP field",
      string: "String literal",
      punctuation: "Syntax",
    };
    return { contents: docs[t.type] ?? t.type, range: t.range };
  },
};

export default gptpProvider;
