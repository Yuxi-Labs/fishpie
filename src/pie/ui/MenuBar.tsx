"use client";
import React, { useEffect, useRef, useState } from "react";
import { usePieUI } from "@/pie/state/ui";

type MenuItem =
  | { type: "item"; label: string; shortcut?: string; onSelect?: () => void; disabled?: boolean; icon?: React.ReactNode }
  | { type: "separator" }
  | { type: "header"; label: string }
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
    <div className="min-w-[240px] py-1.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-xl shadow-2xl text-[13px] overflow-hidden">
      {items.map((it, idx) => {
        if (it.type === "separator") {
          return <div key={idx} className="my-1.5 mx-2 border-t border-black/[0.06] dark:border-white/[0.06]" />;
        }
        if (it.type === "header") {
          return (
            <div 
              key={idx} 
              className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-black/40 dark:text-white/40 mt-2 first:mt-0"
            >
              {it.label}
            </div>
          );
        }
        if (it.type === "submenu") {
          return (
            <div 
              key={idx} 
              className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-black/40 dark:text-white/40 mt-2 first:mt-0"
            >
              {it.label}
            </div>
          );
        }
        // it.type === "item"
        return (
          <button
            key={idx}
            className={`
              w-full flex items-center justify-between gap-4 px-3 py-2 text-left
              transition-all duration-150 ease-out
              ${it.disabled 
                ? 'opacity-40 cursor-not-allowed' 
                : 'hover:bg-blue-500/10 dark:hover:bg-blue-400/10 hover:text-blue-600 dark:hover:text-blue-400 active:scale-[0.98]'
              }
            `}
            disabled={it.disabled}
            onClick={() => { 
              if (!it.disabled) {
                it.onSelect?.(); 
                onClose(); 
              }
            }}
          >
            <span className="flex items-center gap-2.5">
              {it.icon && <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center opacity-70">{it.icon}</span>}
              <span className="font-medium">{it.label}</span>
            </span>
            {it.shortcut && (
              <span className="text-[11px] font-mono text-black/40 dark:text-white/40 tracking-tight">
                {it.shortcut}
              </span>
            )}
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
      { 
        type: "item", 
        label: "New File", 
        shortcut: "Ctrl+N",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
        onSelect: () => ui.newTab()
      },
      { 
        type: "item", 
        label: "Open File…", 
        shortcut: "Ctrl+O",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
        onSelect: () => {},
        disabled: true
      },
      { 
        type: "item", 
        label: "Open Folder…", 
        shortcut: "Ctrl+K Ctrl+O",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
        onSelect: () => ui.openFolder()
      },
      { type: "separator" },
      { 
        type: "item", 
        label: "Save", 
        shortcut: "Ctrl+S",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
        onSelect: () => {
          if (ui.activeFile) {
            const text = ui.getFileText(ui.activeFile);
            if (text !== undefined) {
              ui.updateOriginalText(ui.activeFile, text);
            }
          }
        }, 
        disabled: !ui.activeFile 
      },
      { 
        type: "item", 
        label: "Save As…", 
        shortcut: "Ctrl+Shift+S",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
        onSelect: () => {},
        disabled: true
      },
      { 
        type: "item", 
        label: "Save All", 
        shortcut: "Ctrl+K S",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
        onSelect: () => {
          ui.openFiles.forEach(f => {
            const text = ui.getFileText(f.name);
            if (text !== undefined) {
              ui.updateOriginalText(f.name, text);
            }
          });
        }, 
        disabled: ui.openFiles.length === 0 
      },
      { type: "separator" },
      { 
        type: "item", 
        label: "Close Editor", 
        shortcut: "Ctrl+W",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
        onSelect: () => ui.activeFile && ui.closeFile(ui.activeFile), 
        disabled: !ui.activeFile 
      },
      { 
        type: "item", 
        label: "Close Folder", 
        shortcut: "Ctrl+K F",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="9" y1="11" x2="15" y2="17"/><line x1="15" y1="11" x2="9" y2="17"/></svg>,
        onSelect: () => ui.closeFolder(), 
        disabled: !ui.hasFolder 
      },
    ],
  };

  const editMenu: TopMenu = {
    label: "Edit",
    items: [
      { 
        type: "item", 
        label: "Undo", 
        shortcut: "Ctrl+Z",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/></svg>,
        onSelect: () => {}, 
        disabled: true 
      },
      { 
        type: "item", 
        label: "Redo", 
        shortcut: "Ctrl+Y",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7"/></svg>,
        onSelect: () => {}, 
        disabled: true 
      },
      { type: "separator" },
      { 
        type: "item", 
        label: "Cut", 
        shortcut: "Ctrl+X",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>,
        onSelect: () => {},
        disabled: true
      },
      { 
        type: "item", 
        label: "Copy", 
        shortcut: "Ctrl+C",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
        onSelect: () => {},
        disabled: true
      },
      { 
        type: "item", 
        label: "Paste", 
        shortcut: "Ctrl+V",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>,
        onSelect: () => {},
        disabled: true
      },
      { type: "separator" },
      { 
        type: "item", 
        label: "Toggle Line Comment", 
        shortcut: "Ctrl+/",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
        onSelect: () => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', ctrlKey: true, bubbles: true }));
        }
      },
      { 
        type: "item", 
        label: "Toggle Block Comment", 
        shortcut: "Shift+Alt+A",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="12" y1="7" x2="12" y2="13"/></svg>,
        onSelect: () => {},
        disabled: true
      },
    ],
  };

  const codeMenu: TopMenu = {
    label: "Code",
    items: [
      { type: "header", label: "Selection" },
      { 
        type: "item", 
        label: "Add Cursor Above", 
        shortcut: "Ctrl+Alt+↑",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="18 11 12 5 6 11"/></svg>,
        onSelect: () => {},
        disabled: true
      },
      { 
        type: "item", 
        label: "Add Cursor Below", 
        shortcut: "Ctrl+Alt+↓",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="6 13 12 19 18 13"/></svg>,
        onSelect: () => {},
        disabled: true
      },
      { 
        type: "item", 
        label: "Add Next Occurrence", 
        shortcut: "Ctrl+D",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
        onSelect: () => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, bubbles: true }));
        }
      },
      { 
        type: "item", 
        label: "Select All Occurrences", 
        shortcut: "Ctrl+Shift+L",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
        onSelect: () => {},
        disabled: true
      },
      { type: "separator" },
      { type: "header", label: "Lines" },
      { 
        type: "item", 
        label: "Move Line Up", 
        shortcut: "Alt+↑",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>,
        onSelect: () => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true }));
        }
      },
      { 
        type: "item", 
        label: "Move Line Down", 
        shortcut: "Alt+↓",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
        onSelect: () => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }));
        }
      },
      { 
        type: "item", 
        label: "Copy Line Up", 
        shortcut: "Shift+Alt+↑",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="8" rx="2"/><rect x="3" y="13" width="18" height="8" rx="2"/></svg>,
        onSelect: () => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, shiftKey: true, bubbles: true }));
        }
      },
      { 
        type: "item", 
        label: "Copy Line Down", 
        shortcut: "Shift+Alt+↓",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="8" rx="2"/><rect x="3" y="13" width="18" height="8" rx="2"/></svg>,
        onSelect: () => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, shiftKey: true, bubbles: true }));
        }
      },
      { 
        type: "item", 
        label: "Delete Line", 
        shortcut: "Ctrl+Shift+K",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
        onSelect: () => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, shiftKey: true, bubbles: true }));
        }
      },
      { type: "separator" },
      { 
        type: "item", 
        label: "Format Document", 
        shortcut: "Shift+Alt+F",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>,
        onSelect: () => {},
        disabled: true
      },
      { 
        type: "item", 
        label: "Format Selection", 
        shortcut: "Ctrl+K Ctrl+F",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/><rect x="8" y="8" width="8" height="8" rx="1" opacity="0.3"/></svg>,
        onSelect: () => {},
        disabled: true
      },
    ],
  };

  const viewMenu: TopMenu = {
    label: "View",
    items: [
      { type: "header", label: "Appearance" },
      { 
        type: "item", 
        label: "Command Palette…", 
        shortcut: "Ctrl+Shift+P",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
        onSelect: () => {},
        disabled: true
      },
      { 
        type: "item", 
        label: "Toggle Word Wrap", 
        shortcut: "Alt+Z",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M3 12h15a3 3 0 1 1 0 6h-4"/><path d="M14 15l-3 3 3 3"/><path d="M3 18h7"/></svg>,
        onSelect: () => ui.toggleWordWrap()
      },
      { 
        type: "item", 
        label: "Toggle Bracket Matching", 
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>,
        onSelect: () => ui.toggleBracketMatching()
      },
      { type: "separator" },
      { type: "header", label: "Layout" },
      { 
        type: "item", 
        label: (ui.showSidebar ? "Hide" : "Show") + " Primary Sidebar", 
        shortcut: "Ctrl+B",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>,
        onSelect: () => ui.toggleSidebar() 
      },
      { 
        type: "item", 
        label: (ui.showSecondarySidebar ? "Hide" : "Show") + " Secondary Sidebar", 
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="15" y1="3" x2="15" y2="21"/></svg>,
        onSelect: () => ui.toggleSecondarySidebar() 
      },
      { 
        type: "item", 
        label: (ui.showPanel ? "Hide" : "Show") + " Panel", 
        shortcut: "Ctrl+J",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="15" x2="21" y2="15"/></svg>,
        onSelect: () => ui.togglePanel() 
      },
      { type: "separator" },
      { 
        type: "item", 
        label: `Move Activity Bar to ${ui.activityBarSide === 'left' ? 'Right' : 'Left'}`, 
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 11 21 7 17 3"/><polyline points="7 3 3 7 7 11"/><line x1="12" y1="7" x2="12" y2="21"/></svg>,
        onSelect: () => ui.setActivityBarSide(ui.activityBarSide === 'left' ? 'right' : 'left') 
      },
      { 
        type: "item", 
        label: `Move Panel to ${ui.panelPosition === 'bottom' ? 'Right' : 'Bottom'}`, 
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18" opacity="0.3"/><path d="M3 15h18" opacity="0.3"/></svg>,
        onSelect: () => ui.setPanelPosition(ui.panelPosition === 'bottom' ? 'right' : 'bottom') 
      },
      { type: "separator" },
      { type: "header", label: "Panels" },
      { 
        type: "item", 
        label: "Terminal", 
        shortcut: "Ctrl+`",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
        onSelect: () => {},
        disabled: true
      },
      { 
        type: "item", 
        label: "Problems", 
        shortcut: "Ctrl+Shift+M",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
        onSelect: () => {},
        disabled: true
      },
      { 
        type: "item", 
        label: "Output", 
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
        onSelect: () => {},
        disabled: true
      },
    ],
  };

  const helpMenu: TopMenu = { 
    label: "Help", 
    items: [ 
      { 
        type: "item", 
        label: "Getting Started", 
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
        onSelect: () => {} 
      },
      { 
        type: "item", 
        label: "What's New in Fishpie", 
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
        onSelect: () => {} 
      },
      { 
        type: "item", 
        label: "Documentation", 
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
        onSelect: () => {} 
      },
      { type: "separator" },
      { 
        type: "item", 
        label: "Request a Feature", 
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
        onSelect: () => {} 
      },
      { 
        type: "item", 
        label: "Report an Issue", 
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
        onSelect: () => {} 
      },
      { type: "separator" },
      { 
        type: "item", 
        label: "About Fishpie", 
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>,
        onSelect: () => ui.openAbout() 
      } 
    ] 
  };

  const menus: TopMenu[] = [fileMenu, editMenu, codeMenu, viewMenu, helpMenu];

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
