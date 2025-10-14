"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { usePieUI } from '@/pie/state/ui';

type Command = { id: string; title: string; run: () => void };

export function CommandPalette() {
  const ui = usePieUI();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const cmds: Command[] = useMemo(() => ([
    { id: 'view.toggleSidebar', title: (ui.showSidebar ? 'Hide' : 'Show') + ' Side Bar', run: () => ui.toggleSidebar() },
    { id: 'view.togglePanel', title: (ui.showPanel ? 'Hide' : 'Show') + ' Panel', run: () => ui.togglePanel() },
    { id: 'view.panelRight', title: 'Panel: Move to Right', run: () => ui.setPanelPosition('right') },
    { id: 'view.panelBottom', title: 'Panel: Move to Bottom', run: () => ui.setPanelPosition('bottom') },
    { id: 'file.newUntitled', title: 'File: New Untitled', run: () => ui.openFile(`Untitled-${(ui.openFiles.length||0)+1}`) },
  ]), [ui.showSidebar, ui.showPanel, ui.openFiles.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filtered = cmds.filter(c => c.title.toLowerCase().includes(q.toLowerCase()));

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/40">
      <div className="w-[640px] max-w-[95vw] rounded-lg overflow-hidden border border-black/10 dark:border-white/10 bg-white dark:bg-black">
        <input
          autoFocus
          placeholder="Type a command"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-transparent outline-none border-b border-black/10 dark:border-white/10"
        />
        <div className="max-h-[50vh] overflow-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs opacity-60">No commands</div>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
                onClick={() => { c.run(); setOpen(false); }}
              >
                {c.title}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
