import type { LanguageProvider, Token } from "../types";

const jsKeywords = new Set([
  "break","case","catch","class","const","continue","debugger","default","delete","do","else","export","extends","finally","for","function","if","import","in","instanceof","let","new","return","super","switch","this","throw","try","typeof","var","void","while","with","yield","async","await"
]);

export const javascript: LanguageProvider = {
  id: "javascript",
  tokenize(text: string): Token[] {
    const tokens: Token[] = [];
    const lines = text.split(/\n/);
    for (let line = 0; line < lines.length; line++) {
      const l = lines[line];
      // comments
      const commentIdx = l.indexOf("//");
      if (commentIdx >= 0) {
        tokens.push({ text: l.slice(commentIdx), type: "comment", range: { start: { line, column: commentIdx }, end: { line, column: l.length } } });
      }
      // strings (very naive)
      const stringRegex = /(["'`])(?:\\.|(?!\1).)*\1/g;
      let m: RegExpExecArray | null;
      while ((m = stringRegex.exec(l))) {
        tokens.push({ text: m[0], type: "string", range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
      }
      // keywords (word boundaries)
      const word = /\b[a-zA-Z_$][\w$]*\b/g;
      while ((m = word.exec(l))) {
        if (jsKeywords.has(m[0])) {
          tokens.push({ text: m[0], type: "keyword", range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
        }
      }
    }
    return tokens;
  },
};
