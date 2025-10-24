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
  // Rename the active file (updates tabs, active name, and cached content)
  renameActiveFile: (newName: string) => void;

  // File text cache accessor
  getFileText: (name: string) => string | undefined;
  setFileText: (name: string, text: string) => void;

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
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as EditorGroup[];
        }
      }
    } catch {}
    return [{ id: 'g1', openFiles: [], activeFile: undefined }];
  });
  const [activeGroupId, setActiveGroupId] = useState<string>(() => localStorage.getItem('ui.activeGroupId') || 'g1');
  // Monotonic counter to ensure every new untitled tab gets a fresh, never-reused name
  const [untitledSeq, setUntitledSeq] = useState<number>(() => {
    const raw = localStorage.getItem('ui.untitledSeq');
    const n = parseInt(raw || '1', 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  });
  const [showAbout, setShowAbout] = useState(false);
  // In-memory FS handles and loaded texts for current workspace
  const fileHandlesRef = React.useRef<Map<string, FileSystemFileHandle>>(new Map());
  const [fileTexts, setFileTexts] = useState<Record<string, string>>({});

  // Load persisted file texts on startup
  React.useEffect(() => {
    (async () => {
      try {
        const saved = await idbGet<Record<string, string>>('fileTexts');
        if (saved) setFileTexts(saved);
      } catch {}
    })();
  }, []);

  // Persist file texts on change (debounced behavior could be added later)
  React.useEffect(() => {
    (async () => {
      try { await idbSet('fileTexts', fileTexts); } catch {}
    })();
  }, [fileTexts]);

  const persistGroups = useCallback((next: EditorGroup[]) => {
    const safe = next && next.length > 0 ? next : [{ id: 'g1', openFiles: [], activeFile: undefined }];
    setGroups(safe);
    try { localStorage.setItem('ui.groups', JSON.stringify(safe)); } catch {}
  }, []);

  const getGroupIndex = useCallback((groupId?: string) => {
    if (!groups || groups.length === 0) return 0;
    const idx = groups.findIndex(g => g.id === (groupId || activeGroupId));
    return idx === -1 ? 0 : idx;
  }, [groups, activeGroupId]);

  // Generate a fresh untitled name and advance the sequence
  const nextUntitledName = useCallback(() => {
    const name = `Untitled-${untitledSeq}`;
    const next = untitledSeq + 1;
    setUntitledSeq(next);
    try { localStorage.setItem('ui.untitledSeq', String(next)); } catch {}
    return name;
  }, [untitledSeq]);

  const splitEditorRight = useCallback(() => {
    setGroups(currentGroups => {
      // Ensure at least one editor exists
      if (currentGroups.length === 0) {
        const defaultGroup = [{ id: 'g1', openFiles: [], activeFile: undefined }];
        setActiveGroupId('g1');
        try { localStorage.setItem('ui.groups', JSON.stringify(defaultGroup)); } catch {}
        return defaultGroup;
      }
      
      const id = `g${Date.now().toString(36)}`;
      const insertAfter = currentGroups.findIndex(g => g.id === activeGroupId);
      const next = currentGroups.slice();
      // Seed the new editor with the active file if one exists; otherwise start with Untitled-1
      const src = currentGroups.find(g => g.id === activeGroupId) || currentGroups[0];
      let seeded: EditorGroup;
      const uniqueUntitled = () => nextUntitledName();
      if (src && src.activeFile) {
        seeded = { id, openFiles: [{ name: src.activeFile }], activeFile: src.activeFile };
      } else {
        const name = uniqueUntitled();
        seeded = { id, openFiles: [{ name }], activeFile: name };
      }
      if (insertAfter >= 0) next.splice(insertAfter + 1, 0, seeded); else next.push(seeded);
      setActiveGroupId(id);
      try { localStorage.setItem('ui.groups', JSON.stringify(next)); } catch {}
      try { localStorage.setItem('ui.activeGroupId', id); } catch {}
      return next;
    });
  }, [activeGroupId, nextUntitledName]);

  const newTab = useCallback((groupId?: string) => {
    setGroups(currentGroups => {
      const targetId = groupId || activeGroupId;
      let idx = currentGroups.findIndex(g => g.id === targetId);
      if (idx === -1) idx = 0;
      
      const g = currentGroups[idx];
      // Always create a fresh Untitled-N using a monotonic sequence
      const name = nextUntitledName();
      const ng: EditorGroup = { ...g, openFiles: [...g.openFiles, { name }], activeFile: name };
      const next = currentGroups.slice();
      next[idx] = ng;
      try { localStorage.setItem('ui.groups', JSON.stringify(next)); } catch {}
      if (!groupId) { setActiveGroupId(g.id); try { localStorage.setItem('ui.activeGroupId', g.id); } catch {} }
      return next;
    });
  }, [activeGroupId, nextUntitledName]);

  const openFile = useCallback((name: string, groupId?: string) => {
    setGroups(currentGroups => {
      // If groups somehow empty, seed a default group
      if (currentGroups.length === 0) {
        const defaultGroup = [{ id: 'g1', openFiles: [{ name }], activeFile: name }];
        try { localStorage.setItem('ui.groups', JSON.stringify(defaultGroup)); } catch {}
        if (!groupId) { setActiveGroupId('g1'); try { localStorage.setItem('ui.activeGroupId', 'g1'); } catch {} }
        return defaultGroup;
      }
      
      const targetId = groupId || activeGroupId;
      let idx = currentGroups.findIndex(g => g.id === targetId);
      if (idx === -1) idx = 0;
      
      const g = currentGroups[idx];
      const exists = g.openFiles.find(f => f.name === name);
      const ng: EditorGroup = exists ? { ...g, activeFile: name } : { ...g, openFiles: [...g.openFiles, { name }], activeFile: name };
      const next = currentGroups.slice();
      next[idx] = ng;
      try { localStorage.setItem('ui.groups', JSON.stringify(next)); } catch {}
      if (!groupId) { setActiveGroupId(g.id); try { localStorage.setItem('ui.activeGroupId', g.id); } catch {} }
      return next;
    });
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
  }, [groups, getGroupIndex, fileTexts, persistGroups]);

  const closeFile = useCallback((name: string, groupId?: string) => {
    setGroups(currentGroups => {
      const targetId = groupId || activeGroupId;
      let idx = currentGroups.findIndex(g => g.id === targetId);
      if (idx === -1) idx = 0;
      
      const g = currentGroups[idx];
      const remaining = g.openFiles.filter(f => f.name !== name);
      
      if (remaining.length === 0) {
        // Remove this editor if there are multiple; otherwise keep empty editor
        if (currentGroups.length > 1) {
          const next = currentGroups.filter((_, i) => i !== idx);
          const safeNext = next.length > 0 ? next : [{ id: 'g1', openFiles: [], activeFile: undefined }];
          try { localStorage.setItem('ui.groups', JSON.stringify(safeNext)); } catch {}
          // pick a new active editor
          const nextActive = (next.length > 0 ? next[Math.min(idx, next.length - 1)]?.id : 'g1');
          if (nextActive) { setActiveGroupId(nextActive); try { localStorage.setItem('ui.activeGroupId', nextActive); } catch {} }
          return safeNext;
        } else {
          const ng: EditorGroup = { ...g, openFiles: [], activeFile: undefined };
          const next = currentGroups.slice();
          next[idx] = ng;
          try { localStorage.setItem('ui.groups', JSON.stringify(next)); } catch {}
          return next;
        }
      }
      
      // When closing a tab, select the next appropriate tab
      let newActiveFile: string | undefined;
      if (g.activeFile === name) {
        // Find the index of the file being closed
        const closingIdx = g.openFiles.findIndex(f => f.name === name);
        // Try to select the next tab, or the previous one if closing the last tab
        if (closingIdx < remaining.length) {
          newActiveFile = remaining[closingIdx]?.name;
        } else if (remaining.length > 0) {
          newActiveFile = remaining[remaining.length - 1]?.name;
        }
      } else {
        newActiveFile = g.activeFile;
      }
      
      const ng: EditorGroup = { ...g, openFiles: remaining, activeFile: newActiveFile };
      const next = currentGroups.slice();
      next[idx] = ng;
      try { localStorage.setItem('ui.groups', JSON.stringify(next)); } catch {}
      return next;
    });
  }, [activeGroupId]);

  const activateFile = useCallback((name: string, groupId?: string) => {
    setGroups(currentGroups => {
      const targetId = groupId || activeGroupId;
      let idx = currentGroups.findIndex(g => g.id === targetId);
      if (idx === -1) idx = 0;
      
      const g = currentGroups[idx];
      const ng: EditorGroup = { ...g, activeFile: name };
      const next = currentGroups.slice();
      next[idx] = ng;
      try { localStorage.setItem('ui.groups', JSON.stringify(next)); } catch {}
      if (!groupId) { setActiveGroupId(g.id); try { localStorage.setItem('ui.activeGroupId', g.id); } catch {} }
      return next;
    });
  }, [activeGroupId]);

  const markDirty = useCallback((name: string, dirty: boolean) => {
    setGroups(currentGroups => {
      const targetId = activeGroupId;
      let idx = currentGroups.findIndex(g => g.id === targetId);
      if (idx === -1) idx = 0;
      
      const g = currentGroups[idx];
      const ng: EditorGroup = { ...g, openFiles: g.openFiles.map(f => (f.name === name ? { ...f, dirty } : f)) };
      const next = currentGroups.slice();
      next[idx] = ng;
      try { localStorage.setItem('ui.groups', JSON.stringify(next)); } catch {}
      return next;
    });
  }, [activeGroupId]);

  const renameActiveFile = useCallback((newName: string) => {
    setGroups(currentGroups => {
      const targetId = activeGroupId;
      const gIdx = currentGroups.findIndex(g => g.id === targetId);
      if (gIdx === -1) return currentGroups;
      
      const g = currentGroups[gIdx];
      const oldName = g.activeFile;
      if (!oldName) return currentGroups;
      
      // Update across all groups where this file is open
      const nextGroups = currentGroups.map(grp => {
        const opened = grp.openFiles.map(f => f.name === oldName ? { ...f, name: newName } : f);
        const active = grp.activeFile === oldName ? newName : grp.activeFile;
        return { ...grp, openFiles: opened, activeFile: active };
      });
      
      // Move cached text under new key
      setFileTexts(prev => {
        if (prev[oldName] == null) return prev;
        const { [oldName]: txt, ...rest } = prev;
        return { ...rest, [newName]: txt };
      });
      
      // Move file handle if present
      const fh = fileHandlesRef.current.get(oldName);
      if (fh) {
        fileHandlesRef.current.delete(oldName);
        fileHandlesRef.current.set(newName, fh);
      }
      
      try { localStorage.setItem('ui.groups', JSON.stringify(nextGroups)); } catch {}
      return nextGroups;
    });
  }, [activeGroupId]);

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

  // Ensure there is always at least one editor group and a valid activeGroupId
  React.useEffect(() => {
    if (!groups || groups.length === 0) {
      persistGroups([{ id: 'g1', openFiles: [], activeFile: undefined }]);
      setActiveGroupId('g1');
      return;
    }
    const exists = groups.some(g => g.id === activeGroupId);
    if (!exists) {
      const first = groups[0]?.id || 'g1';
      setActiveGroupId(first);
      try { localStorage.setItem('ui.activeGroupId', first); } catch {}
    }
  }, [groups, activeGroupId, persistGroups]);

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
  renameActiveFile,
  getFileText: (name: string) => fileTexts[name],
    setFileText: (name: string, text: string) => {
      setFileTexts(prev => {
        if (prev[name] === text) return prev;
        // Mark file as dirty when text changes
        markDirty(name, true);
        return { ...prev, [name]: text };
      });
    },
    cursor: { line: 1, column: 1 },
    languageId: 'plaintext',
    eol: 'LF',
    encoding: 'UTF-8',
    showAbout,
    openAbout: () => setShowAbout(true),
    closeAbout: () => setShowAbout(false),
  }), [activeActivity, showSidebar, showPanel, showSecondarySidebar, activityBarSide, panelPosition, viewLocations, groups, activeGroupId, showAbout, hasFolder, hasWorkspace, activeOpenFiles, activeFile, splitEditorRight, newTab, openFile, closeFile, activateFile, markDirty, renameActiveFile, rootName, fileTree, handleOpenFolder, handleCloseFolder, fileTexts]);

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
