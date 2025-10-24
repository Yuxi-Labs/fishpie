# Fishpie Intellisense - Quick Start Guide

## 🚀 Getting Started

Your Fishpie editor now has **intelligent code completion and documentation** built right in!

## Basic Usage

### 1. Auto-Complete While Typing

Just start typing and suggestions appear automatically:

```javascript
// Type "con" and see:
const ✓
continue
console

// Type "console." and see:
console.log ✓
console.error
console.warn
console.info
```

### 2. Force Completions

Press **Ctrl+Space** (or **Cmd+Space** on Mac) anytime to show available completions.

### 3. Navigate Completions

- **↑↓ Arrow Keys** - Navigate through suggestions
- **Tab or Enter** - Accept selected completion
- **Esc** - Close completion menu

### 4. View Documentation

**Hover** over any code element to see documentation:
- Hold **Alt** while moving mouse for instant hover
- Or just hover and wait 400ms

## Language Examples

### JavaScript

```javascript
// Keywords with docs
const myArray = [1, 2, 3];
// Hover over "const" → "Declares a block-scoped, read-only named constant"

// Method completions
myArray.  // Shows: map, filter, reduce, forEach, find, etc.

// Console methods
console.  // Shows: log, error, warn, info, debug, table

// Code snippets
function  // Expands to: function name(params) { }
arrow     // Expands to: (params) => { }
try       // Expands to: try { } catch (error) { }
```

### TypeScript

```typescript
// TypeScript keywords
interface User {
  name: string;  // Hover over "interface" → documentation
  age: number;
}

// Utility types
type Partial  // Shows: Partial, Pick, Omit, Required, etc.

// Type modifiers
public    // Shows: public, private, protected, readonly
```

### HTML

```html
<!-- Tag completions -->
<        <!-- Shows: div, span, p, button, form, etc. -->

<!-- Attribute completions -->
<div     <!-- Shows: class, id, style, title, etc. -->

<!-- Auto-closing tags -->
<div>    <!-- Automatically suggests: <div>_</div> -->
```

### CSS

```css
/* Property completions */
.myClass {
  d       /* Shows: display, direction, etc. */
  b       /* Shows: background, border, box-shadow, etc. */
}

/* Value completions */
.flex {
  display:   /* Shows: block, inline, flex, grid, none */
  position:  /* Shows: static, relative, absolute, fixed, sticky */
}

/* At-rules */
@        /* Shows: @media, @keyframes, @import, @font-face */
```

### Markdown

```markdown
<!-- Heading shortcuts -->
#        → # Heading 1
##       → ## Heading 2

<!-- Formatting -->
**       → **bold text**
*        → *italic text*
`        → `inline code`

<!-- Lists -->
-        → - list item
1.       → 1. numbered item
- [ ]    → - [ ] task item

<!-- Links and images -->
[        → [text](url)
![       → ![alt](url)

<!-- Code blocks -->
```      → ```language\n\n```
```

### Story Format

```story
<!-- Scene headers -->
===      → === Scene Title ===

<!-- Character dialogue -->
CHAR     → CHARACTER: dialogue text

<!-- Stage directions -->
(        → (action description)

<!-- Transitions -->
FADE     → FADE IN:, FADE OUT:, CUT TO:
```

## Pro Tips

### 1. Context Matters

Position your cursor correctly for relevant suggestions:

```javascript
// After a dot → method completions
array.|     

// At start of line → statement completions
|const x = 5;

// Inside string → no completions
"hello |"
```

### 2. Use Snippets

Look for completions with **$** markers - these are snippets with tab stops:

```javascript
function $1($2) {
  $0
}
```

After accepting:
1. Type function name (at $1)
2. Press Tab → Move to parameters (at $2)
3. Press Tab → Move to body (at $0)

### 3. Read Hover Docs

Hover tooltips teach you as you code:

```javascript
// Hover over any keyword
const → "Declares a block-scoped, read-only named constant"
async → "Declares an async function"
await → "Waits for a Promise"

// Hover over methods
map → "Creates a new array with the results of calling a function for every array element"
```

### 4. Keyboard Shortcuts

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Trigger completions | Ctrl+Space | Cmd+Space |
| Accept completion | Tab / Enter | Tab / Enter |
| Close completions | Esc | Esc |
| Navigate up | ↑ | ↑ |
| Navigate down | ↓ | ↓ |
| Force hover | Alt+hover | Alt+hover |

## Troubleshooting

### Completions not showing?

1. Press **Ctrl+Space** to manually trigger
2. Check you're in a supported language
3. Verify your cursor position

### Hover not working?

1. Try holding **Alt** while hovering
2. Wait for the 400ms delay
3. Make sure you're over a recognized token

### Wrong suggestions?

1. Type more characters to narrow results
2. Use **Ctrl+Space** to see all options
3. Check the language detected in status bar

## Language Detection

The editor automatically detects language from file extension:

| Extension | Language |
|-----------|----------|
| .js, .jsx | JavaScript |
| .ts, .tsx | TypeScript |
| .html, .htm | HTML |
| .css | CSS |
| .scss, .sass | SCSS |
| .md | Markdown |
| .story | Story |
| .txt | Plain Text |

Check the **status bar** (bottom right) to see detected language.

## What's Included

✅ **200+ completion items** across all languages  
✅ **150+ documentation strings** for hover tooltips  
✅ **20+ context-aware patterns** for smart suggestions  
✅ **Code snippets** with tab stops  
✅ **Works offline** - no internet required  
✅ **Lightning fast** - instant suggestions  

## Learn More

- Full documentation: `docs/intellisense-system.md`
- Implementation details: `INTELLISENSE_SUMMARY.md`
- Language providers: `src/fish/language/builtins/`

---

**Happy Coding!** 🎉

The intellisense system learns with you. The more you use it, the more productive you become!
