/**
 * Fishpie Intellisense System
 * A comprehensive built-in intellisense for all supported languages
 */

import type { CompletionItem, Hover, Position } from "./types";
import { getOrLoadLanguage } from "./registry";

/**
 * Request completions for a given language, text, and position
 * Falls back to built-in provider if LSP is unavailable
 */
export async function getCompletions(
  language: string,
  text: string,
  position: Position
): Promise<CompletionItem[]> {
  const provider = await getOrLoadLanguage(language);
  if (!provider || !provider.complete) return [];
  
  const result = provider.complete(text, position);
  return result instanceof Promise ? await result : result;
}

/**
 * Request hover information for a given language, text, and position
 * Falls back to built-in provider if LSP is unavailable
 */
export async function getHover(
  language: string,
  text: string,
  position: Position
): Promise<Hover | null> {
  const provider = await getOrLoadLanguage(language);
  if (!provider || !provider.hover) return null;
  
  const result = provider.hover(text, position);
  return result instanceof Promise ? await result : result;
}

/**
 * Get the word at a specific position in text
 */
export function getWordAtPosition(text: string, position: Position): { word: string; start: Position; end: Position } | null {
  const lines = text.split(/\n/);
  if (position.line < 0 || position.line >= lines.length) return null;
  
  const line = lines[position.line];
  if (position.column < 0 || position.column > line.length) return null;
  
  // Find word boundaries
  let start = position.column;
  let end = position.column;
  
  // Word characters: letters, digits, underscore, dollar sign
  const isWordChar = (c: string) => /[\w$]/.test(c);
  
  // Move start backward
  while (start > 0 && isWordChar(line[start - 1])) {
    start--;
  }
  
  // Move end forward
  while (end < line.length && isWordChar(line[end])) {
    end++;
  }
  
  if (start === end) return null;
  
  return {
    word: line.slice(start, end),
    start: { line: position.line, column: start },
    end: { line: position.line, column: end },
  };
}

/**
 * Enhanced completion filtering based on current input
 */
export function filterCompletions(
  completions: CompletionItem[],
  text: string,
  position: Position
): CompletionItem[] {
  const wordInfo = getWordAtPosition(text, position);
  if (!wordInfo) return completions;
  
  const prefix = wordInfo.word.toLowerCase();
  if (!prefix) return completions;
  
  return completions
    .filter(item => item.label.toLowerCase().startsWith(prefix))
    .sort((a, b) => {
      // Sort by exact match first, then alphabetically
      const aExact = a.label.toLowerCase() === prefix ? -1 : 0;
      const bExact = b.label.toLowerCase() === prefix ? -1 : 0;
      if (aExact !== bExact) return aExact - bExact;
      return a.label.localeCompare(b.label);
    });
}

/**
 * Context-aware completion provider
 * Analyzes the code context to provide smarter suggestions
 */
export async function getContextualCompletions(
  language: string,
  text: string,
  position: Position
): Promise<CompletionItem[]> {
  const baseCompletions = await getCompletions(language, text, position);
  
  // Get current line and character context
  const lines = text.split(/\n/);
  const currentLine = lines[position.line] || "";
  const beforeCursor = currentLine.slice(0, position.column);
  
  // Add context-specific completions based on language
  const contextual = getLanguageSpecificContext(language, beforeCursor, text, position);
  
  return [...contextual, ...baseCompletions];
}

/**
 * Get language-specific contextual completions
 */
function getLanguageSpecificContext(
  language: string,
  beforeCursor: string,
  _text: string,
  _position: Position
): CompletionItem[] {
  switch (language) {
    case "javascript":
    case "typescript":
      return getJavaScriptContext(beforeCursor, _text, _position);
    
    case "html":
      return getHTMLContext(beforeCursor);
    
    case "css":
    case "scss":
      return getCSSContext(beforeCursor);
    
    case "markdown":
      return getMarkdownContext(beforeCursor);
    
    default:
      return [];
  }
}

/**
 * JavaScript/TypeScript context-aware completions
 */
function getJavaScriptContext(beforeCursor: string, _text: string, _position: Position): CompletionItem[] {
  const completions: CompletionItem[] = [];
  
  // Console methods
  if (beforeCursor.endsWith("console.")) {
    return [
      { label: "log", kind: "method", insertText: "log($0)", detail: "console.log()" },
      { label: "error", kind: "method", insertText: "error($0)", detail: "console.error()" },
      { label: "warn", kind: "method", insertText: "warn($0)", detail: "console.warn()" },
      { label: "info", kind: "method", insertText: "info($0)", detail: "console.info()" },
      { label: "debug", kind: "method", insertText: "debug($0)", detail: "console.debug()" },
      { label: "table", kind: "method", insertText: "table($0)", detail: "console.table()" },
    ];
  }
  
  // Array methods
  if (/\w+\s*\.\s*$/.test(beforeCursor)) {
    completions.push(
      { label: "map", kind: "method", insertText: "map($0)", detail: "Array.prototype.map()" },
      { label: "filter", kind: "method", insertText: "filter($0)", detail: "Array.prototype.filter()" },
      { label: "reduce", kind: "method", insertText: "reduce($0)", detail: "Array.prototype.reduce()" },
      { label: "forEach", kind: "method", insertText: "forEach($0)", detail: "Array.prototype.forEach()" },
      { label: "find", kind: "method", insertText: "find($0)", detail: "Array.prototype.find()" },
      { label: "some", kind: "method", insertText: "some($0)", detail: "Array.prototype.some()" },
      { label: "every", kind: "method", insertText: "every($0)", detail: "Array.prototype.every()" },
      { label: "includes", kind: "method", insertText: "includes($0)", detail: "Array.prototype.includes()" },
      { label: "slice", kind: "method", insertText: "slice($0)", detail: "Array.prototype.slice()" },
      { label: "splice", kind: "method", insertText: "splice($0)", detail: "Array.prototype.splice()" },
      { label: "push", kind: "method", insertText: "push($0)", detail: "Array.prototype.push()" },
      { label: "pop", kind: "method", insertText: "pop()", detail: "Array.prototype.pop()" },
      { label: "shift", kind: "method", insertText: "shift()", detail: "Array.prototype.shift()" },
      { label: "unshift", kind: "method", insertText: "unshift($0)", detail: "Array.prototype.unshift()" },
      { label: "join", kind: "method", insertText: "join($0)", detail: "Array.prototype.join()" },
      { label: "sort", kind: "method", insertText: "sort($0)", detail: "Array.prototype.sort()" },
      { label: "reverse", kind: "method", insertText: "reverse()", detail: "Array.prototype.reverse()" },
      { label: "length", kind: "property", detail: "Array.length" },
      { label: "toString", kind: "method", insertText: "toString()", detail: "Object.prototype.toString()" },
      { label: "charAt", kind: "method", insertText: "charAt($0)", detail: "String.prototype.charAt()" },
      { label: "indexOf", kind: "method", insertText: "indexOf($0)", detail: "String/Array.prototype.indexOf()" },
      { label: "substring", kind: "method", insertText: "substring($0)", detail: "String.prototype.substring()" },
      { label: "toLowerCase", kind: "method", insertText: "toLowerCase()", detail: "String.prototype.toLowerCase()" },
      { label: "toUpperCase", kind: "method", insertText: "toUpperCase()", detail: "String.prototype.toUpperCase()" },
      { label: "trim", kind: "method", insertText: "trim()", detail: "String.prototype.trim()" },
      { label: "split", kind: "method", insertText: "split($0)", detail: "String.prototype.split()" },
      { label: "replace", kind: "method", insertText: "replace($0)", detail: "String.prototype.replace()" },
      { label: "match", kind: "method", insertText: "match($0)", detail: "String.prototype.match()" },
    );
  }
  
  // Common snippets
  if (beforeCursor.trim() === "" || /^\s*$/.test(beforeCursor)) {
    completions.push(
      { label: "function", kind: "snippet", insertText: "function $1($2) {\n  $0\n}", detail: "Function declaration" },
      { label: "arrow", kind: "snippet", insertText: "($1) => {\n  $0\n}", detail: "Arrow function" },
      { label: "if", kind: "snippet", insertText: "if ($1) {\n  $0\n}", detail: "If statement" },
      { label: "for", kind: "snippet", insertText: "for (let $1 = 0; $1 < $2; $1++) {\n  $0\n}", detail: "For loop" },
      { label: "while", kind: "snippet", insertText: "while ($1) {\n  $0\n}", detail: "While loop" },
      { label: "try", kind: "snippet", insertText: "try {\n  $0\n} catch (error) {\n  \n}", detail: "Try-catch block" },
      { label: "class", kind: "snippet", insertText: "class $1 {\n  constructor($2) {\n    $0\n  }\n}", detail: "Class declaration" },
    );
  }
  
  return completions;
}

/**
 * HTML context-aware completions
 */
function getHTMLContext(beforeCursor: string): CompletionItem[] {
  const completions: CompletionItem[] = [];
  
  // Tag completions
  if (beforeCursor.endsWith("<")) {
    return [
      { label: "div", kind: "tag", insertText: "div>$0</div>", detail: "Block container" },
      { label: "span", kind: "tag", insertText: "span>$0</span>", detail: "Inline container" },
      { label: "p", kind: "tag", insertText: "p>$0</p>", detail: "Paragraph" },
      { label: "a", kind: "tag", insertText: "a href=\"$1\">$0</a>", detail: "Anchor/link" },
      { label: "img", kind: "tag", insertText: "img src=\"$1\" alt=\"$0\" />", detail: "Image" },
      { label: "button", kind: "tag", insertText: "button>$0</button>", detail: "Button" },
      { label: "input", kind: "tag", insertText: "input type=\"$1\" />", detail: "Input field" },
      { label: "form", kind: "tag", insertText: "form>$0</form>", detail: "Form" },
      { label: "ul", kind: "tag", insertText: "ul>\n  <li>$0</li>\n</ul>", detail: "Unordered list" },
      { label: "ol", kind: "tag", insertText: "ol>\n  <li>$0</li>\n</ol>", detail: "Ordered list" },
      { label: "table", kind: "tag", insertText: "table>\n  <tr>\n    <td>$0</td>\n  </tr>\n</table>", detail: "Table" },
      { label: "h1", kind: "tag", insertText: "h1>$0</h1>", detail: "Heading 1" },
      { label: "h2", kind: "tag", insertText: "h2>$0</h2>", detail: "Heading 2" },
      { label: "h3", kind: "tag", insertText: "h3>$0</h3>", detail: "Heading 3" },
      { label: "script", kind: "tag", insertText: "script>$0</script>", detail: "Script" },
      { label: "style", kind: "tag", insertText: "style>$0</style>", detail: "Style" },
      { label: "link", kind: "tag", insertText: "link rel=\"$1\" href=\"$0\" />", detail: "Link (stylesheet)" },
      { label: "meta", kind: "tag", insertText: "meta name=\"$1\" content=\"$0\" />", detail: "Meta tag" },
    ];
  }
  
  // Attribute completions
  if (/<\w+\s+[^>]*$/.test(beforeCursor)) {
    return [
      { label: "class", kind: "attribute", insertText: "class=\"$0\"", detail: "CSS class" },
      { label: "id", kind: "attribute", insertText: "id=\"$0\"", detail: "Element ID" },
      { label: "style", kind: "attribute", insertText: "style=\"$0\"", detail: "Inline styles" },
      { label: "href", kind: "attribute", insertText: "href=\"$0\"", detail: "Hyperlink reference" },
      { label: "src", kind: "attribute", insertText: "src=\"$0\"", detail: "Source" },
      { label: "alt", kind: "attribute", insertText: "alt=\"$0\"", detail: "Alternative text" },
      { label: "title", kind: "attribute", insertText: "title=\"$0\"", detail: "Title" },
      { label: "type", kind: "attribute", insertText: "type=\"$0\"", detail: "Type" },
      { label: "value", kind: "attribute", insertText: "value=\"$0\"", detail: "Value" },
      { label: "placeholder", kind: "attribute", insertText: "placeholder=\"$0\"", detail: "Placeholder text" },
      { label: "disabled", kind: "attribute", insertText: "disabled", detail: "Disabled" },
      { label: "readonly", kind: "attribute", insertText: "readonly", detail: "Read-only" },
      { label: "required", kind: "attribute", insertText: "required", detail: "Required field" },
    ];
  }
  
  return completions;
}

/**
 * CSS/SCSS context-aware completions
 */
function getCSSContext(beforeCursor: string): CompletionItem[] {
  const completions: CompletionItem[] = [];
  
  // Property completions
  if (/{\s*[^}]*$/.test(beforeCursor) || /;\s*[^}]*$/.test(beforeCursor)) {
    return [
      { label: "color", kind: "property", insertText: "color: $0;", detail: "Text color" },
      { label: "background", kind: "property", insertText: "background: $0;", detail: "Background" },
      { label: "background-color", kind: "property", insertText: "background-color: $0;", detail: "Background color" },
      { label: "font-size", kind: "property", insertText: "font-size: $0;", detail: "Font size" },
      { label: "font-family", kind: "property", insertText: "font-family: $0;", detail: "Font family" },
      { label: "font-weight", kind: "property", insertText: "font-weight: $0;", detail: "Font weight" },
      { label: "margin", kind: "property", insertText: "margin: $0;", detail: "Margin" },
      { label: "padding", kind: "property", insertText: "padding: $0;", detail: "Padding" },
      { label: "display", kind: "property", insertText: "display: $0;", detail: "Display mode" },
      { label: "position", kind: "property", insertText: "position: $0;", detail: "Position" },
      { label: "width", kind: "property", insertText: "width: $0;", detail: "Width" },
      { label: "height", kind: "property", insertText: "height: $0;", detail: "Height" },
      { label: "border", kind: "property", insertText: "border: $0;", detail: "Border" },
      { label: "border-radius", kind: "property", insertText: "border-radius: $0;", detail: "Border radius" },
      { label: "flex", kind: "property", insertText: "flex: $0;", detail: "Flex" },
      { label: "grid", kind: "property", insertText: "grid: $0;", detail: "Grid" },
      { label: "align-items", kind: "property", insertText: "align-items: $0;", detail: "Align items" },
      { label: "justify-content", kind: "property", insertText: "justify-content: $0;", detail: "Justify content" },
      { label: "text-align", kind: "property", insertText: "text-align: $0;", detail: "Text alignment" },
      { label: "z-index", kind: "property", insertText: "z-index: $0;", detail: "Z-index" },
      { label: "opacity", kind: "property", insertText: "opacity: $0;", detail: "Opacity" },
      { label: "transition", kind: "property", insertText: "transition: $0;", detail: "Transition" },
      { label: "transform", kind: "property", insertText: "transform: $0;", detail: "Transform" },
      { label: "box-shadow", kind: "property", insertText: "box-shadow: $0;", detail: "Box shadow" },
    ];
  }
  
  // Value completions for display property
  if (/display:\s*[^;]*$/.test(beforeCursor)) {
    return [
      { label: "block", kind: "value", detail: "Block display" },
      { label: "inline", kind: "value", detail: "Inline display" },
      { label: "inline-block", kind: "value", detail: "Inline-block display" },
      { label: "flex", kind: "value", detail: "Flexbox display" },
      { label: "grid", kind: "value", detail: "Grid display" },
      { label: "none", kind: "value", detail: "Hide element" },
    ];
  }
  
  // Value completions for position property
  if (/position:\s*[^;]*$/.test(beforeCursor)) {
    return [
      { label: "static", kind: "value", detail: "Static position" },
      { label: "relative", kind: "value", detail: "Relative position" },
      { label: "absolute", kind: "value", detail: "Absolute position" },
      { label: "fixed", kind: "value", detail: "Fixed position" },
      { label: "sticky", kind: "value", detail: "Sticky position" },
    ];
  }
  
  return completions;
}

/**
 * Markdown context-aware completions
 */
function getMarkdownContext(beforeCursor: string): CompletionItem[] {
  if (/^\s*$/.test(beforeCursor)) {
    return [
      { label: "# Heading 1", kind: "heading", insertText: "# $0", detail: "Level 1 heading" },
      { label: "## Heading 2", kind: "heading", insertText: "## $0", detail: "Level 2 heading" },
      { label: "### Heading 3", kind: "heading", insertText: "### $0", detail: "Level 3 heading" },
      { label: "- List item", kind: "list", insertText: "- $0", detail: "Unordered list" },
      { label: "1. Numbered item", kind: "list", insertText: "1. $0", detail: "Ordered list" },
      { label: "[ ] Task", kind: "list", insertText: "- [ ] $0", detail: "Task list item" },
      { label: "[x] Done", kind: "list", insertText: "- [x] $0", detail: "Completed task" },
      { label: "```code```", kind: "snippet", insertText: "```$1\n$0\n```", detail: "Code block" },
      { label: "> Quote", kind: "snippet", insertText: "> $0", detail: "Blockquote" },
      { label: "---", kind: "snippet", insertText: "---", detail: "Horizontal rule" },
      { label: "[link](url)", kind: "snippet", insertText: "[$1]($0)", detail: "Link" },
      { label: "![image](url)", kind: "snippet", insertText: "![$1]($0)", detail: "Image" },
      { label: "| table |", kind: "snippet", insertText: "| $1 | $2 |\n| --- | --- |\n| $0 |  |", detail: "Table" },
    ];
  }
  return [];
}
