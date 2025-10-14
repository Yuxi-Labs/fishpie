"use client";
import { usePieUI } from "@/pie/state/ui";
import type { EditorGroup } from "@/pie/state/ui";
import React from "react";

export function EditorTabs({ group, isActive }: { group: EditorGroup; isActive: boolean }) {
  const ui = usePieUI();
  const files = group.openFiles;
  const none = files.length === 0;
  const [ctxOpen, setCtxOpen] = React.useState<{x:number;y:number}|null>(null);
  if (none) return null;
  return (
  <div
    className="h-12 flex items-center gap-1 overflow-x-auto border-b border-black/10 dark:border-white/10 bg-black/[.02] dark:bg-white/[.02]"
    onClick={() => ui.setActiveGroup(group.id)}
    onDoubleClick={(e) => {
      // double-click empty area creates a new tab
      // if the target is the container (not a tab child), create new tab
      if ((e.target as HTMLElement).closest('[data-tabitem]')) return;
      ui.newTab(group.id);
    }}
    onContextMenu={(e) => {
      e.preventDefault();
      setCtxOpen({ x: e.clientX, y: e.clientY });
    }}
  >
        {files.map((f) => {
          const active = isActive && group.activeFile === f.name;
          return (
            <div data-tabitem key={f.name} className={`px-3 py-2 text-xs whitespace-nowrap flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 ${active ? 'bg-black/10 dark:bg-white/10' : ''}`} onClick={(e) => { e.stopPropagation(); ui.activateFile(f.name, group.id); }}>
              <span className="opacity-80">{f.name}</span>
              {f.dirty ? <span className="text-amber-500">•</span> : null}
              <button className="ml-1 opacity-60 hover:opacity-100" title="Close" onClick={(e) => { e.stopPropagation(); ui.closeFile(f.name, group.id); }}>×</button>
            </div>
          );
        })}
      {/* Simple context menu */}
      {ctxOpen && (
        <div
          className="fixed z-50 min-w-32 py-1 rounded-md border border-black/10 dark:border-white/10 bg-white dark:bg-black shadow-lg text-xs"
          style={{ left: ctxOpen.x, top: ctxOpen.y }}
          onMouseLeave={() => setCtxOpen(null)}
        >
          <button className="w-full text-left px-3 py-1 hover:bg-black/5 dark:hover:bg-white/10" onClick={() => { ui.newTab(group.id); setCtxOpen(null); }}>New Tab (Ctrl/Cmd+T)</button>
        </div>
      )}
    </div>
  );
}
