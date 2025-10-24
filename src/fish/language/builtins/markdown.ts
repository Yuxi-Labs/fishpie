import type { LanguageProvider, Token, Position, CompletionItem, Hover } from "../types";

export const markdown: LanguageProvider = {
  id: "markdown",
  tokenize(text: string): Token[] {
    const tokens: Token[] = [];
    const lines = text.split(/\n/);
    let line = 0;
    for (const l of lines) {
      // headings
      const m = /^(#{1,6})\s+(.*)$/.exec(l);
      if (m) {
        tokens.push({
          text: m[0],
          type: "heading",
          range: { start: { line, column: 0 }, end: { line, column: l.length } },
        });
      }
      // code blocks
      if (/^```/.test(l)) {
        tokens.push({
          text: l,
          type: "code-block",
          range: { start: { line, column: 0 }, end: { line, column: l.length } },
        });
      }
      // blockquotes
      if (/^>\s/.test(l)) {
        tokens.push({
          text: l,
          type: "blockquote",
          range: { start: { line, column: 0 }, end: { line, column: l.length } },
        });
      }
      // lists
      if (/^(\s*[-*+]|\s*\d+\.)\s/.test(l)) {
        tokens.push({
          text: l,
          type: "list",
          range: { start: { line, column: 0 }, end: { line, column: l.length } },
        });
      }
      // emphasis / code spans (simple)
      for (const r of [ /`[^`]+`/g, /\*\*[^*]+\*\*/g, /\*[^*]+\*/g, /_[^_]+_/g ]) {
        let m2: RegExpExecArray | null;
        while ((m2 = r.exec(l))) {
          tokens.push({
            text: m2[0],
            type: "inline",
            range: { start: { line, column: m2.index }, end: { line, column: m2.index + m2[0].length } },
          });
        }
      }
      // links and images
      const linkRegex = /(!?\[([^\]]+)\]\(([^)]+)\))/g;
      let m3: RegExpExecArray | null;
      while ((m3 = linkRegex.exec(l))) {
        tokens.push({
          text: m3[0],
          type: m3[0].startsWith('!') ? "image" : "link",
          range: { start: { line, column: m3.index }, end: { line, column: m3.index + m3[0].length } },
        });
      }
      line++;
    }
    return tokens;
  },
  complete(_text: string, _pos: Position): CompletionItem[] {
    return [
      { label: "# Heading 1", kind: "heading", insertText: "# $0", detail: "Level 1 heading" },
      { label: "## Heading 2", kind: "heading", insertText: "## $0", detail: "Level 2 heading" },
      { label: "### Heading 3", kind: "heading", insertText: "### $0", detail: "Level 3 heading" },
      { label: "#### Heading 4", kind: "heading", insertText: "#### $0", detail: "Level 4 heading" },
      { label: "**bold**", kind: "format", insertText: "**$0**", detail: "Bold text" },
      { label: "*italic*", kind: "format", insertText: "*$0*", detail: "Italic text" },
      { label: "`code`", kind: "format", insertText: "`$0`", detail: "Inline code" },
      { label: "```code block```", kind: "format", insertText: "```$1\n$0\n```", detail: "Code block" },
      { label: "- List item", kind: "list", insertText: "- $0", detail: "Unordered list" },
      { label: "1. Numbered", kind: "list", insertText: "1. $0", detail: "Ordered list" },
      { label: "[ ] Task", kind: "list", insertText: "- [ ] $0", detail: "Task list" },
      { label: "[x] Done", kind: "list", insertText: "- [x] $0", detail: "Completed task" },
      { label: "> Quote", kind: "format", insertText: "> $0", detail: "Blockquote" },
      { label: "---", kind: "format", insertText: "---", detail: "Horizontal rule" },
      { label: "[link](url)", kind: "format", insertText: "[$1]($0)", detail: "Link" },
      { label: "![image](url)", kind: "format", insertText: "![$1]($0)", detail: "Image" },
      { label: "| table |", kind: "format", insertText: "| $1 | $2 |\n| --- | --- |\n| $0 |  |", detail: "Table" },
    ];
  },
  hover(text: string, position: Position): Hover | null {
    const toks = markdown.tokenize!(text) as Token[];
    const t = toks.find((tk: Token) => tk.range.start.line === position.line && position.column >= tk.range.start.column && position.column <= tk.range.end.column);
    if (!t) return null;
    
    const typeDescriptions: Record<string, string> = {
      heading: "Markdown heading - creates a section header",
      inline: "Inline formatting - code, bold, or italic text",
      "code-block": "Code block - displays code with syntax highlighting",
      blockquote: "Blockquote - quoted text or citation",
      list: "List item - ordered or unordered list",
      link: "Link - hyperlink to another resource",
      image: "Image - embedded image"
    };
    
    const desc = typeDescriptions[t.type] || t.type;
    return { contents: `**${t.type}**\n\n${desc}`, range: t.range };
  }
};
