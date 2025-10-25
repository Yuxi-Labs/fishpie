import type { LanguageProvider, Token } from "../types";
import { css } from "./css";

export const scss: LanguageProvider = {
  id: "scss",
  async tokenize(text: string): Promise<Token[]> {
    // Get base CSS tokens
    const baseMaybe = css.tokenize?.(text) ?? [];
    const base = baseMaybe instanceof Promise ? await baseMaybe : baseMaybe;
    const tokens: Token[] = [...base];
    
    // Add SCSS-specific tokens
    const lines = text.split(/\n/);
    for (let line = 0; line < lines.length; line++) {
      const l = lines[line];
      let m: RegExpExecArray | null;
      
      // SCSS variables ($variable-name)
      const scssVar = /\$[a-zA-Z_-][a-zA-Z0-9_-]*/g;
      while ((m = scssVar.exec(l))) {
        tokens.push({ 
          text: m[0], 
          type: "variable", 
          range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } 
        });
      }
      
      // SCSS mixins (@mixin, @include)
      const mixin = /@(mixin|include|extend|use|forward)\b/g;
      while ((m = mixin.exec(l))) {
        tokens.push({ 
          text: m[0], 
          type: "keyword", 
          range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } 
        });
      }
      
      // SCSS control directives (@if, @else, @for, @each, @while)
      const control = /@(if|else|for|each|while|function|return)\b/g;
      while ((m = control.exec(l))) {
        tokens.push({ 
          text: m[0], 
          type: "keyword", 
          range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } 
        });
      }
      
      // SCSS interpolation (#{$variable})
      const interp = /#{[^}]+}/g;
      while ((m = interp.exec(l))) {
        tokens.push({ 
          text: m[0], 
          type: "interpolation", 
          range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } 
        });
      }
      
      // Parent selector (&)
      const parent = /&[a-zA-Z0-9_-]*/g;
      while ((m = parent.exec(l))) {
        tokens.push({ 
          text: m[0], 
          type: "operator", 
          range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } 
        });
      }
    }
    
    return tokens;
  },
  complete: css.complete,
  hover: css.hover,
};
