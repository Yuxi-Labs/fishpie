# Fish Editor - Feature Implementation Checklist

This document tracks the implementation status of features for the **Fish** editor component within Fishpie IDE. Features are organized by priority tier and aligned with the Fishpie specification.

---

## Core Text Editing Features

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **Syntax highlighting** | ✅ Implemented | Token-based system with 8+ languages (JS, TS, HTML, CSS, SCSS, Markdown, Story, Plaintext, GPTP, Narrative). Coverage tracking prevents token overlaps. |
| **Line numbers** | ✅ Implemented | Canvas-based rendering with dynamic width calculation based on line count. |
| **Multi-cursor editing** | ⚠️ Partial | Single caret + anchor selection model; true multi-cursor (multiple independent carets) not yet implemented. |
| **Code folding** | ✅ Implemented | Bracket folding, function/class folding for JS/TS, comment folding. Gutter icons (▼/▶), keyboard shortcuts (Ctrl+Shift+[/]), click to toggle. Auto-unfolds on edits. |
| **Bracket/quote matching** | ✅ Implemented | Auto-pairing via `autoPairDecision()` function in `pairs.ts`. Pairs: `()`, `[]`, `{}`, `""`, `''`, `` ` ` ``. Smart skip on closing. |
| **Selection & drag** | ✅ Implemented | Click-and-drag selection with anchor/caret model. Shift+arrows for keyboard selection. |
| **Clipboard operations** | ✅ Implemented | Copy, cut, paste with both clipboard API and event handlers. |
| **Undo/redo stack** | ✅ Implemented | Full history management with operation batching, cursor restoration, and configurable limits. Ctrl+Z (undo), Ctrl+Y/Ctrl+Shift+Z (redo). |

---

## Selection & Navigation

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **Go to line** | ❌ Not implemented | No command palette integration for line jumping. |
| **Go to symbol** | ❌ Not implemented | No symbol index or jump-to-definition. |
| **Quick file switcher** | ✅ Implemented | Command Palette (Ctrl+Shift+P) includes file operations. |
| **Find/replace** | ✅ Implemented | Full-featured search with regex, case sensitivity, whole word options. Ctrl+F (find), Ctrl+H (replace). Match highlighting with navigation. |
| **Home/End navigation** | ✅ Implemented | Home = start of line, End = end of line. |
| **Arrow key navigation** | ✅ Implemented | All four arrows with Shift for selection extension. |
| **Mouse selection** | ✅ Implemented | Click to position caret, drag to select, double-click handled by browser. |

---

## Language Awareness & IntelliSense

### Supported Languages

Built-in language support for 8+ languages with syntax highlighting, completions, and hover documentation:

- **JavaScript** - Keywords, global objects (Array, console, Promise), built-in methods (map, filter, reduce), snippets
- **TypeScript** - TypeScript keywords, type utilities (Partial, Pick, Omit), primitive types, extends JavaScript completions
- **HTML** - 30+ tags (div, span, button, form), 18+ attributes (class, id, href), auto-closing tags
- **CSS/SCSS** - 28+ properties (color, display, position), at-rules (@media, @keyframes), value suggestions
- **Markdown** - Headings, formatting (bold, italic, code), lists, links, images, tables
- **Story** - Scene markers, character dialogue, stage directions, screenplay transitions
- **Plain Text** - Basic support, no special features
- **GPTP/Narrative** - Optional adapters with light tokenization

### Core Features

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **Token-based highlighting** | ✅ Implemented | Each language provider exports `tokenize()` returning `Token[]` with types and ranges. Coverage tracking prevents overlaps. |
| **Language auto-detection** | ✅ Implemented | Registry system maps filename extensions to language IDs via `languageForFilename()`. |
| **Automatic indentation** | ✅ Implemented | Smart indentation detection (tabs vs 2/4 spaces). Extra indent after `{`, `[`, `(`, `:`. Enter key respects current line indent. |

### IntelliSense System

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **Context-aware completions** | ✅ Implemented | 200+ completion items. Smart filtering based on context (method chaining, property access, tag context). Trigger: Ctrl+Space or auto-trigger on `.` `<` `{` |
| **Hover documentation** | ✅ Implemented | Rich tooltips with descriptions and MDN links for JS/TS/HTML/CSS. Trigger: Alt+hover or 400ms dwell. |
| **Snippet expansion** | ✅ Implemented | VS Code-style snippets with tabstops (`$1`, `${1:default}`, `$0`). Tab to jump between stops. Functions, loops, try-catch blocks. |
| **Method chaining** | ✅ Implemented | After typing `.` shows methods for objects (e.g., `array.` → map, filter, reduce). Detects `console.` → log, error, warn. |
| **Keyboard navigation** | ✅ Implemented | Arrow keys ↑↓ navigate completions. Enter/Tab accepts. Esc dismisses. |
| **Auto-trigger** | ✅ Implemented | Completions appear automatically: JS after `.`, HTML after `<`, CSS in rule blocks. |

### Language-Specific Details

**JavaScript/TypeScript:**
- 34+ keywords (`const`, `let`, `function`, `class`, `async`, `await`, `interface`, `type`)
- Global objects: `Array`, `Object`, `String`, `console`, `Promise`, `Map`, `Set`
- Built-in methods: `map`, `filter`, `reduce`, `forEach`, `find`, `includes`, `slice`, `push`
- TypeScript utilities: `Partial`, `Required`, `Pick`, `Omit`, `Record`, `Readonly`
- 7 code snippets: function declarations, arrow functions, async functions, classes, try-catch, for loops

**HTML:**
- Common tags: `div`, `span`, `p`, `a`, `button`, `input`, `form`, `img`, `ul`, `li`
- Semantic elements: `header`, `footer`, `nav`, `main`, `section`, `article`, `aside`
- Attributes: `class`, `id`, `style`, `href`, `src`, `alt`, `type`, `value`, `placeholder`
- Auto-closing: `<div>` suggests `<div>$0</div>` with cursor inside

**CSS/SCSS:**
- Properties: `color`, `background`, `display`, `position`, `margin`, `padding`, `flex`, `grid`
- At-rules: `@media`, `@keyframes`, `@import`, `@supports`, `@font-face`, `@charset`
- Value hints: `display` → block/inline/flex/grid, `position` → relative/absolute/fixed/sticky

**Markdown:**
- 17+ formatting snippets: headings, bold, italic, code, code blocks, lists, task lists, links, images, tables

**Architecture:**
- Core: `src/fish/language/intellisense.ts` - Context extraction, completion filtering, hover lookup
- Providers: `src/fish/language/builtins/*.ts` - Per-language completions and tokenization
- Registry: `src/fish/language/registry.ts` - Language loading and filename mapping
- Integration: `FishEditor.tsx` - LSP fallback → built-in intellisense → language provider

---

## Editing Enhancements

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **Auto-indent on Enter** | ✅ Implemented | Maintains indentation of previous line. Adds extra indent after opening braces/brackets/colons. |
| **Smart brace formatting** | ✅ Implemented | Enter between `{}`, `[]`, or `()` creates three-line block with proper indentation. |
| **Tab key indentation** | ✅ Implemented | Smart detection of file's indentation style. Inserts tabs or spaces accordingly. |
| **Comment toggling** | ❌ Not implemented | No command to comment/uncomment selected lines. |
| **Duplicate line** | ❌ Not implemented | No Ctrl+D or similar shortcut. |
| **Move line up/down** | ❌ Not implemented | No Alt+Up/Down shortcuts. |

---

## File Awareness

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **Shows unsaved changes** | ✅ Implemented | Dirty indicators (blue circles) in tabs and Explorer. Smart tracking compares to original content. |
| **Diff from last save** | ❌ Not implemented | No inline diff view or gutter markers. |
| **Tab management** | ✅ Implemented | Multiple tabs per editor group. Close, close all, close saved tabs. Context menu on tab row. |
| **Multiple files open** | ✅ Implemented | State managed in `ui.tsx` with `EditorGroup[]` and per-file `FileState` cache. |
| **Auto-save** | ❌ Not implemented | Manual save only (Ctrl+S). |

---

## Performance & Rendering

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **Starts instantly in browser** | ✅ Implemented | Canvas-based rendering with no build step. Lightweight tokenization. |
| **Virtualized rendering** | ✅ Implemented | Viewport-based rendering with `calculateVisibleRange()` in `core/virtualization.ts`. Only renders visible lines (+ buffer) for optimal performance with large files (10k+ lines). Custom scrollbar with click/drag support. |
| **Streaming model for large files** | ❌ Not implemented | Entire file loaded into `TextDocument` at once. |
| **Worker-based parsing** | ❌ Not implemented | Tokenization runs on main thread. Could move to Web Worker for large files. |
| **Responsive canvas** | ✅ Implemented | High-DPI support via `devicePixelRatio`. Smooth scrolling with wheel/touch events and custom scrollbar. |

---

## Extended IDE Features (Tier 2)

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **Command palette** | ✅ Implemented | Ctrl+Shift+P with searchable commands for view toggles, editor splits, file operations. |
| **Theme system** | ✅ Implemented | Light/dark themes via CSS variables. Token colors mapped in `FishEditor.tsx`. |
| **Keybindings** | ⚠️ Partial | Hardcoded shortcuts (Ctrl+S, Ctrl+C/V/X, arrows, Home/End, Tab). No remapping UI. |
| **Autocomplete UI** | ✅ Implemented | Popup palette with arrow navigation and Enter/Tab to accept. Word-based filtering. |
| **Mini-map** | ❌ Not implemented | No overview/minimap sidebar. |
| **Split views** | ✅ Implemented | Split Editor Right command creates side-by-side groups. Each group has independent tabs. |
| **Synchronized scrolling** | ❌ Not implemented | Split editors scroll independently. |
| **Snippets library** | ⚠️ Partial | Inline snippet expansion works. No user-defined snippet management UI. |

---

## Browser-Native Features (Tier 3)

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **Runs entirely in browser sandbox** | ✅ Implemented | No Node.js or native dependencies. Pure client-side. |
| **Persistent local storage** | ✅ Implemented | IndexedDB for file texts, `localStorage` for UI state (groups, tabs, view locations, dirty state). |
| **File System Access API** | ✅ Implemented | Opens folders via `showDirectoryPicker()`. Reads files with `FileSystemFileHandle`. |
| **Cloud sync** | ❌ Not implemented | No backend integration or WebDAV. |
| **Responsive & touch-friendly** | ⚠️ Partial | Canvas-based; basic touch scroll works but no gesture-based selection or toolbar. |
| **PWA installability** | ✅ Implemented | Next.js app with manifest and service worker support (if configured). |
| **Sandboxed plugin model** | ❌ Not implemented | No extension API or Web Worker plugins. Language providers are directly imported. |

---

## Collaboration & Sharing (Tier 4)

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **Live collaboration** | ❌ Not implemented | No WebRTC/WebSocket multi-user editing. |
| **Version awareness** | ❌ Not implemented | No inline diffs, history view, or snapshot system. |
| **Shareable sessions** | ❌ Not implemented | No URL-based session sharing. |
| **Web-embeddable** | ⚠️ Partial | `FishEditor` is a React component; could be embedded but not packaged as standalone widget. |
| **LSP/DAP support** | ⚠️ Partial | TypeScript intellisense adapter exists (`tsIntellisense.ts`) but not fully LSP-compliant. No DAP. |

---

## Accessibility & UX

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **Keyboard-first design** | ✅ Implemented | Full keyboard navigation: arrows, Home/End, Tab, shortcuts (Ctrl+S, Ctrl+Shift+P). |
| **Screen reader support** | ❌ Not implemented | Canvas-based rendering lacks ARIA labels and DOM accessibility tree. |
| **Configurable font & spacing** | ⚠️ Partial | Font size/family hardcoded in CSS. Line height configurable via canvas rendering constants. |
| **Word wrap** | ✅ Implemented | Toggle word wrap with Alt+Z. Uses `wordwrap.ts` utilities for text measurement and line breaking at word boundaries. |
| **Error resilience** | ✅ Implemented | Tokenizers gracefully handle invalid input. Partial tokens rendered without crashes. |
| **Graceful degradation** | ✅ Implemented | Falls back to plaintext mode if language provider unavailable. |

---

## Developer Experience

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **Composable architecture** | ✅ Implemented | Language providers are pluggable. Registry system (`registry.ts`) for adding languages. |
| **Worker-based parsing** | ❌ Not implemented | All tokenization on main thread. |
| **Virtualized rendering** | ✅ Implemented | Viewport-based rendering with visible line calculation. Only renders lines within viewport + buffer zone. |
| **Streaming model** | ❌ Not implemented | Full file loaded at once. |
| **Theming via CSS variables** | ✅ Implemented | Token colors mapped to CSS custom properties (`--token-keyword`, `--token-string`, etc.). |
| **API surface for embedding** | ⚠️ Partial | `FishEditor` component takes props (`filename`, `initialText`, `onTextChange`). No formal JS API. |
| **Event-based extension system** | ❌ Not implemented | No plugin hooks or event emitters. |

---

## AI & Advanced Features (Tier 5)

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **AI assistance** | ❌ Not implemented | No inline suggestions or AI integration. |
| **Markdown preview** | ❌ Not implemented | No live preview pane for Markdown. |
| **Diff & compare views** | ❌ Not implemented | No side-by-side diff UI. |
| **Inline diagnostics** | ❌ Not implemented | No error squiggles or gutter markers. |
| **Command line mode** | ❌ Not implemented | No Vim-style command bar. |

---

## Technical Implementation Details

### Core Architecture

- **Rendering**: Canvas-based with manual text measurement and pixel-perfect positioning
- **Text Model**: `TextDocument` class (`document.ts`) with position-based operations
- **State Management**: React Context API (`PieUIProvider`) with localStorage + IndexedDB persistence
- **Language System**: Registry pattern with built-in providers (`registry.ts`, `builtins/`)
- **Tokenization**: Line-by-line regex-based parsing with coverage tracking
- **Selection Model**: Single anchor + single caret (not true multi-cursor)

### Key Files

| File | Purpose |
|------|---------|
| `src/fish/FishEditor.tsx` | Main editor component with canvas rendering and event handling |
| `src/fish/core/document.ts` | `TextDocument` class for text operations |
| `src/fish/core/pairs.ts` | Auto-pairing logic (`autoPairDecision`) |
| `src/fish/core/history.ts` | `HistoryManager` class for undo/redo with operation batching |
| `src/fish/core/search.ts` | Search core module with text/regex search, match navigation, replace functions |
| `src/fish/core/folding.ts` | `FoldingManager` class and fold detection algorithms (brackets, functions, comments) |
| `src/fish/core/virtualization.ts` | Viewport calculation utilities for virtualized rendering (visible line range, scrollbar calculations) |
| `src/fish/core/wordwrap.ts` | Word wrap calculation utilities (line wrapping, visual row mapping) |
| `src/fish/hooks/useHistory.ts` | React hook for history management integration |
| `src/fish/hooks/useSearch.ts` | React hook for search state management |
| `src/fish/ui/FindReplaceDialog.tsx` | Find/Replace UI component with options and navigation |
| `src/fish/language/registry.ts` | Language provider registry and filename detection |
| `src/fish/language/builtins/` | Built-in language tokenizers (JS, HTML, CSS, etc.) |
| `src/fish/language/intellisense.ts` | IntelliSense utilities (completions, hover, filtering) |
| `src/pie/state/ui.tsx` | Global UI state (tabs, groups, dirty tracking, file operations) |
| `src/pie/ui/EditorTabs.tsx` | Tab bar rendering with dirty indicators |
| `src/pie/ui/Explorer.tsx` | File tree with dirty indicators |
| `src/__tests__/fish/core/history.test.ts` | Unit tests for history system (20+ test cases) |
| `src/__tests__/fish/core/search.test.ts` | Unit tests for search module (90+ test cases) |
| `src/__tests__/fish/core/folding.test.ts` | Unit tests for folding system (30+ test cases) |
| `src/__tests__/fish/core/virtualization.test.ts` | Unit tests for virtualized rendering (18 test cases) |

### Supported Languages

1. **JavaScript** (`javascript.ts`) - Keywords, strings, comments, template literals, methods, properties, numbers (hex/binary/octal/scientific)
2. **TypeScript** (`typescript.ts`) - Extends JavaScript with primitive types (`string`, `number`, `boolean`, etc.)
3. **HTML** (`html.ts`) - Tags, attributes, entities, comments
4. **CSS** (`css.ts`) - Selectors, properties, values with units, colors, keywords, functions
5. **SCSS** (`scss.ts`) - Extends CSS with variables (`$`), mixins (`@mixin`), control directives, interpolation
6. **Markdown** (`markdown.ts`) - Headings, links, images, code blocks, bold/italic, task lists
7. **Story** (`story.ts`) - Scene headers, character names, dialogue, screenplay format
8. **Plaintext** (`plaintext.ts`) - No tokenization fallback
9. **GPTP** (`adapters/gptp.ts`) - External adapter (optional)
10. **Narrative** (`adapters/narrative.ts`) - External adapter with storymode-core integration

---

## Priority Roadmap

### High Priority (Critical for MVP)
- ✅ Undo/redo stack
- ✅ Find/replace with regex
- ✅ Code folding
- ✅ Virtualized rendering for large files
- ✅ Word wrap toggle

### Medium Priority (Quality of Life)
- ❌ Multi-cursor editing
- ❌ Comment toggling
- ❌ Duplicate/move line commands
- ❌ Diff view (compare to saved)
- ❌ Minimap
- ❌ Auto-save

### Low Priority (Nice to Have)
- ❌ Screen reader accessibility
- ❌ Configurable keybindings UI
- ❌ Markdown preview
- ❌ AI assistance
- ❌ Live collaboration
- ❌ Full LSP/DAP protocol support

---

## Testing Coverage

| Area | Status | Notes |
|------|--------|-------|
| **TextDocument operations** | ✅ Tested | Unit tests in `document.test.ts` |
| **Auto-pairing logic** | ✅ Tested | Unit tests in `pairs.test.ts` |
| **History system** | ✅ Tested | Unit tests in `history.test.ts` (20+ test cases) |
| **Search module** | ✅ Tested | Unit tests in `search.test.ts` (90+ test cases) |
| **Folding system** | ✅ Tested | Unit tests in `folding.test.ts` (30+ test cases) |
| **Virtualization** | ✅ Tested | Unit tests in `virtualization.test.ts` (18 test cases) |
| **Word wrap** | ✅ Tested | Unit tests in `wordwrap.test.ts` (23 test cases) |
| **Tokenization** | ✅ Tested | Tests for builtins in `language/builtins.tokenize.test.ts` |
| **Hover/completion** | ✅ Tested | Tests in `hover-complete.test.ts` |
| **Language registry** | ✅ Tested | Tests in `registry.test.ts` |
| **UI components** | ⚠️ Partial | Explorer tests exist; tabs/editor untested |
| **Integration tests** | ❌ None | No end-to-end editor interaction tests |

---

## Known Limitations

1. **Performance**: Tokenization runs on main thread (could use Web Workers for extremely large files)
2. **Selection**: No block selection or multiple cursors
3. **Accessibility**: Canvas-based approach prevents screen reader usage
4. **Mobile**: Touch gestures limited; primarily desktop-optimized
5. **Collaboration**: Single-user only; no real-time sync
6. **Plugins**: No runtime extension system; languages must be built-in or statically imported

---

## Compliance Summary

### Fishpie Specification Alignment

**Core Requirements (Fish Editor)**
- ✅ Syntax highlighting for all supported languages
- ✅ Line numbers with dynamic gutter width
- ✅ Bracket/quote auto-pairing
- ✅ Selection and navigation via mouse/keyboard
- ✅ Clipboard operations (copy/cut/paste)
- ✅ Language-aware indentation
- ✅ IntelliSense (autocomplete + hover)
- ✅ Snippet expansion with tabstops
- ✅ Undo/redo with history stack
- ✅ Find/replace with regex support
- ✅ Code folding with gutter icons
- ✅ Virtualized rendering for large files
- ✅ Word wrap toggle (Alt+Z)

**Browser-Native Features**
- ✅ Runs entirely in browser (no backend required)
- ✅ File System Access API for local folders
- ✅ IndexedDB + localStorage persistence
- ✅ Lightweight performance (instant startup)
- ❌ PWA manifest configured but not tested
- ❌ Service worker not implemented

**IDE Integration (Pie)**
- ✅ Tab management with dirty indicators
- ✅ Split editor groups
- ✅ Command palette integration
- ✅ Theme system (light/dark)
- ✅ Status bar showing cursor position
- ❌ Gutter for breakpoints/errors not implemented
- ❌ Problems panel integration incomplete

---

*Last updated: Based on codebase analysis as of the current conversation.*
