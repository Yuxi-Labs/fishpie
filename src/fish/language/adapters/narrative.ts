import type { LanguageProvider, Token, Position, Hover, CompletionItem } from "../types";

// Soft adapter: if @yuxilabs/storymode-core is present, use it; otherwise fall back to simple regex.
// We keep this browser-safe: storymode-core runs fine on the client. We dynamic-import only when needed.

// We intentionally avoid importing types from '@yuxilabs/storymode-core' to prevent TS resolution errors
// when the package is not installed. Treat the module as unknown at type level.
type StoryModeCore = unknown;

async function loadStoryModeCore(): Promise<StoryModeCore | null> {
  try {
    // Use eval('import') to avoid static resolution if package is not installed
    const di = (s: string) => (eval("import") as (x: string) => Promise<unknown>)(s);
    const mod = (await di("@yuxilabs/storymode-core")) as StoryModeCore;
    return mod;
  } catch {
    return null;
  }
}

function simpleTokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const lines = text.split(/\n/);
  for (let line = 0; line < lines.length; line++) {
    const l = lines[line];
    // Declarations ::narrative:, ::scene:
    const declRe = /(::\s*(story|narrative|scene)\s*:\s*)([^\s].*)?/gi;
    let m: RegExpExecArray | null;
    while ((m = declRe.exec(l))) {
      const start = m.index;
      const head = m[1];
      tokens.push({ text: head, type: "keyword", range: { start: { line, column: start }, end: { line, column: start + head.length } } });
      if (m[4]) {
        const idStart = start + head.length;
        tokens.push({ text: m[4], type: "identifier", range: { start: { line, column: idStart }, end: { line, column: idStart + m[4].length } } });
      }
    }
    // Metadata @key: value
    const metaRe = /(@[\p{L}A-Za-z0-9_\-]+\s*:)\s*(.*)$/u;
    const mm = metaRe.exec(l);
    if (mm) {
      const start = mm.index;
      const key = mm[1];
      tokens.push({ text: key, type: "attribute", range: { start: { line, column: start }, end: { line, column: start + key.length } } });
      if (mm[2]) {
        const vs = start + key.length + (l[start + key.length] === ' ' ? 1 : 0);
        tokens.push({ text: mm[2], type: "string", range: { start: { line, column: vs }, end: { line, column: vs + mm[2].length } } });
      }
    }
    // Symbols like ⇝ ✎ ¶
    const symRe = /[⇝✎¶⦿⬟♬⧈]/g;
    while ((m = symRe.exec(l))) {
      tokens.push({ text: m[0], type: "symbol", range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
    }
  }
  return tokens;
}

function tokenAtPosition(tokens: Token[], pos: Position): Token | undefined {
  return tokens.find(t =>
    (t.range.start.line === pos.line && t.range.end.line === pos.line && pos.column >= t.range.start.column && pos.column <= t.range.end.column)
  );
}

const baseCompletions: CompletionItem[] = [
  { label: "::story:", kind: "keyword" },
  { label: "::narrative:", kind: "keyword" },
  { label: "::scene:", kind: "keyword" },
  { label: "@title:", kind: "property" },
  { label: "@location:", kind: "property" },
  { label: "⇝", kind: "symbol", detail: "goto" },
  { label: "✎", kind: "symbol", detail: "note" },
  { label: "¶", kind: "symbol", detail: "paragraph" },
  { label: "⦿", kind: "symbol", detail: "sfx" },
  { label: "⬟", kind: "symbol", detail: "vfx" },
  { label: "♬", kind: "symbol", detail: "music" },
  { label: "⧈", kind: "symbol", detail: "camera" },
];

export const narrativeProvider: LanguageProvider = {
  id: "narrative",
  async tokenize(text: string): Promise<Token[]> {
    const core = await loadStoryModeCore();
    if (!core) return simpleTokenize(text);
    try {
      // Prefer lexNarrative for raw token-like info; fallback to parse
      const lex = (core as Record<string, unknown>)["lexNarrative"] as
        | ((src: string) => { tokens?: Array<{ text?: string; kind?: string; start: { line: number; column: number }; end: { line: number; column: number } }> })
        | undefined;
      if (!lex) return simpleTokenize(text);
      const result = lex(text);
      const tokens: Token[] = [];
      for (const tk of result.tokens ?? []) {
        // We approximate type mapping; StoryMode token has kind or text classification
        const type = tk.kind === "Symbol" ? "symbol" : tk.kind === "Identifier" ? "identifier" : tk.kind === "Keyword" ? "keyword" : "inline";
        tokens.push({
          text: tk.text ?? "",
          type,
          range: { start: { line: tk.start.line, column: tk.start.column }, end: { line: tk.end.line, column: tk.end.column } }
        });
      }
      return tokens.length ? tokens : simpleTokenize(text);
    } catch {
      return simpleTokenize(text);
    }
  },
  async complete(text: string, position: Position): Promise<CompletionItem[]> {
    // Minimal: surface base completions; later we can context-filter via AST
    return baseCompletions;
  },
  async hover(text: string, position: Position): Promise<Hover | null> {
    const tokens = await narrativeProvider.tokenize!(text);
    const t = tokenAtPosition(tokens, position);
    if (!t) return null;
    const docs: Record<string, string> = {
      keyword: "StoryMode declaration or directive.",
      attribute: "Metadata key.",
      identifier: "Identifier (ID or value).",
      symbol: "StoryMode symbol (flow/media).",
    };
    return { contents: docs[t.type] ?? t.type, range: t.range };
  },
};

export default narrativeProvider;
