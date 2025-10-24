"use client";
import { usePieUI } from "@/pie/state/ui";
import type { EditorGroup } from "@/pie/state/ui";
import React from "react";

export function EditorTabs({ group, isActive }: { group: EditorGroup; isActive: boolean }) {
  const ui = usePieUI();
  const files = group.openFiles;
  const [ctxOpen, setCtxOpen] = React.useState<{x:number;y:number}|null>(null);
  
  // Close context menu on click outside
  React.useEffect(() => {
    if (!ctxOpen) return;
    const handleClick = () => setCtxOpen(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [ctxOpen]);
  
  // Don't render tab row if no files are open
  if (files.length === 0) {
    return null;
  }
  
  return (
  <div
    className="h-12 flex flex-nowrap items-center overflow-x-auto overflow-y-hidden min-w-0 border-b border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
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
            <div 
              data-tabitem 
              key={f.name} 
              className={`
                px-3 py-2 text-xs whitespace-nowrap flex items-center gap-2 flex-shrink-0
                border-r border-black/10 dark:border-white/10
                transition-colors
                ${active 
                  ? 'bg-white dark:bg-black border-t-2 border-t-blue-500 font-medium' 
                  : 'hover:bg-black/5 dark:hover:bg-white/5 border-t-2 border-t-transparent'
                }
              `}
              onClick={(e) => { e.stopPropagation(); ui.activateFile(f.name, group.id); }}
            >
              {f.dirty && <span className="text-amber-500 text-base leading-none">•</span>}
              <span className={`${active ? 'text-black dark:text-white' : 'text-black/60 dark:text-white/60'}`}>
                {f.name.split('/').pop()}
              </span>
              <button 
                className="ml-1 opacity-60 hover:opacity-100 p-0.5 hover:bg-black/10 dark:hover:bg-white/20 rounded" 
                title="Close" 
                onClick={(e) => { e.stopPropagation(); ui.closeFile(f.name, group.id); }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          );
        })}
      {/* Context menu */}
      {ctxOpen && (
        <div
          className="fixed z-50 min-w-48 py-1 rounded-lg border border-black/10 dark:border-white/20 bg-white dark:bg-[#1e1e1e] shadow-xl text-xs"
          style={{ left: ctxOpen.x, top: ctxOpen.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="w-full text-left px-4 py-2 hover:bg-blue-500/10 dark:hover:bg-blue-500/20 text-black dark:text-white transition-colors" 
            onClick={() => { ui.newTab(group.id); setCtxOpen(null); }}
          >
            New Tab
          </button>
          <div className="h-px bg-black/10 dark:bg-white/10 my-1 mx-2" />
          <button 
            className="w-full text-left px-4 py-2 hover:bg-blue-500/10 dark:hover:bg-blue-500/20 text-black dark:text-white transition-colors" 
            onClick={() => { 
              files.forEach(f => ui.closeFile(f.name, group.id)); 
              setCtxOpen(null); 
            }}
          >
            Close All Tabs
          </button>
          <button 
            className="w-full text-left px-4 py-2 hover:bg-blue-500/10 dark:hover:bg-blue-500/20 text-black dark:text-white transition-colors" 
            onClick={() => { 
              files.filter(f => !f.dirty).forEach(f => ui.closeFile(f.name, group.id)); 
              setCtxOpen(null); 
            }}
          >
            Close Saved Tabs
          </button>
          <button 
            className="w-full text-left px-4 py-2 hover:bg-blue-500/10 dark:hover:bg-blue-500/20 text-black dark:text-white transition-colors" 
            onClick={() => { 
              const activeIdx = files.findIndex(f => f.name === group.activeFile);
              files.forEach((f, idx) => {
                if (idx !== activeIdx) ui.closeFile(f.name, group.id);
              });
              setCtxOpen(null); 
            }}
          >
            Close Other Tabs
          </button>
        </div>
      )}
    </div>
  );
}
