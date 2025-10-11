# Fishpie Specification

Status: Draft
Last updated: 2025-10-11

## Overview

Fishpie is a lean, canvas-first editor and IDE shell composed of two layers:

- Fish: a native, canvas-based text editor core handling text model, input, and rendering.
- Pie: a modern IDE shell (layout, sidebars, panels, tabs, palette, status bar) around Fish.

The app is built with Next.js (App Router), React, and TypeScript. Styling uses Tailwind CSS v4 with SCSS. The codebase is ESM-only. Tests live strictly under `src/__tests__` and mirror the source structure.

## Goals

- Canvas-native editing using native input events (no DOM textareas synced to content).
- Modern, productive editor shell with a clean, minimal aesthetic.
- Extensible language layer with lightweight, optional adapters.
- Fast startup: keep dependencies small, avoid heavyweight editor frameworks.

## Non-goals

- Embedding CodeMirror, Monaco, or relying on hidden textareas as editing source of truth.
- Full LSP client implementation. We provide a minimal LSP-like API surface only.

## Core Constraints

- No CodeMirror/Monaco; no hidden textarea as model of truth.
- Canvas 2D rendering with DPR awareness and native `beforeinput`, `composition*`, and `keydown` handling.
- SVG icons only, preferably local components (no icon font packs).
- ESM-only. No CommonJS in the repository.
- Tailwind v4 with SCSS. PostCSS configured accordingly.
- Tests MUST reside under `src/__tests__` and mirror the source structure (e.g., `src/__tests__/fish/core/document.test.ts`).

## Architecture

### Fish (Editor Core)

- Text model: `TextDocument` implements text editing operations (insert, delete, replace, clamp).
  - Key API: `insertText`, `insertNewline`, `deleteBackward`, `deleteForward`, `replaceRange`, `deleteRange`, `clampPosition`, `toString`.
- Rendering: `FishEditor` is a React component that owns a `<canvas>` and paints content, tokens, caret, and selection.
  - DPR-aware sizing, consistent font metrics, simple line height.
  - Caret blink managed by a timer; repaint hooked to state changes.
- Input model: uses native events only.
  - `beforeinput`: authoritative for text insertion/deletion when available.
  - `compositionstart`/`compositionend`: IME support (overlay painting later).
  - `keydown`: arrows, navigation, selection expansion, home/end, tab; printable fallback when `beforeinput` isn’t firing.
- Language tokenization: `getOrLoadLanguage(id)` returns a provider; providers can be sync or async.

### Language Layer

- `LanguageProvider` interface
  - `id: string`, optional `tokenize(text)`, `complete(text, position)`, `hover(text, position)`.
- Registry and mapping
  - Built-ins: plaintext, markdown, html, css, javascript, typescript, story.
  - Optional adapters loaded on demand: `narrative`, `gptp`.
  - Filename → language id mapping via `languageForFilename(filename)`.
- Optional adapters
  - Narrative: soft import of `@yuxilabs/storymode-core` when present; falls back to regex tokenization.
  - GPTP: light JSON-like tokenization, trivial completion/hover.

### Minimal LSP-like API

- Route: `POST /api/lsp` with `{ action: 'complete'|'hover', language, text, position }`.
- Forwards to the matching `LanguageProvider` method; returns `{ items }` for complete or `{ hover }` for hover.

## Pie (IDE Shell)

- Layout and State
  - Global UI state persisted in `localStorage`:
    - `activeActivity: 'explorer'|'search'|'source'|'run'|'ext'`.
    - Sidebars/panel visibility: `showSidebar`, `showSecondarySidebar`, `showPanel`.
    - Activity bar side: `'left'|'right'`.
    - Panel position: `'bottom'|'right'`.
    - View locations: `{ explorer: 'primary'|'secondary', outline: 'primary'|'secondary' }`.
    - Editor groups: array of `{ id, openFiles, activeFile }` and `activeGroupId`.
  - Dynamic grid layout computes columns based on the above state.
  - Persistence keys: `ui.*` (e.g., `ui.groups`, `ui.panelPosition`).

- Primary Surface (Editors)
  - Editor groups (splits): multiple side-by-side groups, each with its own tabs and active file.
  - Tabs per group with close button, dirty indicator, and add `Untitled-N` action.
  - Breadcrumbs show project and current file path when active.
  - Empty state: if no file open, show a simple hint; no fake tabs.

- Sidebars and Panels
  - Activity Bar: left or right dock; buttons for Explorer, Search, Source, Run, Extensions, plus settings and toggle panel.
  - Primary Sidebar: typical “Explorer” and optionally “Outline”.
  - Secondary Sidebar: optional; can host Outline or Explorer depending on view location.
  - Bottom/Right Panel: dockable panel with tabs (Problems/Output/Terminal/Log), resizable.

- Command UI
  - Menu Bar: File/Edit/View/Go/Run/Terminal/Help.
    - View controls: toggle sidebars/panel, move activity bar and panel, move Outline, split editor right.
  - Command Palette: Ctrl+Shift+P overlay; includes common actions (toggle panel/sidebars, move panel, new untitled, split editor right).

- Icons
  - Local SVG icon set: folder, file, search, branch, play, puzzle, chevron-right, chevron-down, gear.

- Status Bar
  - Displays Ln/Col, EOL, encoding, language id.
  - Currently populated from UI state; to be wired to the active Fish editor.

## Layout Rules

- Grid columns are computed by slots in left→right order:
  - Activity bar (optional left), Primary sidebar (optional), Editor groups (always), Secondary sidebar (optional), Right panel (optional), Activity bar (optional right).
- Panel can be at bottom (within editor area rows) or docked right as its own grid column.
- Both sidebars are fixed width (e.g., 240px). Editor groups area expands (1fr each group).

## Persistence

- All UI layout and groups persist across reloads via `localStorage`.
- Keys used (prefix `ui.`): `activeActivity`, `showSidebar`, `showSecondarySidebar`, `showPanel`, `activityBarSide`, `panelPosition`, `viewLocations`, `groups`, `activeGroupId`.

## Testing

- Vitest + jsdom environment.
- Coverage via V8 provider.
- Tests live strictly under `src/__tests__/**` and mirror the source structure.
  - Example: `src/__tests__/fish/core/document.test.ts`.

## Theming and Styling

- Tailwind CSS v4 with SCSS pipeline.
- Token colors exposed as CSS variables (e.g., `--token-keyword`, `--token-string`).
- Light/dark mode via `prefers-color-scheme`.

## Accessibility and Performance Notes

- Keep interactive controls keyboard-accessible.
- Avoid expensive reflow in paint loops; compute tokenization asynchronously.
- DPR-aware canvas sizing to ensure crisp rendering.

## Future Work

- Wire Status Bar line/column and language id directly to Fish editor state.
- Command registry and keybindings loader (e.g., add a keyboard shortcut for “Split Editor Right”).
- Editor group management: close-empty-group behavior, drag-to-reorder groups, “Open to Side” from Explorer.
- Panel/tab persistence and transitions.
- Richer Outline view and view movement via drag handles.

---

This spec describes the direction implemented in the current codebase: persistent customizable layout, panel docking, secondary sidebar, command palette, local SVG icon system, and canvas-native editing.
