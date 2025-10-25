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
    const lines = text.split(/\n/);
    
    for (let line = 0; line < lines.length; line++) {
      const l = lines[line];
      const covered = new Set<number>();
      let m: RegExpExecArray | null;
      
      // HTML comments (highest priority)
      const cmt = /<!--.*?-->/g;
      while ((m = cmt.exec(l))) {
        tokens.push({ text: m[0], type: 'comment', range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
        for (let i = m.index; i < m.index + m[0].length; i++) covered.add(i);
      }
      
      // DOCTYPE declaration
      const doc = /<!DOCTYPE\s+[^>]+>/ig;
      while ((m = doc.exec(l))) {
        if (covered.has(m.index)) continue;
        tokens.push({ text: m[0], type: 'doctype', range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
        for (let i = m.index; i < m.index + m[0].length; i++) covered.add(i);
      }
      
      // Complete tags with better parsing
      const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9-]*)/g;
      while ((m = tagRegex.exec(l))) {
        if (covered.has(m.index)) continue;
        const tagName = m[1];
        tokens.push({
          text: tagName,
          type: "tag",
          range: { start: { line, column: m.index + 1 + (m[0].startsWith('</') ? 1 : 0) }, end: { line, column: m.index + 1 + (m[0].startsWith('</') ? 1 : 0) + tagName.length } },
        });
        // Mark < and </ as punctuation
        tokens.push({
          text: m[0].startsWith('</') ? '</' : '<',
          type: "punctuation",
          range: { start: { line, column: m.index }, end: { line, column: m.index + (m[0].startsWith('</') ? 2 : 1) } },
        });
        for (let i = m.index; i < m.index + m[0].length; i++) covered.add(i);
      }
      
      // Closing > and />
      const closeBracket = /\/?>(?![^<]*<)/g;
      while ((m = closeBracket.exec(l))) {
        if (covered.has(m.index)) continue;
        tokens.push({ text: m[0], type: 'punctuation', range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
        for (let i = m.index; i < m.index + m[0].length; i++) covered.add(i);
      }
      
      // Attribute names (within tags)
      const attrRegex = /\b([a-zA-Z][a-zA-Z0-9-]*)\s*=/g;
      while ((m = attrRegex.exec(l))) {
        if (covered.has(m.index)) continue;
        const attrName = m[1];
        tokens.push({
          text: attrName,
          type: "attribute",
          range: { start: { line, column: m.index }, end: { line, column: m.index + attrName.length } },
        });
        for (let i = m.index; i < m.index + attrName.length; i++) covered.add(i);
      }
      
      // Attribute values in quotes (both single and double)
      const attrVal = /=\s*(["'])((?:\\.|(?!\1)[^\n])*?)\1/g;
      while ((m = attrVal.exec(l))) {
        if (covered.has(m.index + 1)) continue;
        const quote = m[1];
        const val = m[2];
        const quoteIdx = l.indexOf(quote, m.index);
        const valueStart = quoteIdx + 1;
        
        // Highlight the value
        if (val) {
          tokens.push({ 
            text: val, 
            type: 'attr-value', 
            range: { start: { line, column: valueStart }, end: { line, column: valueStart + val.length } } 
          });
          for (let i = valueStart; i < valueStart + val.length; i++) covered.add(i);
        }
        
        // Mark quotes as punctuation
        tokens.push({ text: quote, type: 'punctuation', range: { start: { line, column: quoteIdx }, end: { line, column: quoteIdx + 1 } } });
        tokens.push({ text: quote, type: 'punctuation', range: { start: { line, column: valueStart + val.length }, end: { line, column: valueStart + val.length + 1 } } });
        for (let i = m.index; i < m.index + m[0].length; i++) covered.add(i);
      }
      
      // HTML entities
      const ent = /&[a-zA-Z0-9#]+;/g;
      while ((m = ent.exec(l))) {
        if (covered.has(m.index)) continue;
        tokens.push({ text: m[0], type: 'entity', range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
        for (let i = m.index; i < m.index + m[0].length; i++) covered.add(i);
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
