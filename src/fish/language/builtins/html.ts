import type { LanguageProvider, Token, Position, CompletionItem, Hover } from "../types";

const htmlTags = new Map<string, string>([
  ["div", "Block-level container element"],
  ["span", "Inline container element"],
  ["p", "Paragraph"],
  ["a", "Anchor/hyperlink"],
  ["img", "Image"],
  ["button", "Clickable button"],
  ["input", "Input field"],
  ["form", "HTML form"],
  ["ul", "Unordered list"],
  ["ol", "Ordered list"],
  ["li", "List item"],
  ["table", "Table"],
  ["tr", "Table row"],
  ["td", "Table data cell"],
  ["th", "Table header cell"],
  ["h1", "Heading level 1"],
  ["h2", "Heading level 2"],
  ["h3", "Heading level 3"],
  ["h4", "Heading level 4"],
  ["h5", "Heading level 5"],
  ["h6", "Heading level 6"],
  ["header", "Header section"],
  ["footer", "Footer section"],
  ["nav", "Navigation links"],
  ["main", "Main content"],
  ["section", "Thematic grouping of content"],
  ["article", "Self-contained composition"],
  ["aside", "Content aside from the content"],
  ["script", "JavaScript code"],
  ["style", "CSS styles"],
  ["link", "External resource link"],
  ["meta", "Metadata"],
]);

const htmlAttributes = new Map<string, string>([
  ["class", "CSS class name(s)"],
  ["id", "Unique element identifier"],
  ["style", "Inline CSS styles"],
  ["href", "Hyperlink reference (URL)"],
  ["src", "Source URL for media/scripts"],
  ["alt", "Alternative text for images"],
  ["title", "Advisory information"],
  ["type", "Type of element"],
  ["value", "Value of the element"],
  ["placeholder", "Placeholder text"],
  ["name", "Name of the element"],
  ["disabled", "Disables the element"],
  ["readonly", "Makes element read-only"],
  ["required", "Makes field required"],
  ["checked", "Checkbox/radio is checked"],
  ["selected", "Option is selected"],
  ["width", "Width of element"],
  ["height", "Height of element"],
]);

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
      // comments
      const cmt = /<!--.*?-->/g;
      while ((m = cmt.exec(l))) {
        tokens.push({ text: m[0], type: 'comment', range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
      }
      // doctype
      const doc = /<!DOCTYPE\s+[^>]+>/ig;
      while ((m = doc.exec(l))) {
        tokens.push({ text: m[0], type: 'doctype', range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
      }
      // Attribute names
      const attrRegex = /\b([a-zA-Z-]+)=/g;
      while ((m = attrRegex.exec(l))) {
        tokens.push({
          text: m[1],
          type: "attribute",
          range: { start: { line, column: m.index }, end: { line, column: m.index + m[1].length } },
        });
      }
      // Attribute values in quotes
      const attrVal = /=\s*(["'])(.*?)\1/g;
      while ((m = attrVal.exec(l))) {
        const start = (m.index || 0) + 1; // include = position offset
        const val = m[2];
        const _colStart = start + (l.slice(start).match(/^\s*['"]/ ) ? (l.slice(start).match(/^\s*/)?.[0].length || 0) + 1 : 0);
        // Fallback if math is messy: compute start by finding the opening quote
        const quoteIdx = l.indexOf(m[1], m.index);
        const valueStart = quoteIdx >= 0 ? quoteIdx + 1 : m.index + 1;
        tokens.push({ text: val, type: 'attr-value', range: { start: { line, column: valueStart }, end: { line, column: valueStart + val.length } } });
      }
      // Entities
      const ent = /&[a-zA-Z0-9#]+;/g;
      while ((m = ent.exec(l))) {
        tokens.push({ text: m[0], type: 'entity', range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
      }
    }
    return tokens;
  },
  complete(_text: string, _pos: Position): CompletionItem[] {
    const completions: CompletionItem[] = [];
    
    // Add all HTML tags
    for (const [tag, desc] of htmlTags) {
      completions.push({ 
        label: `<${tag}>`, 
        kind: "tag", 
        insertText: `<${tag}>$0</${tag}>`,
        detail: desc
      });
    }
    
    // Add self-closing tags
    completions.push(
      { label: "<br>", kind: "tag", insertText: "<br />", detail: "Line break" },
      { label: "<hr>", kind: "tag", insertText: "<hr />", detail: "Horizontal rule" },
    );
    
    return completions;
  },
  async hover(text: string, position: Position): Promise<Hover | null> {
    const maybe = html.tokenize?.(text) ?? [];
    const toks: Token[] = maybe instanceof Promise ? await maybe : maybe as Token[];
    const t = toks.find((tk: Token) => tk.range.start.line === position.line && position.column >= tk.range.start.column && position.column <= tk.range.end.column);
    if (!t) return null;
    
    if (t.type === 'tag') {
      // Extract tag name
      const tagMatch = /<\/?([a-zA-Z][a-zA-Z0-9]*)/g.exec(t.text);
      if (tagMatch) {
        const tagName = tagMatch[1];
        const desc = htmlTags.get(tagName);
        if (desc) {
          return {
            contents: `**<${tagName}>** HTML element\n\n${desc}\n\nMDN: https://developer.mozilla.org/docs/Web/HTML/Element/${tagName}`,
            range: t.range
          };
        }
      }
      return { contents: 'HTML tag', range: t.range };
    }
    
    if (t.type === 'attribute') {
      const desc = htmlAttributes.get(t.text);
      if (desc) {
        return {
          contents: `**${t.text}** attribute\n\n${desc}\n\nMDN: https://developer.mozilla.org/docs/Web/HTML/Attributes/${t.text}`,
          range: t.range
        };
      }
      return { contents: 'HTML attribute', range: t.range };
    }
    if (t.type === 'attr-value') {
      return { contents: 'Attribute value', range: t.range };
    }
    if (t.type === 'comment') {
      return { contents: 'HTML comment', range: t.range };
    }
    if (t.type === 'doctype') {
      return { contents: 'Document type declaration', range: t.range };
    }
    if (t.type === 'entity') {
      return { contents: 'HTML entity', range: t.range };
    }
    
    return { contents: t.type === 'tag' ? 'HTML tag' : 'HTML', range: t.range };
  }
};
