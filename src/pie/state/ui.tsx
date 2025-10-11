"use client";
import React, {createContext, useContext, useMemo, useState} from 'react';

export type Activity = 'explorer' | 'search' | 'source' | 'run' | 'ext';

export type OpenFile = { name: string; dirty?: boolean };
export type EditorGroup = { id: string; openFiles: OpenFile[]; activeFile?: string };

type UIState = {
  activeActivity: Activity;
  setActiveActivity: (a: Activity) => void;
  hasWorkspace: boolean;
  openWorkspace: () => void;
  showSidebar: boolean;
  toggleSidebar: () => void;
  showPanel: boolean;
  togglePanel: () => void;
  showSecondarySidebar: boolean;
  toggleSecondarySidebar: () => void;
  activityBarSide: 'left' | 'right';
  setActivityBarSide: (s: 'left' | 'right') => void;
  panelPosition: 'bottom' | 'right';
  setPanelPosition: (p: 'bottom' | 'right') => void;

  // View anchoring between primary/secondary sidebars (minimal set for now)
  viewLocations: Record<'explorer' | 'outline', 'primary' | 'secondary'>;
  setViewLocation: (view: 'explorer' | 'outline', side: 'primary' | 'secondary') => void;

  // Editor groups
  groups: EditorGroup[];
  activeGroupId: string;
  setActiveGroup: (id: string) => void;
  openFiles: OpenFile[]; // of active group
  activeFile?: string;   // of active group
  splitEditorRight: () => void;
  openFile: (name: string, groupId?: string) => void;
  closeFile: (name: string, groupId?: string) => void;
  activateFile: (name: string, groupId?: string) => void;
  markDirty: (name: string, dirty: boolean) => void;

  // Editor status (mock for now)
  cursor: { line: number; column: number };
  languageId: string;
  eol: 'LF' | 'CRLF';
  encoding: 'UTF-8' | 'UTF-16LE';

  // About dialog
  showAbout: boolean;
  openAbout: () => void;
  closeAbout: () => void;
};

const PieUIContext = createContext<UIState | null>(null);

export function PieUIProvider({ children }: { children: React.ReactNode }) {
  const [activeActivity, setActiveActivity] = useState<Activity>(() => (localStorage.getItem('ui.activeActivity') as Activity) || 'explorer');
  const [hasWorkspace, setHasWorkspace] = useState<boolean>(() => localStorage.getItem('ui.hasWorkspace') === 'true');
  const [showSidebar, setShowSidebar] = useState<boolean>(() => {
    const v = localStorage.getItem('ui.showSidebar');
    // Default to hidden if no workspace yet
    if (v == null) return false;
    return v !== 'false';
  });
  const [showPanel, setShowPanel] = useState<boolean>(() => localStorage.getItem('ui.showPanel') === 'true');
  const [showSecondarySidebar, setShowSecondarySidebar] = useState<boolean>(() => localStorage.getItem('ui.showSecondarySidebar') === 'true');
  const [activityBarSide, setActivityBarSide] = useState<'left' | 'right'>(() => (localStorage.getItem('ui.activityBarSide') as 'left' | 'right') || 'left');
  const [panelPosition, setPanelPosition] = useState<'bottom' | 'right'>(() => (localStorage.getItem('ui.panelPosition') as 'bottom' | 'right') || 'bottom');
  const [viewLocations, setViewLocations] = useState<Record<'explorer' | 'outline', 'primary' | 'secondary'>>(() => {
    try {
      const raw = localStorage.getItem('ui.viewLocations');
      if (raw) return JSON.parse(raw);
    } catch {}
    return { explorer: 'primary', outline: 'secondary' };
  });
  const [groups, setGroups] = useState<EditorGroup[]>(() => {
    try {
      const raw = localStorage.getItem('ui.groups');
      if (raw) return JSON.parse(raw) as EditorGroup[];
    } catch {}
    return [{ id: 'g1', openFiles: [], activeFile: undefined }];
  });
  const [activeGroupId, setActiveGroupId] = useState<string>(() => localStorage.getItem('ui.activeGroupId') || 'g1');
  const [showAbout, setShowAbout] = useState(false);

  const persistGroups = (next: EditorGroup[]) => {
    setGroups(next);
    try { localStorage.setItem('ui.groups', JSON.stringify(next)); } catch {}
  };

  const getGroupIndex = (groupId?: string) => groups.findIndex(g => g.id === (groupId || activeGroupId));

  const splitEditorRight = () => {
    const id = `g${Date.now().toString(36)}`;
    persistGroups([...groups, { id, openFiles: [], activeFile: undefined }]);
    setActiveGroupId(id);
    try { localStorage.setItem('ui.activeGroupId', id); } catch {}
  };

  const openFile = (name: string, groupId?: string) => {
    const idx = getGroupIndex(groupId);
    if (idx === -1) return;
    const g = groups[idx];
    const exists = g.openFiles.find(f => f.name === name);
    const ng: EditorGroup = exists ? { ...g, activeFile: name } : { ...g, openFiles: [...g.openFiles, { name }], activeFile: name };
    const next = groups.slice(); next[idx] = ng; persistGroups(next);
    if (!groupId) { setActiveGroupId(g.id); try { localStorage.setItem('ui.activeGroupId', g.id); } catch {} }
  };

  const closeFile = (name: string, groupId?: string) => {
    const idx = getGroupIndex(groupId);
    if (idx === -1) return;
    const g = groups[idx];
    const remaining = g.openFiles.filter(f => f.name !== name);
    const ng: EditorGroup = { ...g, openFiles: remaining, activeFile: g.activeFile === name ? remaining[0]?.name : g.activeFile };
    const next = groups.slice(); next[idx] = ng; persistGroups(next);
  };

  const activateFile = (name: string, groupId?: string) => {
    const idx = getGroupIndex(groupId);
    if (idx === -1) return;
    const g = groups[idx];
    const ng: EditorGroup = { ...g, activeFile: name };
    const next = groups.slice(); next[idx] = ng; persistGroups(next);
    if (!groupId) { setActiveGroupId(g.id); try { localStorage.setItem('ui.activeGroupId', g.id); } catch {} }
  };

  const markDirty = (name: string, dirty: boolean) => {
    const idx = getGroupIndex(); if (idx === -1) return;
    const g = groups[idx];
    const ng: EditorGroup = { ...g, openFiles: g.openFiles.map(f => (f.name === name ? { ...f, dirty } : f)) };
    const next = groups.slice(); next[idx] = ng; persistGroups(next);
  };

  // persist on change
  React.useEffect(() => { localStorage.setItem('ui.hasWorkspace', String(hasWorkspace)); }, [hasWorkspace]);
  React.useEffect(() => { localStorage.setItem('ui.activeActivity', activeActivity); }, [activeActivity]);
  React.useEffect(() => { localStorage.setItem('ui.showSidebar', String(showSidebar)); }, [showSidebar]);
  React.useEffect(() => { localStorage.setItem('ui.showPanel', String(showPanel)); }, [showPanel]);
  React.useEffect(() => { localStorage.setItem('ui.showSecondarySidebar', String(showSecondarySidebar)); }, [showSecondarySidebar]);
  React.useEffect(() => { localStorage.setItem('ui.activityBarSide', activityBarSide); }, [activityBarSide]);
  React.useEffect(() => { localStorage.setItem('ui.panelPosition', panelPosition); }, [panelPosition]);
  React.useEffect(() => { localStorage.setItem('ui.viewLocations', JSON.stringify(viewLocations)); }, [viewLocations]);

  React.useEffect(() => { try { localStorage.setItem('ui.activeGroupId', activeGroupId); } catch {} }, [activeGroupId]);

  const activeGroup = groups.find(g => g.id === activeGroupId) || groups[0];

  const value: UIState = useMemo(() => ({
    activeActivity,
    setActiveActivity,
    hasWorkspace,
    openWorkspace: () => { setHasWorkspace(true); setShowSidebar(true); setActiveActivity('explorer'); },
    showSidebar,
    toggleSidebar: () => setShowSidebar(v => !v),
    showPanel,
    togglePanel: () => setShowPanel(v => !v),
    showSecondarySidebar,
    toggleSecondarySidebar: () => setShowSecondarySidebar(v => !v),
    activityBarSide,
    setActivityBarSide,
    panelPosition,
    setPanelPosition,
  viewLocations,
  setViewLocation: (view, side) => setViewLocations(prev => ({ ...prev, [view]: side })),
  groups,
  activeGroupId,
  setActiveGroup: (id: string) => setActiveGroupId(id),
  openFiles: activeGroup?.openFiles || [],
  activeFile: activeGroup?.activeFile,
  splitEditorRight,
    openFile,
    closeFile,
    activateFile,
    markDirty,
    cursor: { line: 1, column: 1 },
    languageId: 'plaintext',
    eol: 'LF',
    encoding: 'UTF-8',
    showAbout,
    openAbout: () => setShowAbout(true),
    closeAbout: () => setShowAbout(false),
  }), [activeActivity, showSidebar, showPanel, showSecondarySidebar, activityBarSide, panelPosition, viewLocations, groups, activeGroupId, showAbout]);

  return <PieUIContext.Provider value={value}>{children}</PieUIContext.Provider>;
}

export function usePieUI() {
  const ctx = useContext(PieUIContext);
  if (!ctx) throw new Error('usePieUI must be used within PieUIProvider');
  return ctx;
}
