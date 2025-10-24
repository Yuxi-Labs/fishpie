# Fishpie Intellisense System

## Overview

Fishpie now features a **comprehensive built-in intellisense system** that provides code completion and hover information for all supported languages. This system works independently of external LSP servers and provides context-aware suggestions.

## Supported Languages

The intellisense system supports the following languages:

1. **JavaScript** - Full keyword completion, global objects, built-in methods
2. **TypeScript** - TypeScript-specific keywords, type utilities, primitive types
3. **HTML** - Tag completion, attribute suggestions
4. **CSS/SCSS** - Property completion, at-rule suggestions, value hints
5. **Markdown** - Syntax helpers, formatting snippets
6. **Story** - Scene markers, character dialogue, stage directions
7. **Plain Text** - Basic support

## Features

### 1. Code Completion

**Trigger**: Press `Ctrl+Space` (or `Cmd+Space` on Mac) to manually trigger completions.

**Auto-trigger**: Completions appear automatically as you type in certain contexts:
- After typing `.` in JavaScript/TypeScript for method suggestions
- After typing `<` in HTML for tag suggestions
- Inside CSS rule blocks for property suggestions

#### JavaScript/TypeScript Completions

- **Keywords**: `const`, `let`, `var`, `function`, `class`, `if`, `for`, `while`, `async`, `await`, etc.
- **Global Objects**: `Array`, `Object`, `String`, `console`, `Promise`, `Map`, `Set`, etc.
- **Built-in Methods**: `map`, `filter`, `reduce`, `forEach`, `find`, `includes`, etc.
- **TypeScript-specific**: `interface`, `type`, `enum`, `Partial`, `Required`, `Pick`, `Omit`, etc.
- **Snippets**: Common code patterns like function declarations, arrow functions, loops, try-catch blocks

**Context-aware examples**:
```javascript
console.   // Shows: log, error, warn, info, debug, table
array.     // Shows: map, filter, reduce, forEach, find, etc.
```

#### HTML Completions

- **Common tags**: `div`, `span`, `p`, `a`, `button`, `input`, `form`, etc.
- **Semantic HTML**: `header`, `footer`, `nav`, `main`, `section`, `article`, `aside`
- **Attributes**: `class`, `id`, `style`, `href`, `src`, `alt`, `type`, etc.

**Auto-closing tags**: When you type `<div>`, it automatically suggests `<div>$0</div>` with the cursor positioned inside.

#### CSS/SCSS Completions

- **Properties**: `color`, `background`, `display`, `position`, `margin`, `padding`, etc.
- **At-rules**: `@media`, `@keyframes`, `@import`, `@supports`, `@font-face`
- **Value hints**: Suggestions for `display` (block, inline, flex, grid), `position` (relative, absolute, fixed)

#### Markdown Completions

- **Headings**: `# Heading 1`, `## Heading 2`, etc.
- **Formatting**: `**bold**`, `*italic*`, `` `code` ``, code blocks
- **Lists**: Unordered (`-`), ordered (`1.`), task lists (`- [ ]`)
- **Links and Images**: `[text](url)`, `![alt](url)`
- **Tables**: Table syntax with headers

### 2. Hover Information

**Trigger**: Hover over any code element or press `Alt` while moving the mouse.

**Automatic**: Hover tooltips appear after a short delay (400ms) when you stop moving the mouse over code.

#### What You Get

- **Keywords**: Detailed descriptions of what each keyword does
- **Built-in functions**: Explanations of method functionality
- **HTML tags**: Purpose and usage of HTML elements
- **CSS properties**: Descriptions of what each CSS property controls
- **Markdown syntax**: Explanations of formatting options

**Reference links**: For many items, tooltips now include direct MDN links for deeper documentation:

- JavaScript keywords, globals, and common methods → MDN Web Docs
- HTML tags and attributes → MDN Element and Attribute pages
- CSS properties and at‑rules → MDN CSS reference

**Examples**:

```javascript
const    // Hover: "Declares a block-scoped, read-only named constant" + MDN link
map      // Hover: "Creates a new array with the results of calling a function for every array element"
```

```html
<div>    // Hover: "<div> HTML element - Block-level container element" + MDN link
href     // Hover: "href attribute - Hyperlink reference (URL)"
```

```css
display  // Hover: "display (CSS property) - Specifies the display behavior (type of rendering box)" + MDN link
```

### 3. Context-Aware Intelligence

The intellisense system analyzes your code context to provide smarter suggestions:

#### JavaScript/TypeScript

- **Method chaining**: After typing `array.map().`, it suggests array methods
- **Console methods**: After `console.`, shows all console methods
- **Object properties**: After `.`, suggests common methods and properties

#### HTML

- **After `<`**: Shows available HTML tags
- **Inside tags**: Shows relevant attributes for the current tag

#### CSS

- **Inside rule blocks**: Shows CSS properties
- **After property name**: Shows valid values for specific properties

### 4. Snippet Support

Completions can include snippets with placeholders:

- `$0` - Final cursor position
- `$1`, `$2`, etc. - Tab stops

**Examples**:

```javascript
// Type "function" and accept completion
function $1($2) {
  $0
}

// Type "arrow" and accept completion
($1) => {
  $0
}
```

## Architecture

### Core Components

1. **`intellisense.ts`**: Main intellisense engine
   - `getCompletions()`: Fetches completions from language providers
   - `getHover()`: Fetches hover information
   - `getContextualCompletions()`: Provides context-aware completions
   - `getWordAtPosition()`: Extracts word at cursor
   - `filterCompletions()`: Filters based on current input

2. **Language Providers** (`src/fish/language/builtins/`):
   - Each language has its own provider module
   - Implements `tokenize()`, `complete()`, and `hover()` methods
   - Contains language-specific keywords, syntax, and documentation

3. **Registry** (`registry.ts`):
   - Manages language provider registration
   - Auto-detects language from file extensions
   - Supports dynamic loading of external language adapters

### How It Works

1. **User Types**: FishEditor captures input
2. **Trigger**: Completion triggered automatically or via `Ctrl+Space`
3. **LSP First**: Attempts to get completions from LSP server (if available)
4. **Fallback**: If no LSP results, uses built-in intellisense
5. **Context Analysis**: Analyzes code context for smarter suggestions
6. **Display**: Shows completion popup with filtered results
7. **Selection**: User navigates with arrow keys and accepts with `Tab` or `Enter`

## Extending the System

### Adding a New Language

1. **Create a language provider** in `src/fish/language/builtins/`:

```typescript
import type { LanguageProvider, Token, Position, CompletionItem, Hover } from "../types";

export const myLanguage: LanguageProvider = {
  id: "mylang",
  
  tokenize(text: string): Token[] {
    // Parse and return tokens for syntax highlighting
    return [];
  },
  
  complete(text: string, position: Position): CompletionItem[] {
    // Return completion suggestions
    return [
      { label: "keyword", kind: "keyword", detail: "Description" }
    ];
  },
  
  hover(text: string, position: Position): Hover | null {
    // Return hover information
    return { contents: "Documentation", range: { ... } };
  }
};
```

2. **Register the language** in `registry.ts`:

```typescript
import { myLanguage } from "./builtins/mylang";

registerLanguage(myLanguage);
```

3. **Add file extension mapping**:

```typescript
export function languageForFilename(filename?: string): string {
  if (!filename) return "plaintext";
  const f = filename.toLowerCase();
  // ... existing mappings
  if (f.endsWith(".mylang")) return "mylang";
  return "plaintext";
}
```

### Adding Context-Aware Features

Extend `getLanguageSpecificContext()` in `intellisense.ts`:

```typescript
function getLanguageSpecificContext(
  language: string,
  beforeCursor: string,
  text: string,
  position: Position
): CompletionItem[] {
  switch (language) {
    case "mylang":
      return getMyLanguageContext(beforeCursor);
    // ... existing cases
  }
}
```

## Performance

- **Lazy Loading**: External language providers load on demand
- **Caching**: Tokenization results are cached per language
- **Debouncing**: Hover requests are debounced (400ms delay)
- **Request Sequencing**: Prevents race conditions with completion requests

## Best Practices

1. **Use Ctrl+Space liberally**: Don't wait for auto-complete, trigger manually
2. **Navigate with keyboard**: Use arrow keys to select, Tab/Enter to accept
3. **Read hover tooltips**: They provide valuable documentation
4. **Context matters**: Position your cursor correctly for relevant suggestions
5. **Snippets**: Look for completions with `$0` placeholders for faster coding

## Future Enhancements

- [ ] Import auto-completion from project files
- [ ] Variable and function name extraction
- [ ] Smart import suggestions
- [ ] Parameter hints
- [ ] Signature help
- [ ] Code actions (quick fixes)
- [ ] Refactoring suggestions
- [ ] Documentation generation

## Troubleshooting

**Completions not appearing?**
- Press `Ctrl+Space` to manually trigger
- Check that you're in a supported language
- Verify file extension is recognized

**Hover not working?**
- Try holding `Alt` and moving the mouse
- Wait for the 400ms delay
- Ensure you're hovering over a recognized token

**Wrong suggestions?**
- The context may not be detected correctly
- Try typing more to narrow results
- Some contexts require specific patterns (e.g., `console.` for console methods)

## Contributing

To improve the intellisense system:

1. Add more keywords and built-in functions to language providers
2. Enhance context detection patterns
3. Add more comprehensive documentation strings
4. Submit issues for missing or incorrect completions

---

**Note**: This intellisense system is designed to work offline and independently of external tools. It complements LSP servers when available but provides full functionality on its own.
