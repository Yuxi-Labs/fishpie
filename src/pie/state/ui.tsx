"use client";
import React, {createContext, useContext, useMemo, useState, useCallback} from 'react';
import { idbGet, idbSet, idbDel } from '@/pie/utils/idb';

export type Activity = 'explorer' | 'search' | 'source' | 'run' | 'ext';

export type OpenFile = { name: string; dirty?: boolean };
export type EditorGroup = { id: string; openFiles: OpenFile[]; activeFile?: string };

export type FSNode = {
  name: string;
  type: 'file' | 'folder';
  path: string; // relative path from root
  children?: FSNode[];
};

export type UIState = {
  activeActivity: Activity;
  setActiveActivity: (a: Activity) => void;
  hasWorkspace: boolean;
  hasFolder: boolean;
  rootName?: string | null;
  fileTree?: FSNode | null;
  openWorkspace: () => void;
  openFolder: () => void;
  closeFolder: () => void;
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
  newTab: (groupId?: string) => void;
  openFile: (name: string, groupId?: string) => void;
  closeFile: (name: string, groupId?: string) => void;
  activateFile: (name: string, groupId?: string) => void;
  markDirty: (name: string, dirty: boolean) => void;

  // File text cache accessor
  getFileText: (name: string) => string | undefined;

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

export const PieUIContext = createContext<UIState | null>(null);

export function PieUIProvider({ children }: { children: React.ReactNode }) {
  const [activeActivity, setActiveActivity] = useState<Activity>(() => (localStorage.getItem('ui.activeActivity') as Activity) || 'explorer');
  const [hasWorkspace, setHasWorkspace] = useState<boolean>(false);
  const [hasFolder, setHasFolder] = useState<boolean>(() => localStorage.getItem('ui.hasFolder') === 'true');
  const [rootName, setRootName] = useState<string | null>(() => localStorage.getItem('ui.rootName'));
  const [fileTree, setFileTree] = useState<FSNode | null>(() => {
    try { const raw = localStorage.getItem('ui.fileTree'); return raw ? JSON.parse(raw) as FSNode : null; } catch { return null; }
  });
  const [showSidebar, setShowSidebar] = useState<boolean>(() => {
    const v = localStorage.getItem('ui.showSidebar');
    // Hidden by default. Respect persisted value only if a folder is open.
    const hasFld = localStorage.getItem('ui.hasFolder') === 'true';
    if (!hasFld) return false;
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
  // In-memory FS handles and loaded texts for current workspace
  const fileHandlesRef = React.useRef<Map<string, FileSystemFileHandle>>(new Map());
  const [fileTexts, setFileTexts] = useState<Record<string, string>>({});

  const persistGroups = (next: EditorGroup[]) => {
    setGroups(next);
    try { localStorage.setItem('ui.groups', JSON.stringify(next)); } catch {}
  };

  const getGroupIndex = useCallback((groupId?: string) => groups.findIndex(g => g.id === (groupId || activeGroupId)), [groups, activeGroupId]);

  const splitEditorRight = useCallback(() => {
    // Only split when an editor exists
    if (groups.length === 0) return;
    const id = `g${Date.now().toString(36)}`;
    const insertAfter = groups.findIndex(g => g.id === activeGroupId);
    const next = groups.slice();
    // Seed the new editor with the active file if one exists; otherwise start with Untitled-1
    const src = groups.find(g => g.id === activeGroupId) || groups[0];
    let seeded: EditorGroup;
    const uniqueUntitled = () => {
      const allNames = new Set<string>();
      for (const g of groups) for (const f of g.openFiles) allNames.add(f.name);
      let n = 1;
      while (allNames.has(`Untitled-${n}`)) n++;
      return `Untitled-${n}`;
    };
    if (src && src.activeFile) {
      seeded = { id, openFiles: [{ name: src.activeFile }], activeFile: src.activeFile };
    } else {
      const name = uniqueUntitled();
      seeded = { id, openFiles: [{ name }], activeFile: name };
    }
    if (insertAfter >= 0) next.splice(insertAfter + 1, 0, seeded); else next.push(seeded);
    persistGroups(next);
    setActiveGroupId(id);
    try { localStorage.setItem('ui.activeGroupId', id); } catch {}
  }, [groups, activeGroupId]);

  const newTab = useCallback((groupId?: string) => {
    const idx = getGroupIndex(groupId);
    if (idx === -1) return;
    const g = groups[idx];
    // Find next Untitled-N
    let n = 1;
    const names = new Set(g.openFiles.map(f => f.name));
    while (names.has(`Untitled-${n}`)) n++;
    const name = `Untitled-${n}`;
    const ng: EditorGroup = { ...g, openFiles: [...g.openFiles, { name }], activeFile: name };
    const next = groups.slice(); next[idx] = ng; persistGroups(next);
    if (!groupId) { setActiveGroupId(g.id); try { localStorage.setItem('ui.activeGroupId', g.id); } catch {} }
  }, [groups, getGroupIndex]);

  const openFile = useCallback((name: string, groupId?: string) => {
    const idx = getGroupIndex(groupId);
    if (idx === -1) return;
    const g = groups[idx];
    const exists = g.openFiles.find(f => f.name === name);
    const ng: EditorGroup = exists ? { ...g, activeFile: name } : { ...g, openFiles: [...g.openFiles, { name }], activeFile: name };
    const next = groups.slice(); next[idx] = ng; persistGroups(next);
    if (!groupId) { setActiveGroupId(g.id); try { localStorage.setItem('ui.activeGroupId', g.id); } catch {} }
    // Load file text into cache if available and not yet loaded
    (async () => {
      try {
        if (fileTexts[name] == null) {
          const fh = fileHandlesRef.current.get(name);
          if (fh) {
            const f = await fh.getFile();
            const txt = await f.text();
            setFileTexts(prev => ({ ...prev, [name]: txt }));
          }
        }
      } catch (e) {
        console.warn('Failed to read file', name, e);
      }
    })();
  }, [groups, getGroupIndex, fileTexts]);

  const closeFile = useCallback((name: string, groupId?: string) => {
    const idx = getGroupIndex(groupId);
    if (idx === -1) return;
    const g = groups[idx];
    const remaining = g.openFiles.filter(f => f.name !== name);
    if (remaining.length === 0) {
      // Remove this editor if there are multiple; otherwise keep empty editor
      if (groups.length > 1) {
        const next = groups.filter((_, i) => i !== idx);
        persistGroups(next);
        // pick a new active editor
        const nextActive = next[Math.min(idx, next.length - 1)]?.id;
        if (nextActive) { setActiveGroupId(nextActive); try { localStorage.setItem('ui.activeGroupId', nextActive); } catch {} }
        return;
      } else {
        const ng: EditorGroup = { ...g, openFiles: [], activeFile: undefined };
        const next = groups.slice(); next[idx] = ng; persistGroups(next);
        return;
      }
    }
    const ng: EditorGroup = { ...g, openFiles: remaining, activeFile: g.activeFile === name ? remaining[0]?.name : g.activeFile };
    const next = groups.slice(); next[idx] = ng; persistGroups(next);
  }, [groups, getGroupIndex]);

  const activateFile = useCallback((name: string, groupId?: string) => {
    const idx = getGroupIndex(groupId);
    if (idx === -1) return;
    const g = groups[idx];
    const ng: EditorGroup = { ...g, activeFile: name };
    const next = groups.slice(); next[idx] = ng; persistGroups(next);
    if (!groupId) { setActiveGroupId(g.id); try { localStorage.setItem('ui.activeGroupId', g.id); } catch {} }
  }, [groups, getGroupIndex]);

  const markDirty = useCallback((name: string, dirty: boolean) => {
    const idx = getGroupIndex(); if (idx === -1) return;
    const g = groups[idx];
    const ng: EditorGroup = { ...g, openFiles: g.openFiles.map(f => (f.name === name ? { ...f, dirty } : f)) };
    const next = groups.slice(); next[idx] = ng; persistGroups(next);
  }, [groups, getGroupIndex]);

  // persist on change (derived hasWorkspace is not persisted)
  React.useEffect(() => { localStorage.setItem('ui.activeActivity', activeActivity); }, [activeActivity]);
  React.useEffect(() => { localStorage.setItem('ui.showSidebar', String(showSidebar)); }, [showSidebar]);
  React.useEffect(() => { localStorage.setItem('ui.showPanel', String(showPanel)); }, [showPanel]);
  React.useEffect(() => { localStorage.setItem('ui.showSecondarySidebar', String(showSecondarySidebar)); }, [showSecondarySidebar]);
  React.useEffect(() => { localStorage.setItem('ui.activityBarSide', activityBarSide); }, [activityBarSide]);
  React.useEffect(() => { localStorage.setItem('ui.panelPosition', panelPosition); }, [panelPosition]);
  React.useEffect(() => { localStorage.setItem('ui.viewLocations', JSON.stringify(viewLocations)); }, [viewLocations]);
  React.useEffect(() => { localStorage.setItem('ui.hasFolder', String(hasFolder)); }, [hasFolder]);
  React.useEffect(() => { try { if (rootName) localStorage.setItem('ui.rootName', rootName); else localStorage.removeItem('ui.rootName'); } catch {} }, [rootName]);
  React.useEffect(() => { try { if (fileTree) localStorage.setItem('ui.fileTree', JSON.stringify(fileTree)); else localStorage.removeItem('ui.fileTree'); } catch {} }, [fileTree]);

  React.useEffect(() => { try { localStorage.setItem('ui.activeGroupId', activeGroupId); } catch {} }, [activeGroupId]);

  // Derive hasWorkspace from current UI: true if any file open across groups or a folder is open.
  React.useEffect(() => {
    const anyOpenFile = groups.some(g => g.openFiles.length > 0);
    const next = anyOpenFile || hasFolder;
    setHasWorkspace(next);
  }, [groups, hasFolder]);

  const activeGroup = useMemo(() => groups.find(g => g.id === activeGroupId) || groups[0], [groups, activeGroupId]);
  const activeOpenFiles = useMemo(() => activeGroup?.openFiles || [], [activeGroup]);
  const activeFile = activeGroup?.activeFile;

  // Directory traversal using File System Access API
  const readDirectoryRecursive = React.useCallback(async (dirHandle: FileSystemDirectoryHandle, basePath = ""): Promise<FSNode> => {
    const node: FSNode = { name: dirHandle.name, type: 'folder', path: basePath, children: [] };
    try {
      // @ts-expect-error for-await supported by FileSystemDirectoryHandle.entries()
      for await (const [name, handle] of dirHandle.entries()) {
        const nextPath = basePath ? `${basePath}/${name}` : name;
        if ((handle as FileSystemFileHandle).kind === 'file') {
          node.children!.push({ name, type: 'file', path: nextPath });
          try { fileHandlesRef.current.set(nextPath, handle as FileSystemFileHandle); } catch {}
        } else if ((handle as FileSystemDirectoryHandle).kind === 'directory') {
          const child = await readDirectoryRecursive(handle as FileSystemDirectoryHandle, nextPath);
          node.children!.push(child);
        }
      }
      node.children!.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : (a.type === 'folder' ? -1 : 1)));
    } catch (e) {
      // ignore errors for now
      console.warn('Failed to read directory', e);
    }
    return node;
  }, []);

  const handleOpenFolder = React.useCallback(async () => {
    try {
  type DirPickerOpts = { mode?: 'read' | 'readwrite' };
  const picker = (window as unknown as { showDirectoryPicker?: (opts?: DirPickerOpts) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker;
  const dir: FileSystemDirectoryHandle | undefined = picker ? await picker({ mode: 'read' as const }) : undefined;
      if (!dir) return;
      // Persist handle for future sessions
      try { await idbSet('lastDirHandle', dir); } catch {}
      setHasFolder(true);
      setShowSidebar(true);
      setActiveActivity('explorer');
      setRootName(dir.name || 'Folder');
      const tree = await readDirectoryRecursive(dir, "");
      setFileTree(tree);
    } catch (e) {
      // user might cancel picker; do nothing
      console.info('Open folder cancelled or unsupported', e);
    }
  }, [readDirectoryRecursive, setActiveActivity]);

  const handleCloseFolder = React.useCallback(() => {
    setHasFolder(false);
    setRootName(null);
    setFileTree(null);
    try { idbDel('lastDirHandle'); } catch {}
  }, []);

  const value: UIState = useMemo(() => ({
    activeActivity,
    setActiveActivity,
    hasWorkspace,
    hasFolder,
    rootName,
    fileTree,
    openWorkspace: () => { /* no-op; derived from files/folder */ },
    openFolder: handleOpenFolder,
    closeFolder: handleCloseFolder,
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
  openFiles: activeOpenFiles,
  activeFile: activeFile,
  splitEditorRight,
    newTab,
    openFile,
    closeFile,
    activateFile,
    markDirty,
  getFileText: (name: string) => fileTexts[name],
    cursor: { line: 1, column: 1 },
    languageId: 'plaintext',
    eol: 'LF',
    encoding: 'UTF-8',
    showAbout,
    openAbout: () => setShowAbout(true),
    closeAbout: () => setShowAbout(false),
  }), [activeActivity, showSidebar, showPanel, showSecondarySidebar, activityBarSide, panelPosition, viewLocations, groups, activeGroupId, showAbout, hasFolder, hasWorkspace, activeOpenFiles, activeFile, splitEditorRight, newTab, openFile, closeFile, activateFile, markDirty, rootName, fileTree, handleOpenFolder, handleCloseFolder, fileTexts]);

  // Attempt to restore previously authorized folder on load
  React.useEffect(() => {
    (async () => {
      try {
        const saved = await idbGet<FileSystemDirectoryHandle>('lastDirHandle');
        if (!saved) return;
        // Check permission
  type PermOpts = { mode?: 'read' | 'readwrite' };
  const qp = (saved as unknown as { queryPermission?: (opts?: PermOpts) => Promise<PermissionState> }).queryPermission;
  const perm = qp ? await qp({ mode: 'read' }) : 'denied';
        if (perm === 'granted') {
          setHasFolder(true);
          setShowSidebar(true);
          setActiveActivity('explorer');
          setRootName(saved.name || 'Folder');
          const tree = await readDirectoryRecursive(saved, "");
          setFileTree(tree);
        }
      } catch {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <PieUIContext.Provider value={value}>{children}</PieUIContext.Provider>;
}

export function usePieUI() {
  const ctx = useContext(PieUIContext);
  if (!ctx) throw new Error('usePieUI must be used within PieUIProvider');
  return ctx;
}
