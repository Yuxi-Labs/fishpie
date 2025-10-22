import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { Explorer } from '@/pie/ui/Explorer';
import { PieUIContext, type UIState, type FSNode } from '@/pie/state/ui';

function makeUI(overrides: Partial<UIState>): UIState {
  const noop = () => {};
  const base: UIState = {
    activeActivity: 'explorer',
    setActiveActivity: noop,
    hasWorkspace: false,
    hasFolder: false,
    rootName: null,
    fileTree: null,
    openWorkspace: noop,
    openFolder: noop,
    closeFolder: noop,
    showSidebar: false,
    toggleSidebar: noop,
    showPanel: false,
    togglePanel: noop,
    showSecondarySidebar: false,
    toggleSecondarySidebar: noop,
    activityBarSide: 'left',
    setActivityBarSide: noop as UIState['setActivityBarSide'],
    panelPosition: 'bottom',
    setPanelPosition: noop as UIState['setPanelPosition'],
    viewLocations: { explorer: 'primary', outline: 'secondary' },
    setViewLocation: noop as UIState['setViewLocation'],
    groups: [],
    activeGroupId: 'g1',
    setActiveGroup: noop,
    openFiles: [],
    activeFile: undefined,
    splitEditorRight: noop,
    newTab: noop,
    openFile: noop,
    closeFile: noop,
    activateFile: noop,
    markDirty: noop,
    getFileText: () => undefined,
    cursor: { line: 1, column: 1 },
    languageId: 'plaintext',
    eol: 'LF',
    encoding: 'UTF-8',
    showAbout: false,
    openAbout: noop,
    closeAbout: noop,
  };
  return { ...base, ...overrides };
}

function renderWithUI(uiValue: UIState) {
  const div = document.createElement('div');
  document.body.appendChild(div);
  const root: Root = createRoot(div);
  act(() => {
    root.render(
      <PieUIContext.Provider value={uiValue}>
        <Explorer />
      </PieUIContext.Provider>
    );
  });
  return {
    container: div,
    unmount: () => { root.unmount(); div.remove(); },
  };
}

describe('Explorer (pie/ui)', () => {
  beforeEach(() => {
    // Clean DOM between tests
    document.body.innerHTML = '';
  });

  it('renders open-folder prompt when no folder', () => {
    const openFolder = vi.fn();
    const { container, unmount } = renderWithUI(makeUI({ hasFolder: false, fileTree: null, openFolder }));
  const text = container.textContent || '';
    expect(text).toMatch(/Open a folder/i);
    unmount();
  });

  it('single-click opens a file', () => {
    const openFile = vi.fn();
    const activateFile = vi.fn();
    const tree: FSNode = { name: 'root', path: '', type: 'folder', children: [ { name: 'a.txt', path: 'a.txt', type: 'file' } ] };
    const { container, unmount } = renderWithUI(makeUI({ hasFolder: true, fileTree: tree, rootName: 'root', openFolder: vi.fn(), openFile, activateFile }));
    const fileRow = Array.from(container.querySelectorAll('span')).find(n => n.textContent === 'a.txt') as HTMLElement;
  act(() => { fileRow?.click(); });
    expect(openFile).toHaveBeenCalledWith('a.txt');
    expect(activateFile).toHaveBeenCalledWith('a.txt');
    unmount();
  });
});
