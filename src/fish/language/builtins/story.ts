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
      const covered = new Set<number>();
      
      // Helper to check if position is already covered
      const isCovered = (start: number, end: number) => {
        for (let i = start; i < end; i++) {
          if (covered.has(i)) return true;
        }
        return false;
      };
      
      // Helper to mark range as covered
      const markCovered = (start: number, end: number) => {
        for (let i = start; i < end; i++) {
          covered.add(i);
        }
      };
      
      // Scene headers: === Title === or ## Scene Title
      let m: RegExpExecArray | null;
      if ((m = /^(=+)\s*(.*?)\s*(=+)$/.exec(l))) {
        // Opening ===
        tokens.push({ 
          text: m[1], 
          type: "operator", 
          range: { start: { line, column: 0 }, end: { line, column: m[1].length } } 
        });
        markCovered(0, m[1].length);
        
        // Scene title
        const titleStart = m[1].length + (l.substring(m[1].length).match(/^\s*/)![0].length);
        const titleEnd = l.length - m[3].length - (l.substring(0, l.length - m[3].length).match(/\s*$/)![0].length);
        tokens.push({ 
          text: m[2], 
          type: "heading", 
          range: { start: { line, column: titleStart }, end: { line, column: titleEnd } } 
        });
        markCovered(titleStart, titleEnd);
        
        // Closing ===
        tokens.push({ 
          text: m[3], 
          type: "operator", 
          range: { start: { line, column: l.length - m[3].length }, end: { line, column: l.length } } 
        });
        markCovered(l.length - m[3].length, l.length);
      }
      
      // Screenplay scene headers: INT./EXT. LOCATION - TIME
      if ((m = /^(INT\.|EXT\.)\s+(.+?)(\s+-\s+(.+))?$/.exec(l))) {
        // INT./EXT.
        tokens.push({ 
          text: m[1], 
          type: "keyword", 
          range: { start: { line, column: 0 }, end: { line, column: m[1].length } } 
        });
        markCovered(0, m[1].length);
        
        // Location
        const locStart = m[1].length + 1;
        const locEnd = m[3] ? m.index + m[1].length + 1 + m[2].length : l.length;
        tokens.push({ 
          text: m[2], 
          type: "heading", 
          range: { start: { line, column: locStart }, end: { line, column: locEnd } } 
        });
        markCovered(locStart, locEnd);
        
        // Time (if present)
        if (m[3] && m[4]) {
          const timeStart = locEnd + 3; // " - "
          tokens.push({ 
            text: m[4], 
            type: "comment", 
            range: { start: { line, column: timeStart }, end: { line, column: l.length } } 
          });
          markCovered(timeStart, l.length);
        }
      }
      
      // Character dialogue: NAME: text or NAME (parenthetical): text
      if ((m = /^([A-Z][A-Z\s]+?)(\s*\([^)]+\))?\s*:\s+(.+)$/.exec(l))) {
        // Character name
        tokens.push({ 
          text: m[1], 
          type: "function-name", 
          range: { start: { line, column: 0 }, end: { line, column: m[1].length } } 
        });
        markCovered(0, m[1].length);
        
        // Parenthetical (character instruction)
        if (m[2]) {
          const parenStart = m[1].length;
          tokens.push({ 
            text: m[2].trim(), 
            type: "comment", 
            range: { start: { line, column: parenStart }, end: { line, column: parenStart + m[2].length } } 
          });
          markCovered(parenStart, parenStart + m[2].length);
        }
        
        // Dialogue text
        const dialogueStart = l.indexOf(':', m[1].length) + 1;
        const dialogueTextStart = dialogueStart + (l.substring(dialogueStart).match(/^\s*/)![0].length);
        tokens.push({ 
          text: m[3], 
          type: "string", 
          range: { start: { line, column: dialogueTextStart }, end: { line, column: l.length } } 
        });
        markCovered(dialogueTextStart, l.length);
      }
      
      // Transitions: FADE IN:, FADE OUT:, CUT TO:, etc.
      if ((m = /^(FADE IN|FADE OUT|CUT TO|DISSOLVE TO|MATCH CUT TO):?$/i.exec(l))) {
        tokens.push({ 
          text: m[0], 
          type: "keyword", 
          range: { start: { line, column: 0 }, end: { line, column: l.length } } 
        });
        markCovered(0, l.length);
      }
      
      // Action directions: (text in parentheses) - inline actions
      const actionRegex = /\(([^)]+)\)/g;
      let actionMatch: RegExpExecArray | null;
      while ((actionMatch = actionRegex.exec(l))) {
        if (!isCovered(actionMatch.index, actionMatch.index + actionMatch[0].length)) {
          tokens.push({ 
            text: actionMatch[0], 
            type: "comment", 
            range: { start: { line, column: actionMatch.index }, end: { line, column: actionMatch.index + actionMatch[0].length } } 
          });
          markCovered(actionMatch.index, actionMatch.index + actionMatch[0].length);
        }
      }
      
      // Character names in dialogue (e.g., mentions of other characters)
      const nameRegex = /\b([A-Z][A-Z]+)\b/g;
      let nameMatch: RegExpExecArray | null;
      while ((nameMatch = nameRegex.exec(l))) {
        if (!isCovered(nameMatch.index, nameMatch.index + nameMatch[0].length)) {
          tokens.push({ 
            text: nameMatch[0], 
            type: "identifier", 
            range: { start: { line, column: nameMatch.index }, end: { line, column: nameMatch.index + nameMatch[0].length } } 
          });
          markCovered(nameMatch.index, nameMatch.index + nameMatch[0].length);
        }
      }
      
      // Emphasis in action/dialogue: *italic* or **bold**
      const emphasisRegex = /(\*\*?)([^*]+)\1/g;
      let emphMatch: RegExpExecArray | null;
      while ((emphMatch = emphasisRegex.exec(l))) {
        if (!isCovered(emphMatch.index, emphMatch.index + emphMatch[0].length)) {
          tokens.push({ 
            text: emphMatch[0], 
            type: emphMatch[1].length === 2 ? "keyword" : "comment", 
            range: { start: { line, column: emphMatch.index }, end: { line, column: emphMatch.index + emphMatch[0].length } } 
          });
          markCovered(emphMatch.index, emphMatch.index + emphMatch[0].length);
        }
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
