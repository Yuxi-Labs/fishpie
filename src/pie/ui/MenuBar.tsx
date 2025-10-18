"use client";
import React, { useEffect, useRef, useState } from "react";
import { usePieUI } from "@/pie/state/ui";

type MenuItem =
  | { type: "item"; label: string; onSelect?: () => void; disabled?: boolean }
  | { type: "separator" }
  | { type: "submenu"; label: string; items: MenuItem[] };

type TopMenu = { label: string; items: MenuItem[] };

function useClickOutside<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  return ref;
}

function MenuPopup({ items, onClose }: { items: MenuItem[]; onClose: () => void }) {
  return (
    <div className="min-w-48 py-1 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black shadow-lg text-xs">
      {items.map((it, idx) => {
        if (it.type === "separator") return <div key={idx} className="my-1 border-t border-black/10 dark:border-white/10" />;
        if (it.type === "submenu") {
          return (
            <div key={idx} className="px-2 py-1 opacity-70">{it.label}</div>
          );
        }
        return (
          <button
            key={idx}
            className={`w-full text-left px-3 py-1 hover:bg-black/5 dark:hover:bg-white/10 ${it.disabled ? 'opacity-50 cursor-default hover:bg-transparent' : ''}`}
            disabled={it.disabled}
            onClick={() => { it.onSelect?.(); onClose(); }}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

export function MenuBar() {
  const ui = usePieUI();
  const [open, setOpen] = useState<string | null>(null);
  const ref = useClickOutside<HTMLDivElement>(!!open, () => setOpen(null));

  const fileMenu: TopMenu = {
    label: "File",
    items: [
      { type: "item", label: "Open Folder…", onSelect: () => ui.openFolder() },
      { type: "item", label: "Close Folder", onSelect: () => ui.closeFolder(), disabled: !ui.hasFolder },
      { type: "separator" },
      { type: "item", label: "New Tab", onSelect: () => ui.newTab() },
      { type: "item", label: "New File", onSelect: () => ui.openFile("Untitled-1") },
      { type: "item", label: "Save", onSelect: () => ui.activeFile && ui.markDirty(ui.activeFile, false), disabled: !ui.activeFile },
      { type: "item", label: "Save All", onSelect: () => ui.openFiles.forEach(f => ui.markDirty(f.name, false)), disabled: ui.openFiles.length === 0 },
      { type: "item", label: "Close Editor", onSelect: () => ui.activeFile && ui.closeFile(ui.activeFile), disabled: !ui.activeFile },
    ],
  };

  const editMenu: TopMenu = {
    label: "Edit",
    items: [
      { type: "item", label: "Undo", onSelect: () => {} },
      { type: "item", label: "Redo", onSelect: () => {} },
    ],
  };

  const viewMenu: TopMenu = {
    label: "View",
    items: [
      { type: "item", label: (ui.showSidebar ? "Hide" : "Show") + " Side Bar", onSelect: () => ui.toggleSidebar() },
      { type: "item", label: (ui.showSecondarySidebar ? "Hide" : "Show") + " Secondary Side Bar", onSelect: () => ui.toggleSecondarySidebar() },
      { type: "separator" },
      { type: "item", label: `Activity Bar on ${ui.activityBarSide === 'left' ? 'Right' : 'Left'}`, onSelect: () => ui.setActivityBarSide(ui.activityBarSide === 'left' ? 'right' : 'left') },
      { type: "separator" },
      { type: "item", label: `Panel on ${ui.panelPosition === 'bottom' ? 'Right' : 'Bottom'}`, onSelect: () => ui.setPanelPosition(ui.panelPosition === 'bottom' ? 'right' : 'bottom') },
      { type: "item", label: (ui.showPanel ? "Hide" : "Show") + " Panel", onSelect: () => ui.togglePanel() },
  { type: "separator" },
      { type: "item", label: `Move Outline to ${ui.viewLocations.outline === 'primary' ? 'Secondary' : 'Primary'} Sidebar`, onSelect: () => ui.setViewLocation('outline', ui.viewLocations.outline === 'primary' ? 'secondary' : 'primary') },
    ],
  };

  const goMenu: TopMenu = { label: "Go", items: [ { type: "item", label: "Back", onSelect: () => {} }, { type: "item", label: "Forward", onSelect: () => {} } ] };
  const runMenu: TopMenu = { label: "Run", items: [ { type: "item", label: "Start Debugging", onSelect: () => {} } ] };
  const termMenu: TopMenu = { label: "Terminal", items: [ { type: "item", label: "New Terminal", onSelect: () => {} } ] };
  const helpMenu: TopMenu = { label: "Help", items: [ { type: "item", label: "About", onSelect: () => ui.openAbout() } ] };

  const menus: TopMenu[] = [fileMenu, editMenu, viewMenu, goMenu, runMenu, termMenu, helpMenu];

  return (
    <div ref={ref} className="flex items-center gap-2 pr-2 pl-0 text-xs select-none">
      {/* Global shortcut: Ctrl+T/Cmd+T => New Tab */}
      <ShortcutNewTab onNewTab={() => ui.newTab()} />
  {menus.map((m) => (
        <div key={m.label} className="relative">
          <button
            className={`px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10 ${open === m.label ? 'bg-black/5 dark:bg-white/10' : ''}`}
            onClick={() => setOpen(prev => (prev === m.label ? null : m.label))}
            aria-haspopup="menu"
            aria-expanded={open === m.label}
          >
            {m.label}
          </button>
          {open === m.label && (
            <div className="absolute left-0 mt-1 z-50">
              <MenuPopup items={m.items} onClose={() => setOpen(null)} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default MenuBar;

function ShortcutNewTab({ onNewTab }: { onNewTab: () => void }) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.includes('Mac');
      if ((isMac ? e.metaKey : e.ctrlKey) && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        onNewTab();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNewTab]);
  return null;
}
