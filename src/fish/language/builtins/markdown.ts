import type { LanguageProvider, Token, Position, CompletionItem, Hover } from "../types";

export const markdown: LanguageProvider = {
  id: "markdown",
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
      
      // Code blocks (must come before heading to handle ``` correctly)
      if (/^```/.test(l)) {
        tokens.push({
          text: l,
          type: "code-block",
          range: { start: { line, column: 0 }, end: { line, column: l.length } },
        });
        markCovered(0, l.length);
        continue; // Skip other processing for code fence lines
      }
      
      // Headings - separate markers from text
      const headingMatch = /^(#{1,6})\s+(.*)$/.exec(l);
      if (headingMatch && !isCovered(0, headingMatch[1].length)) {
        // Heading markers
        tokens.push({
          text: headingMatch[1],
          type: "keyword",
          range: { start: { line, column: 0 }, end: { line, column: headingMatch[1].length } },
        });
        markCovered(0, headingMatch[1].length);
        
        // Heading text
        const textStart = headingMatch[1].length + 1; // +1 for space
        tokens.push({
          text: headingMatch[2],
          type: "heading",
          range: { start: { line, column: textStart }, end: { line, column: l.length } },
        });
        markCovered(textStart, l.length);
      }
      
      // Blockquotes
      const blockquoteMatch = /^(>\s?)(.*)$/.exec(l);
      if (blockquoteMatch && !isCovered(0, 1)) {
        tokens.push({
          text: blockquoteMatch[1],
          type: "operator",
          range: { start: { line, column: 0 }, end: { line, column: blockquoteMatch[1].length } },
        });
        markCovered(0, blockquoteMatch[1].length);
      }
      
      // Lists - separate bullet/number from content
      const listMatch = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(l);
      if (listMatch && !isCovered(listMatch[1].length, listMatch[1].length + listMatch[2].length)) {
        const bulletStart = listMatch[1].length;
        tokens.push({
          text: listMatch[2],
          type: "operator",
          range: { start: { line, column: bulletStart }, end: { line, column: bulletStart + listMatch[2].length } },
        });
        markCovered(bulletStart, bulletStart + listMatch[2].length);
      }
      
      // Task lists [ ] and [x]
      const taskMatch = /(\[[ x]\])/gi;
      let taskMatchResult: RegExpExecArray | null;
      while ((taskMatchResult = taskMatch.exec(l))) {
        if (!isCovered(taskMatchResult.index, taskMatchResult.index + taskMatchResult[0].length)) {
          tokens.push({
            text: taskMatchResult[0],
            type: taskMatchResult[0].toLowerCase().includes('x') ? "keyword" : "operator",
            range: { start: { line, column: taskMatchResult.index }, end: { line, column: taskMatchResult.index + taskMatchResult[0].length } },
          });
          markCovered(taskMatchResult.index, taskMatchResult.index + taskMatchResult[0].length);
        }
      }
      
      // Links [text](url) - parse components separately
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let linkMatch: RegExpExecArray | null;
      while ((linkMatch = linkRegex.exec(l))) {
        if (!isCovered(linkMatch.index, linkMatch.index + linkMatch[0].length)) {
          const linkStart = linkMatch.index;
          const textEnd = linkStart + 1 + linkMatch[1].length;
          
          // Link text
          tokens.push({
            text: linkMatch[1],
            type: "string",
            range: { start: { line, column: linkStart + 1 }, end: { line, column: textEnd } },
          });
          
          // URL
          tokens.push({
            text: linkMatch[2],
            type: "link",
            range: { start: { line, column: textEnd + 2 }, end: { line, column: textEnd + 2 + linkMatch[2].length } },
          });
          
          markCovered(linkStart, linkMatch.index + linkMatch[0].length);
        }
      }
      
      // Images ![alt](url) - parse components separately
      const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
      let imageMatch: RegExpExecArray | null;
      while ((imageMatch = imageRegex.exec(l))) {
        if (!isCovered(imageMatch.index, imageMatch.index + imageMatch[0].length)) {
          const imgStart = imageMatch.index;
          const altEnd = imgStart + 2 + imageMatch[1].length;
          
          // Alt text
          tokens.push({
            text: imageMatch[1],
            type: "string",
            range: { start: { line, column: imgStart + 2 }, end: { line, column: altEnd } },
          });
          
          // URL
          tokens.push({
            text: imageMatch[2],
            type: "link",
            range: { start: { line, column: altEnd + 2 }, end: { line, column: altEnd + 2 + imageMatch[2].length } },
          });
          
          markCovered(imgStart, imageMatch.index + imageMatch[0].length);
        }
      }
      
      // Inline code `code`
      const codeRegex = /`([^`]+)`/g;
      let codeMatch: RegExpExecArray | null;
      while ((codeMatch = codeRegex.exec(l))) {
        if (!isCovered(codeMatch.index, codeMatch.index + codeMatch[0].length)) {
          tokens.push({
            text: codeMatch[0],
            type: "string",
            range: { start: { line, column: codeMatch.index }, end: { line, column: codeMatch.index + codeMatch[0].length } },
          });
          markCovered(codeMatch.index, codeMatch.index + codeMatch[0].length);
        }
      }
      
      // Bold **text** or __text__
      const boldRegex = /(\*\*|__)([^*_]+)(\*\*|__)/g;
      let boldMatch: RegExpExecArray | null;
      while ((boldMatch = boldRegex.exec(l))) {
        if (!isCovered(boldMatch.index, boldMatch.index + boldMatch[0].length)) {
          tokens.push({
            text: boldMatch[0],
            type: "keyword",
            range: { start: { line, column: boldMatch.index }, end: { line, column: boldMatch.index + boldMatch[0].length } },
          });
          markCovered(boldMatch.index, boldMatch.index + boldMatch[0].length);
        }
      }
      
      // Italic *text* or _text_ (must come after bold)
      const italicRegex = /([*_])([^*_]+)\1/g;
      let italicMatch: RegExpExecArray | null;
      while ((italicMatch = italicRegex.exec(l))) {
        if (!isCovered(italicMatch.index, italicMatch.index + italicMatch[0].length)) {
          tokens.push({
            text: italicMatch[0],
            type: "comment",
            range: { start: { line, column: italicMatch.index }, end: { line, column: italicMatch.index + italicMatch[0].length } },
          });
          markCovered(italicMatch.index, italicMatch.index + italicMatch[0].length);
        }
      }
      
      // Horizontal rules --- or *** or ___
      if (/^(\*{3,}|-{3,}|_{3,})$/.test(l.trim()) && !isCovered(0, l.length)) {
        tokens.push({
          text: l,
          type: "operator",
          range: { start: { line, column: 0 }, end: { line, column: l.length } },
        });
        markCovered(0, l.length);
      }
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
