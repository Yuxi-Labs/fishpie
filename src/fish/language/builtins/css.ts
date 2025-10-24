import type { LanguageProvider, Token, Position, Hover, CompletionItem } from "../types";

const cssProperties = new Map<string, string>([
  ["color", "Sets the color of text"],
  ["background", "Shorthand for all background properties"],
  ["background-color", "Sets the background color"],
  ["font-size", "Sets the font size"],
  ["font-family", "Specifies the font family"],
  ["font-weight", "Sets how thick or thin characters should be displayed"],
  ["margin", "Sets all margin properties in one declaration"],
  ["padding", "Sets all padding properties in one declaration"],
  ["display", "Specifies the display behavior (type of rendering box)"],
  ["position", "Specifies the type of positioning method"],
  ["width", "Sets the width of an element"],
  ["height", "Sets the height of an element"],
  ["border", "Sets all border properties in one declaration"],
  ["border-radius", "Defines the radius of the element's corners"],
  ["flex", "Shorthand for flex-grow, flex-shrink, and flex-basis"],
  ["grid", "Shorthand for grid-template-rows, grid-template-columns"],
  ["align-items", "Aligns items along the cross axis"],
  ["justify-content", "Aligns items along the main axis"],
  ["text-align", "Specifies the horizontal alignment of text"],
  ["z-index", "Sets the stack order of a positioned element"],
  ["opacity", "Sets the opacity level for an element"],
  ["transition", "Shorthand for transition properties"],
  ["transform", "Applies a 2D or 3D transformation"],
  ["box-shadow", "Attaches one or more shadows to an element"],
  ["line-height", "Sets the line height"],
  ["letter-spacing", "Increases or decreases the space between characters"],
  ["overflow", "Specifies what happens if content overflows an element's box"],
  ["cursor", "Specifies the mouse cursor to be displayed"],
]);

const cssAtRules = new Map<string, string>([
  ["@media", "Applies styles for different media types/devices"],
  ["@import", "Imports a style sheet"],
  ["@supports", "Tests for browser support of CSS features"],
  ["@keyframes", "Defines animation keyframes"],
  ["@font-face", "Defines custom fonts"],
  ["@charset", "Specifies the character encoding"],
]);

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
      // properties (simplified: word followed by colon)
      const prop = /\b([a-z-]+)\s*:/g;
      while ((m = prop.exec(l))) {
        tokens.push({ text: m[1], type: "property", range: { start: { line, column: m.index }, end: { line, column: m.index + m[1].length } } });
      }
      // selectors: class and id
      const cls = /\.[_a-zA-Z][_a-zA-Z0-9-]*/g;
      while ((m = cls.exec(l))) {
        tokens.push({ text: m[0], type: "selector-class", range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
      }
      const ident = /#[_a-zA-Z][_a-zA-Z0-9-]*/g;
      while ((m = ident.exec(l))) {
        tokens.push({ text: m[0], type: "selector-id", range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
      }
      // pseudo classes/elements
      const pseudo = /::?[a-z-]+/g;
      while ((m = pseudo.exec(l))) {
        tokens.push({ text: m[0], type: "pseudo", range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
      }
      // functions like rgba(, url(, calc(
      const func = /[a-z-]+\s*\(/g;
      while ((m = func.exec(l))) {
        const name = m[0].replace(/\(/, "");
        tokens.push({ text: name.trim(), type: "function", range: { start: { line, column: m.index }, end: { line, column: m.index + name.length } } });
      }
      // numeric values with units
      const numUnit = /\b\d+(?:\.\d+)?(px|em|rem|vh|vw|%|deg|s|ms)\b/g;
      while ((m = numUnit.exec(l))) {
        tokens.push({ text: m[0], type: "value", range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
      }
      // hex colors
      const hex = /#[0-9a-fA-F]{3,8}\b/g;
      while ((m = hex.exec(l))) {
        tokens.push({ text: m[0], type: "color", range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
      }
    }
    return tokens;
  },
  complete(_text: string, _position: Position): CompletionItem[] {
    const completions: CompletionItem[] = [];
    
    // Add at-rules
    for (const [rule, desc] of cssAtRules) {
      completions.push({
        label: rule,
        kind: "keyword",
        detail: desc
      });
    }
    
    // Add properties
    for (const [prop, desc] of cssProperties) {
      completions.push({
        label: prop,
        kind: "property",
        insertText: `${prop}: $0;`,
        detail: desc
      });
    }
    
    return completions;
  },
  async hover(text: string, position: Position): Promise<Hover | null> {
    const maybe = css.tokenize ? css.tokenize(text) : [];
    const toks: Token[] = (maybe instanceof Promise) ? await maybe : (maybe as Token[]);
    const t = toks.find((tok: Token) => tok.range.start.line === position.line && position.column >= tok.range.start.column && position.column <= tok.range.end.column);
    if (!t) return null;
    
    if (t.type === "property") {
      const desc = cssProperties.get(t.text);
      if (desc) {
        return {
          contents: `**${t.text}** (CSS property)\n\n${desc}\n\nMDN: https://developer.mozilla.org/docs/Web/CSS/${t.text}`,
          range: t.range
        };
      }
    }
    
    if (t.type === "at-rule") {
      const desc = cssAtRules.get(t.text);
      if (desc) {
        return {
          contents: `**${t.text}**\n\n${desc}\n\nMDN: https://developer.mozilla.org/docs/Web/CSS/${encodeURIComponent(t.text)}`,
          range: t.range
        };
      }
    }

    if (t.type === "color") {
      return {
        contents: `CSS color value ${t.text}`,
        range: t.range,
      };
    }
    if (t.type === "value") {
      return {
        contents: `CSS value ${t.text}`,
        range: t.range,
      };
    }
    if (t.type === "selector-class" || t.type === "selector-id") {
      return {
        contents: t.type === 'selector-class' ? 'Class selector' : 'ID selector',
        range: t.range,
      };
    }
    if (t.type === "pseudo") {
      return { contents: 'Pseudo-class/element', range: t.range };
    }
    if (t.type === "function") {
      return { contents: 'CSS function', range: t.range };
    }
    
    const map: Record<string, string> = { 
      "comment": "CSS comment", 
      "at-rule": "CSS at-rule",
      "property": "CSS property",
      "selector-class": "Class selector",
      "selector-id": "ID selector",
      "pseudo": "Pseudo-class/element",
      "function": "CSS function",
      "value": "CSS value",
      "color": "CSS color"
    };
    return { contents: map[t.type] ?? `CSS ${t.type}`, range: t.range };
  },
};
