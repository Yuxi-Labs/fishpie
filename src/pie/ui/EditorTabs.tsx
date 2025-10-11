"use client";
import { usePieUI } from "@/pie/state/ui";
import type { EditorGroup } from "@/pie/state/ui";

export function EditorTabs({ group, isActive }: { group: EditorGroup; isActive: boolean }) {
  const ui = usePieUI();
  const files = group.openFiles;
  const none = files.length === 0;
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-black/10 dark:border-white/10 bg-black/[.02] dark:bg-white/[.02]" onClick={() => ui.setActiveGroup(group.id)}>
      {none ? (
        <div className="px-3 py-2 text-xs opacity-60">No editors open</div>
      ) : (
        files.map((f) => {
          const active = isActive && group.activeFile === f.name;
          return (
            <div key={f.name} className={`px-3 py-2 text-xs whitespace-nowrap flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 ${active ? 'bg-black/10 dark:bg-white/10' : ''}`} onClick={(e) => { e.stopPropagation(); ui.activateFile(f.name, group.id); }}>
              <span className="opacity-80">{f.name}</span>
              {f.dirty ? <span className="text-amber-500">•</span> : null}
              <button className="ml-1 opacity-60 hover:opacity-100" title="Close" onClick={(e) => { e.stopPropagation(); ui.closeFile(f.name, group.id); }}>×</button>
            </div>
          );
        })
      )}
      <button className="ml-auto mr-2 text-xs opacity-70 hover:opacity-100" title="New Untitled" onClick={(e) => { e.stopPropagation(); ui.openFile(`Untitled-${(group.openFiles.length||0)+1}`, group.id); }}>＋</button>
    </div>
  );
}
