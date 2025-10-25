# Pie IDE - Feature Implementation Checklist

This document tracks the implementation status of features for the **Pie** IDE shell (the complete IDE interface that wraps the Fish editor). Features are organized by category and aligned with modern web-based IDE requirements.

---

## Core IDE Features

### Editor Integration

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **Fish editor embedding** | ✅ Implemented | Complete Fish editor integration. Fish handles all text editing, syntax highlighting, IntelliSense, auto-pairing, smart indentation. See `fish-editor-features.md`. |
| **Multiple editor instances** | ✅ Implemented | Split editor groups with independent tab sets via `splitEditorRight()`. Each group manages its own files. |
| **Editor activation** | ✅ Implemented | Click editor to activate group. Active group receives keyboard focus and displays blue active indicator on tabs. |
| **Synchronized state** | ✅ Implemented | File text changes propagate via `setFileText()` callback. Dirty state tracked globally across all groups. |

### Project Explorer

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **Tree view of files/folders** | ✅ Implemented | `Explorer.tsx` displays recursive file tree with expand/collapse. Uses File System Access API to read directory structure. |
| **Create operations** | ❌ Not implemented | No UI for creating new files/folders in existing directories. |
| **Rename operations** | ⚠️ Partial | Can rename active file via `renameActiveFile()` but no context menu UI in Explorer. |
| **Delete operations** | ❌ Not implemented | No file deletion functionality. |
| **Move/drag operations** | ❌ Not implemented | No drag-and-drop reordering or moving files between folders. |
| **File icons by type** | ✅ Implemented | SVG icons for JS, TS, HTML, CSS, SCSS, Markdown, Story, Narrative, GPTP, TXT files. |
| **Keyboard navigation** | ✅ Implemented | Arrow keys, Home/End, Enter/Space to navigate and open files. |

### Workspace Model

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **Open projects/folders** | ✅ Implemented | File System Access API with `showDirectoryPicker()`. Directory handle persisted in IndexedDB. |
| **Save operations** | ✅ Implemented | Manual save (Ctrl+S) writes to File System handle. Save All iterates through open files. |
| **Persistent session state** | ✅ Implemented | `localStorage`: editor groups, tabs, dirty files, panel positions, sidebar visibility. `IndexedDB`: file texts, directory handle. |
| **Workspace recovery** | ✅ Implemented | Re-opens last folder on reload if File System permission persists. |
| **Project templates** | ❌ Not implemented | No "New Project" wizard or scaffolding. |

---

## Terminal & Runtime

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **Integrated terminal** | ⚠️ Placeholder | `BottomPanel` has Terminal tab but shows "No output yet". No WebSocket or container integration. |
| **Web runtime bridge** | ❌ Not implemented | No remote container or VM connection. |
| **WASM sandbox runtime** | ❌ Not implemented | No local WASM-based Python/JS execution. |
| **Container orchestration** | ❌ Not implemented | No Docker/Kubernetes integration. |
| **Port forwarding** | ❌ Not implemented | No localhost preview capability. |
| **Process management** | ❌ Not implemented | No task start/stop/restart UI. |
| **Environment variables** | ❌ Not implemented | No `.env` editor or manager. |
| **Resource limits** | ❌ Not implemented | No CPU/memory quotas. |

---

## Output & Diagnostics

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **Output panel** | ⚠️ Placeholder | `BottomPanel` exists with Output tab but shows placeholder text. |
| **Problems/errors panel** | ⚠️ Placeholder | Problems tab exists but not connected to diagnostics system. |
| **Log panel** | ⚠️ Placeholder | Log tab exists but no log capture. |
| **Build output** | ❌ Not implemented | No task runner integration to capture build logs. |
| **Real-time diagnostics** | ❌ Not implemented | No LSP diagnostics displayed in-line or in Problems panel. |

---

## Command System

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **Command palette** | ✅ Implemented | Ctrl+Shift+P opens searchable overlay with 10+ commands. Includes view toggles, editor splits, file operations. |
| **Menu bar** | ✅ Implemented | File/Edit/View/Go/Run/Terminal/Help menus with dropdowns. |
| **Keyboard shortcuts** | ⚠️ Partial | Hardcoded shortcuts: Ctrl+S (save), Ctrl+T (new tab), Ctrl+Shift+P (palette). No remapping UI. |
| **Recent commands** | ❌ Not implemented | No command history or MRU list. |

---

## Layout & Panel Management

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **Tabs & layout manager** | ✅ Implemented | Editor groups with independent tab rows. Tabs show filename, dirty indicator (blue circle), close button (SVG). |
| **Dockable panels** | ⚠️ Partial | Bottom panel is dockable (bottom or right position). Cannot dock to left or detach panels. |
| **Resizable panes** | ⚠️ Partial | Bottom panel is vertically resizable via drag handle. Sidebars are fixed width (240px). |
| **Multi-window splits** | ✅ Implemented | Split Editor Right creates side-by-side groups. Each group has independent tabs and active file. |
| **Panel system** | ✅ Implemented | Terminal, Problems, Output, Log tabs in bottom panel. Explorer, Outline in sidebars. |
| **Save/restore layouts** | ❌ Not implemented | No named layout presets or quick switching. |
| **Drag-and-drop reordering** | ❌ Not implemented | Cannot reorder tabs within group or move tabs between groups. |

---

## Language Features (from Fish Editor)

> **Note**: All language intelligence (IntelliSense, syntax highlighting, completions, hover) is provided by the **Fish editor core**, not Pie. See `fish-editor-features.md` section "Language Awareness & IntelliSense" for complete documentation.

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **Syntax highlighting** | ✅ Fish feature | Token-based coloring for JS, TS, HTML, CSS, SCSS, Markdown, Story. Provided by Fish editor. |
| **IntelliSense** | ✅ Fish feature | Context-aware completions and hover. 200+ items across all languages. Built into Fish editor. |
| **Auto-pairing** | ✅ Fish feature | Brackets, quotes, and tags auto-close. Part of Fish editing features. |
| **Smart indentation** | ✅ Fish feature | Auto-indent on Enter, respects file's tab/space style. Fish editor behavior. |

---

## IDE Integration Features

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **LSP UI integration** | ❌ Not implemented | No Problems panel connection to diagnostics. No gutter markers for errors. |
| **Go-to-definition UI** | ❌ Not implemented | No jump-to-definition navigation between files. |
| **Find all references UI** | ❌ Not implemented | No reference finder across workspace. |
| **Rename symbol UI** | ❌ Not implemented | No workspace-wide refactoring UI. |
| **Code actions UI** | ❌ Not implemented | No quick fix suggestions in gutter. |
| **Linting integration** | ❌ Not implemented | No ESLint/TSLint integration with Problems panel. |

---

## Debug Adapter Protocol (DAP)

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **DAP UI** | ❌ Not implemented | No debugger UI or breakpoint management. |
| **Breakpoints panel** | ❌ Not implemented | No breakpoint list or gutter UI. |
| **Call stack viewer** | ❌ Not implemented | No execution state panel. |
| **Variable inspector** | ❌ Not implemented | No watch variables panel. |
| **Debug console** | ❌ Not implemented | No debug REPL or console. |
| **Performance profiling** | ❌ Not implemented | No CPU/memory profiling UI. |
| **Logging hooks** | ❌ Not implemented | No stdout/stderr capture in Output panel. |

---

## Task Runner & Build Integration

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **Task runner** | ❌ Not implemented | No build/test/serve script execution. |
| **Task output** | ❌ Not implemented | No task output in Output panel. |
| **Task management UI** | ❌ Not implemented | No task list or quick picker. |
| **Build automation** | ❌ Not implemented | No automatic builds on save. |
| **Test integration** | ❌ Not implemented | No test runner or inline test results. |
| **Dependency graph** | ❌ Not implemented | No visualization of project dependencies. |
| **Symbol indexing** | ❌ Not implemented | No workspace-wide symbol search. |

---

## Collaboration & Sharing

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **Live collaboration** | ❌ Not implemented | No real-time multi-user editing. |
| **Shared workspaces** | ❌ Not implemented | No team collaboration or invite links. |
| **Git integration** | ❌ Not implemented | No clone/push/pull/commit UI. Activity bar shows "Version Control" icon but it's a placeholder. |
| **Pull request UI** | ❌ Not implemented | No PR review or conflict resolution. |
| **Cloud storage sync** | ❌ Not implemented | No GitHub/GitLab/Dropbox integration. |
| **Session sharing** | ❌ Not implemented | No shareable view-only or co-editing URLs. |
| **AI assistance** | ❌ Not implemented | No AI code completion or generation. |

---

## UI & UX

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **Activity bar** | ✅ Implemented | Left or right dock with Explorer, Search, Version Control, Terminal, Extensions icons. Movable via View menu. |
| **Primary sidebar** | ✅ Implemented | Displays Explorer or Outline. Toggleable with show/hide. |
| **Secondary sidebar** | ✅ Implemented | Optional sidebar on opposite side. Can swap Explorer/Outline between primary and secondary. |
| **Status bar** | ✅ Implemented | Shows cursor position (line:col), language mode, EOL, encoding. Persists across files. |
| **Breadcrumbs** | ✅ Implemented | Shows folder path + filename when file is active. Hierarchical navigation with chevrons. |
| **Command center** | ✅ Implemented | Command Palette (Ctrl+Shift+P) is the universal command entry point. |
| **Notifications & tasks** | ❌ Not implemented | No toast notifications or async task queue. |
| **Workspace layouts** | ⚠️ Partial | Layout persists (groups, panels, sidebars) but no named presets or quick switcher. |
| **Theme & customization** | ✅ Implemented | Light/dark themes via CSS variables. Token colors customizable via `--token-*` CSS vars. No theme marketplace. |
| **Accessibility** | ⚠️ Partial | Keyboard navigation works. No ARIA labels on canvas editor. Status bar is accessible. |
| **Mobile bottom nav** | ✅ Implemented | Activity bar substituted with bottom floating nav on mobile (< 640px). |

---

## Extension System

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **Extension API** | ❌ Not implemented | No plugin model. Language providers are directly imported, not dynamically loaded. |
| **Extension marketplace** | ❌ Not implemented | No registry or install UI. |
| **Sandboxed extensions** | ❌ Not implemented | No Web Worker isolation for plugins. |
| **Settings sync** | ⚠️ Partial | Settings persisted in `localStorage` but no cloud sync. |
| **Event bus** | ❌ Not implemented | No pub/sub for inter-component communication. State is via React Context. |
| **Theming API** | ⚠️ Partial | CSS variables expose colors but no JSON theme schema or contribution points. |

---

## CI/CD & Deployment

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **CI/CD integrations** | ❌ Not implemented | No GitHub Actions, Jenkins, or pipeline triggers. |
| **Preview deployments** | ❌ Not implemented | No "Deploy to Vercel/Netlify" buttons. |
| **Logs & monitoring** | ❌ Not implemented | No remote log tailing. |
| **Secrets management** | ❌ Not implemented | No secure credential storage. |
| **Package registry integration** | ❌ Not implemented | No npm/PyPI/Maven search from IDE. |

---

## Performance & Architecture

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **Client–server separation** | ⚠️ Partial | Frontend (React/Next.js) + minimal backend (`/api/lsp` route). No full backend service. |
| **Worker-based processing** | ❌ Not implemented | Tokenization runs on main thread. No Web Workers for LSP or linting. |
| **Virtualized rendering** | ⚠️ Partial | Fish editor renders all lines; no viewport culling. Tabs render all at once. |
| **State persistence** | ✅ Implemented | IndexedDB for file texts and directory handle. `localStorage` for UI state. |
| **Offline-first mode** | ✅ Implemented | Works entirely offline after initial load. No network calls except optional LSP. |
| **Security sandboxing** | ⚠️ Partial | CSP headers via Next.js. File System Access API permission-scoped. No iframe sandboxing for extensions. |
| **Telemetry & metrics** | ❌ Not implemented | No crash reporting or analytics. |

---

## Future-Forward Features

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **AI code agent** | ❌ Not implemented | No conversational assistant or AI refactoring. |
| **Visual pipeline view** | ❌ Not implemented | No drag-and-drop workflow builder. |
| **Diagramming tools** | ❌ Not implemented | No auto-generated architecture diagrams. |
| **Project templates** | ❌ Not implemented | No "New Project" wizard with framework scaffolding. |
| **Extensionless mode** | ⚠️ Partial | Boots quickly with minimal defaults. No lazy extension loading (no extensions exist). |
| **Theming API for brands** | ⚠️ Partial | CSS variables allow custom branding. No white-label deployment system. |

---

## Technical Implementation Details

### Core Architecture

- **Framework**: Next.js 14+ with App Router, Turbopack for fast refresh
- **State Management**: React Context API (`PieUIProvider`) with `localStorage` + IndexedDB persistence
- **Layout System**: CSS Grid with dynamic column computation based on sidebar/panel visibility
- **File System**: File System Access API for native folder access, IndexedDB for caching
- **Routing**: Minimal routing (`/workspace/[id]` for projects, `/` for landing)
- **Icons**: Custom SVG icons via `Icon` component (Lucide-inspired)

### Key Files

| File | Purpose |
|------|---------|
| `src/pie/state/ui.tsx` | Global UI state (groups, panels, sidebars, file operations) |
| `src/pie/layout/PieLayout.tsx` | Main layout wrapper with grid system |
| `src/pie/ui/ActivityBar.tsx` | Left/right activity bar with Explorer/Search/Git/Terminal/Extensions |
| `src/pie/ui/Explorer.tsx` | File tree with expand/collapse, keyboard navigation, dirty indicators |
| `src/pie/ui/EditorTabs.tsx` | Tab bar per editor group with dirty indicators, close buttons |
| `src/pie/ui/MenuBar.tsx` | File/Edit/View/Go/Run/Terminal/Help menus |
| `src/pie/ui/CommandPalette.tsx` | Ctrl+Shift+P overlay with searchable commands |
| `src/pie/ui/StatusBar.tsx` | Bottom status bar with cursor position, language, EOL, encoding |
| `src/pie/ui/BottomPanel.tsx` | Bottom/right panel with Problems/Output/Terminal/Log tabs (placeholders) |
| `src/pie/ui/Toolbar.tsx` | Top toolbar with split editor, panel toggle, secondary sidebar buttons |
| `src/pie/ui/Welcome.tsx` | Empty state screen with quick actions |
| `src/pie/ui/AboutDialog.tsx` | Draggable About dialog with version info |
| `src/pie/utils/idb.ts` | IndexedDB helpers for File System handles and file texts |

### State Persistence

| Storage | Keys | Data |
|---------|------|------|
| **localStorage** | `ui.groups`, `ui.activeGroupId` | Editor groups with open files and active file |
| | `ui.showSidebar`, `ui.showSecondarySidebar`, `ui.showPanel` | Panel visibility toggles |
| | `ui.activityBarSide`, `ui.panelPosition` | Layout positions (left/right, bottom/right) |
| | `ui.viewLocations` | Where Explorer/Outline are docked (primary/secondary) |
| | `ui.activeActivity` | Current activity (explorer/search/source/run/ext) |
| | `ui.hasFolder`, `ui.rootName`, `ui.fileTree` | Current workspace folder state |
| **IndexedDB** | `lastDirHandle` | File System Directory Handle for persistence |
| | `fileTexts` | Map of filename → content for unsaved changes |

### UI Layout Grid

The layout uses CSS Grid with dynamic column computation:

```
┌─────────────┬──────────┬─────────────┬─────────────┬──────────┬─────────────┐
│ Activity    │ Primary  │   Editor    │ Secondary   │  Panel   │ Activity    │
│ Bar (left)  │ Sidebar  │   Groups    │  Sidebar    │ (right)  │ Bar (right) │
│             │          │             │             │          │             │
│ ┌─────────┐ │          │             │             │          │ ┌─────────┐ │
│ │Explorer │ │          │ ┌─────────┐ │             │          │ │Settings │ │
│ │Search   │ │          │ │Tab Row  │ │             │          │ │         │ │
│ │Git      │ │          │ ├─────────┤ │             │          │ │         │ │
│ │Terminal │ │          │ │Bread-   │ │             │          │ │         │ │
│ │Ext      │ │          │ │crumbs   │ │             │          │ │         │ │
│ └─────────┘ │          │ ├─────────┤ │             │          │ └─────────┘ │
│             │          │ │         │ │             │          │             │
│             │          │ │ Editor  │ │             │          │             │
│             │          │ │         │ │             │          │             │
└─────────────┴──────────┴─────────────┴─────────────┴──────────┴─────────────┘
                         └─────────────┘
                           Bottom Panel
```

Columns are computed dynamically:
- **Activity Bar**: `auto` (fixed 48px width)
- **Primary/Secondary Sidebars**: `240px` (fixed)
- **Editor Groups**: `1fr` (expands to fill)
- **Right Panel**: `auto` (resizable)

Rows:
1. **Toolbar** (spans all columns)
2. **Content** (activity bar + sidebars + editor + panels)
3. **Status Bar** (spans all columns)

---

## Supported Activities

| Activity | Icon | Purpose | Status |
|----------|------|---------|--------|
| **Explorer** | `file-tree` | Browse files and folders | ✅ Fully implemented |
| **Search** | `search` | Workspace-wide search | ❌ Placeholder only |
| **Version Control** | `git` | Git operations | ❌ Placeholder only |
| **Terminal** | `terminal` | Integrated terminal | ⚠️ Panel exists, no shell |
| **Extensions** | `blocks` | Manage extensions | ❌ Placeholder only |

---

## Keyboard Shortcuts

### Global

| Shortcut | Action | Status |
|----------|--------|--------|
| `Ctrl+T` / `Cmd+T` | New tab | ✅ Implemented |
| `Ctrl+S` / `Cmd+S` | Save | ✅ Implemented |
| `Ctrl+Shift+P` / `Cmd+Shift+P` | Command Palette | ✅ Implemented |
| `Ctrl+Shift+S` / `Cmd+Shift+S` | Save All | ✅ Implemented |
| `Ctrl+W` / `Cmd+W` | Close tab | ❌ Not implemented |
| `Ctrl+,` / `Cmd+,` | Settings | ❌ Not implemented |

### Editor (within Fish)

| Shortcut | Action | Status |
|----------|--------|--------|
| `Ctrl+Space` / `Cmd+Space` | Trigger completion | ✅ Implemented |
| `Ctrl+C/V/X` / `Cmd+C/V/X` | Copy/Paste/Cut | ✅ Implemented |
| `Tab` | Indent | ✅ Implemented |
| `Shift+Tab` | Dedent (snippet navigation) | ✅ Implemented |
| `Ctrl+/` / `Cmd+/` | Toggle comment | ❌ Not implemented |
| `Ctrl+D` / `Cmd+D` | Duplicate line | ❌ Not implemented |

### Explorer

| Shortcut | Action | Status |
|----------|--------|--------|
| `Arrow keys` | Navigate tree | ✅ Implemented |
| `Enter` / `Space` | Open file or toggle folder | ✅ Implemented |
| `Home` / `End` | Jump to first/last item | ✅ Implemented |

---

## Mobile Support

| Feature | Status | Implementation Notes |
|---------|--------|---------------------|
| **Responsive layout** | ✅ Implemented | Grid layout collapses on small screens (< 640px). |
| **Mobile bottom nav** | ✅ Implemented | Activity bar replaced with floating bottom nav on mobile. |
| **Touch scrolling** | ✅ Implemented | All panels and editor support touch scroll. |
| **Touch file operations** | ✅ Implemented | Tap to open files, double-tap folders to expand. |
| **Virtual keyboard** | ⚠️ Partial | Works but may obscure editor content. No keyboard-aware layout adjustments. |
| **Gesture support** | ❌ Not implemented | No swipe gestures for navigation or panel toggles. |

---

## Testing Coverage

| Area | Status | Notes |
|------|--------|-------|
| **Explorer component** | ✅ Tested | Unit tests in `Explorer.test.tsx` verify file tree rendering and operations. |
| **UI state management** | ⚠️ Partial | Mock `UIState` in tests but no comprehensive state transition tests. |
| **Layout rendering** | ❌ Untested | No tests for PieLayout, grid computation, or panel resizing. |
| **Command palette** | ❌ Untested | No tests for command execution or filtering. |
| **Integration tests** | ❌ None | No end-to-end tests for workflow (open folder → edit → save). |

---

## Known Limitations

1. **No true file operations**: Can't create/delete/move files via UI; only open existing files from folders
2. **Limited LSP**: Only TypeScript/JavaScript completions + hover. No linting, refactoring, or diagnostics
3. **No terminal**: Terminal panel is a placeholder; no shell execution or WebSocket connection
4. **No Git integration**: Version Control activity is placeholder; no commit/push/pull UI
5. **No debugging**: No breakpoints, call stack, or variable inspection
6. **No extensions**: Language providers are hardcoded; no dynamic plugin loading
7. **Fixed sidebar widths**: Sidebars are 240px fixed; not user-resizable
8. **No drag-and-drop**: Can't reorder tabs or move files in Explorer
9. **No search**: Search activity is placeholder; no find-in-files functionality
10. **Canvas accessibility**: Editor is canvas-based; no screen reader support for code content

---

## Compliance Summary

### Web-Native IDE Requirements

**Core IDE Features** ✅
- ✅ Editor integration (Fish editor fully embedded)
- ✅ Project explorer (file tree with File System Access API)
- ✅ Workspace model (open/save folders, persistent state)
- ⚠️ Integrated terminal (UI exists, no runtime)

**Layout & Panels** ✅
- ✅ Tabs & layout manager (multiple groups, splits)
- ✅ Dockable panels (bottom/right positioning)
- ⚠️ Resizable panes (bottom panel only, sidebars fixed)
- ✅ Command system (palette + menu bar)

**Language Support** ⚠️
- ⚠️ LSP support (TypeScript only, partial features)
- ❌ DAP support (no debugging)
- ❌ Syntax trees (regex tokenization only)
- ❌ Task runner (no build/test execution)

**Collaboration** ❌
- ❌ Live collaboration
- ❌ Git integration
- ❌ Session sharing
- ❌ AI assistance

**Performance** ✅
- ✅ Offline-first (works without network)
- ✅ State persistence (IndexedDB + localStorage)
- ⚠️ Virtualized rendering (editor only, not implemented for large files)
- ❌ Worker-based processing (main thread only)

**Extension System** ❌
- ❌ Extension API
- ❌ Marketplace
- ❌ Sandboxed plugins
- ⚠️ Settings sync (local only)

---

## Priority Roadmap

### High Priority (Essential for Production)
- ❌ File operations (create/rename/delete/move in Explorer)
- ❌ Workspace-wide search (find in files)
- ❌ Git integration basics (status, commit, push/pull)
- ❌ Terminal integration (WebSocket shell or WASM runtime)
- ❌ LSP diagnostics (inline errors/warnings)
- ❌ Settings UI (preferences editor)

### Medium Priority (Quality of Life)
- ❌ Drag-and-drop (reorder tabs, move files)
- ❌ Resizable sidebars (currently fixed 240px)
- ❌ Task runner (npm scripts, custom commands)
- ❌ Keyboard shortcut customization
- ❌ Theme marketplace or user themes
- ❌ Extension API and marketplace

### Low Priority (Nice to Have)
- ❌ Live collaboration
- ❌ AI code assistance
- ❌ Debugging (DAP integration)
- ❌ Visual pipeline builder
- ❌ Auto-generated diagrams
- ❌ CI/CD integrations

---

## Future Enhancements

### Immediate Next Steps
1. **File operations context menu**: Right-click in Explorer for create/rename/delete
2. **Workspace search**: Ctrl+Shift+F for find-in-files across project
3. **Basic Git UI**: Status, stage, commit, push/pull for local repos
4. **Terminal backend**: WebSocket connection to Node.js shell or WASM runtime
5. **LSP diagnostics**: Display TypeScript errors in Problems panel and editor gutter

### Medium-Term Goals
1. **Extension system**: Plugin API with sandboxed Web Workers
2. **Task automation**: Run npm scripts, detect and execute tasks from package.json
3. **Settings editor**: GUI for configuring themes, keybindings, editor preferences
4. **Improved LSP**: Multi-language support (Python, Go, Rust) via remote LSP servers
5. **Drag-and-drop everywhere**: Tabs, Explorer files, panels

### Long-Term Vision
1. **Collaborative editing**: Operational Transform or CRDT-based real-time co-editing
2. **Cloud backend**: Optional cloud storage for settings and workspace sync
3. **AI integration**: Code completion, generation, and refactoring via LLM API
4. **Debugging suite**: Full DAP implementation with breakpoints and inspection
5. **Mobile-first**: Gesture-based UI, adaptive keyboard, portrait/landscape layouts

---

*Last updated: Based on codebase analysis as of the current conversation.*
