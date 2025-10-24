# UI Tabs Spec

Status: Draft (v1)
Owner: UI/Editor
Last updated: 2025-10-25

## Purpose

Define the required behavior and UX for editor tabs so they are always visible and clearly show the open file(s) in the tab row.

## Requirements

1) Tabs row visibility
- The tabs row must be rendered at the top of each editor group at all times (even when no files are open).
- When a file is opened, its tab must immediately appear in the row.

2) Opening files
- Clicking a file in the Explorer opens that file in the active editor group and makes it the active tab.
- Double‑clicking a file in the Explorer also opens/activates it (for users who expect double‑click to open).
- Opening a file that’s already open in the group activates its existing tab instead of creating a duplicate.

3) Active/hover/selected visuals
- Active tab has a clearly visible background highlight.
- Hovered tab has a subtle but noticeable hover background.
- Tab label text has sufficient contrast against the background to be readable in both light and dark themes.

4) Close behavior
- Each tab has a close button. Clicking it closes the file for that group.
- If the last remaining tab is closed and there are multiple editor groups, the now-empty group may be removed; otherwise the group remains with an empty tabs row.

5) Breadcrumbs
- Breadcrumbs are shown only when there is an active file; they hide when no file is active.

6) Keyboard/mouse interactions
- Single-click a tab to activate it.
- Double-click in the empty area of the tabs row creates a new untitled tab (optional convenience; not required for discoverability).

7) Persistence
- Open files and the active file per group are persisted in localStorage so the workspace can be restored on reload.

## Non-requirements

- A visible "+ New Tab" button in the tabs row is not required. Tab creation is possible via menu/command and double-click empty area.

## Acceptance criteria

- Given an open folder, when the user clicks a file in Explorer, then a tab with that file name appears immediately in the editor’s tab row and becomes active.
- When a second file is clicked, a second tab appears to the right; switching between tabs updates the active state and breadcrumbs.
- Closing the active tab activates the next available tab (or empties the group if none remain), keeping the tabs row visible.
- Visuals: Active tab background is clearly differentiated; hover is visible; text is readable in light/dark themes.

## Implementation notes (current state)

- Explorer opens and activates files via `Explorer.tsx` onClick handlers calling `ui.openFile(path)` then `ui.activateFile(path)`.
- Tabs are rendered by `src/pie/ui/EditorTabs.tsx` and are always mounted; they render zero or more tab items based on group `openFiles`.
- Layout always includes the tabs row: `src/pie/layout/PieLayout.tsx` renders `<EditorTabs />` unconditionally for each group.
- Visuals: Tab bar background and active/hover states use blue shades for clarity in both themes.

## Traceability

- Requirement 1 → `PieLayout.tsx` (tabs row always present), `EditorTabs.tsx` (render row even when empty)
- Requirement 2 → `Explorer.tsx` (open+activate), `ui.tsx` (openFile/activateFile state)
- Requirement 3 → `EditorTabs.tsx` (class names for active/hover/label contrast)
- Requirement 4 → `EditorTabs.tsx` (close button), `ui.tsx` (closeFile logic including group removal)
- Requirement 5 → `PieLayout.tsx` (breadcrumbs only when active file)
- Requirement 6 → `EditorTabs.tsx` (double-click empty area → newTab)
- Requirement 7 → `ui.tsx` (persist groups and activeGroupId in localStorage)

## Future enhancements

- Drag-and-drop reordering of tabs within a group.
- Move tab to another group via context menu.
- Overflow handling (scroll shadows, context menu for hidden tabs).
