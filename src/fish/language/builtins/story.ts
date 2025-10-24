import type { LanguageProvider, Token, Position, CompletionItem, Hover } from "../types";

const storyElements = new Map<string, string>([
  ["scene", "Scene header - marks the beginning of a new scene"],
  ["character", "Character name - identifies who is speaking"],
  ["dialogue", "Dialogue - what the character says"],
  ["action", "Action/stage direction - describes what happens"],
]);

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
      // Action directions: (text in parentheses)
      const actionRegex = /\(([^)]+)\)/g;
      while ((m = actionRegex.exec(l))) {
        tokens.push({ text: m[0], type: "action", range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
      }
    }
    return tokens;
  },
  complete(_text: string, _pos: Position): CompletionItem[] {
    return [
      { label: "=== Scene Title ===", kind: "keyword", insertText: "=== $0 ===", detail: "Scene header" },
      { label: "CHARACTER:", kind: "keyword", insertText: "$1: $0", detail: "Character dialogue" },
      { label: "(action)", kind: "keyword", insertText: "($0)", detail: "Stage direction/action" },
      { label: "INT.", kind: "keyword", insertText: "INT. $0", detail: "Interior scene" },
      { label: "EXT.", kind: "keyword", insertText: "EXT. $0", detail: "Exterior scene" },
      { label: "FADE IN:", kind: "keyword", detail: "Scene transition" },
      { label: "FADE OUT:", kind: "keyword", detail: "Scene transition" },
      { label: "CUT TO:", kind: "keyword", detail: "Scene transition" },
    ];
  },
  hover(text: string, position: Position): Hover | null {
    const toks = story.tokenize!(text) as Token[];
    const t = toks.find((tk: Token) => tk.range.start.line === position.line && position.column >= tk.range.start.column && position.column <= tk.range.end.column);
    if (!t) return null;
    
    const desc = storyElements.get(t.type);
    if (desc) {
      return { 
        contents: `**${t.type}**\n\n${desc}`,
        range: t.range 
      };
    }
    
    const map: Record<string, string> = { 
      scene: "Scene header", 
      character: "Character name", 
      dialogue: "Character dialogue",
      action: "Stage direction/action"
    };
    return { contents: map[t.type] ?? t.type, range: t.range };
  }
};
