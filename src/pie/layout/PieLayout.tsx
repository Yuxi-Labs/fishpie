"use client";
import React, { type PropsWithChildren } from "react";
import Image from "next/image";
import logo from "../../../assets/images/fishpie-logo.svg";
import { Sidebar } from "@/pie/ui/Sidebar";
import Outline from "@/pie/ui/Outline";
import { Toolbar } from "@/pie/ui/Toolbar";
import { StatusBar } from "@/pie/ui/StatusBar";
import { ActivityBar } from "@/pie/ui/ActivityBar";
import { EditorTabs } from "@/pie/ui/EditorTabs";
import { Breadcrumbs } from "@/pie/ui/Breadcrumbs";
import { BottomPanel } from "@/pie/ui/BottomPanel";
import RightPanel from "@/pie/ui/RightPanel";
import { Icon } from "@/pie/icons";
import { PieUIProvider, usePieUI } from "@/pie/state/ui";
import CommandPalette from "@/pie/ui/CommandPalette";
import Welcome from "@/pie/ui/Welcome";
import AboutDialog from "@/pie/ui/AboutDialog";

export type PieLayoutProps = PropsWithChildren<{
  projectId?: string;
}>;

function Chrome({ children, projectId }: PieLayoutProps) {
  const ui = usePieUI();
  const activityLeft = ui.activityBarSide === 'left';
  const inWelcome = !ui.hasWorkspace;
  const hasSecondary = ui.showSecondarySidebar;
  const hasRightPanel = ui.showPanel && ui.panelPosition === 'right';
  // const activeGroup = ui.groups.find(g => g.id === ui.activeGroupId) ?? ui.groups[0];
  // const hasTabs = !inWelcome && !!(activeGroup && activeGroup.openFiles.length > 0);

  // Build ordered slots left->right according to spec
  const slots: string[] = [];
  if (activityLeft) slots.push('activity');
  if (ui.showSidebar) slots.push('primary');
  slots.push('editor');
  if (hasSecondary) slots.push('secondary');
  if (hasRightPanel) slots.push('panelRight');
  if (!activityLeft) slots.push('activity');

  const colWidths = slots.map((s) => {
    switch (s) {
      case 'activity': return 'auto';
      case 'primary': return '240px';
      case 'secondary': return '240px';
      case 'panelRight': return 'auto';
      case 'editor':
      default: return '1fr';
    }
  }).join(' ');

  const idx = (s: string) => slots.indexOf(s) + 1; // 1-based for CSS grid

  function TopLeftBrand() {
    return (
      <div className="h-full border-b border-black/10 dark:border-white/10 bg-black/[.03] dark:bg-white/[.03] flex items-center justify-center px-2">
        <Image src={logo} alt="Fishpie" height={20} className="w-auto max-h-full opacity-80" />
      </div>
    );
  }

  return (
    <>
  <div className="fixed inset-0 grid grid-rows-[auto_1fr_auto] overflow-hidden" style={{ gridTemplateColumns: colWidths }}>
      {/* Toolbar spans across content area (excluding ActivityBar on desktop) */}
      <div className="row-start-1 col-start-1 col-span-3 sm:col-start-2 sm:col-span-2">
        <Toolbar projectId={projectId} />
      </div>

      {/* Top-left brand/seam area (extends toolbar bottom border and activity bar right border) */}
      <div className={`row-start-1 hidden sm:block col-start-[${idx('activity')}]`}>
        <TopLeftBrand />
      </div>

      {/* Activity bar (desktop left) without interior header line */}
      <div className={`row-start-2 hidden sm:block col-start-[${idx('activity')}] min-h-0`}>
        <ActivityBar />
      </div>

      {/* Sidebar */}
      {ui.showSidebar && (
        <aside className={`row-start-2 hidden sm:block col-start-[${idx('primary')}] border-r border-black/10 dark:border-white/10 min-h-0`}>
          <div className="h-12 flex items-center px-2 text-xs border-b border-black/10 dark:border-white/10"><span className="text-black/[.35] dark:text-white/80">Explorer</span></div>
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto">
              {ui.viewLocations.explorer === 'primary' ? <Sidebar projectId={projectId} /> : null}
              {ui.viewLocations.outline === 'primary' ? <Outline /> : null}
            </div>
          </div>
        </aside>
      )}

      {/* Editor groups area */}
  <section className={`row-start-2 col-start-[${idx('editor')}] grid min-h-0 min-w-0 overflow-x-hidden grid-rows-[1fr_auto]`}>
        {/* Editor columns */}
        {inWelcome ? (
          <Welcome />
        ) : (
  <div className="grid min-h-0 min-w-0" style={{ gridTemplateColumns: `repeat(${ui.groups.length || 1}, minmax(0, 1fr))` }}>
          {ui.groups.map((g) => {
            const isActive = ui.activeGroupId === g.id;
            const activeName = g.activeFile;
            const hasFiles = g.openFiles.length > 0;
            return (
              <div key={g.id} className={`min-w-0 border-r last:border-r-0 border-black/10 dark:border-white/10 grid min-h-0 ${hasFiles && activeName ? 'grid-rows-[auto_auto_1fr]' : hasFiles ? 'grid-rows-[auto_1fr]' : 'grid-rows-[1fr]'}`}>
                {hasFiles && (
                  <div className="min-w-0">
                    <EditorTabs group={g} isActive={isActive} />
                  </div>
                )}
                {hasFiles && activeName && (
                  <div className="min-w-0 border-b border-black/10 dark:border-white/10">
                    {(() => {
                      const parts = (activeName || '').split('/').filter(Boolean);
                      const trail = [ui.rootName || "Folder", ...parts];
                      return <Breadcrumbs parts={trail} />;
                    })()}
                  </div>
                )}
                {/* Editor content */}
                {hasFiles && activeName ? (
                  <main className="min-h-0 overflow-hidden" onMouseDown={() => ui.setActiveGroup(g.id)}>
                    {React.isValidElement(children)
                      ? React.cloneElement(children as React.ReactElement<{ active?: boolean; filename?: string; initialText?: string; onTextChange?: (name: string, text: string) => void }>, { active: isActive, filename: activeName, initialText: ui.getFileText?.(activeName), onTextChange: (name: string, text: string) => ui.setFileText(name, text) })
                      : children}
                  </main>
                ) : (
                  <div className="min-h-0 flex items-center justify-center">
                    {!hasFiles && <Welcome />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}
        {ui.showPanel && ui.panelPosition === 'bottom' ? <BottomPanel /> : null}
      </section>

      {hasSecondary && (
        <aside className={`row-start-2 hidden sm:block col-start-[${idx('secondary')}] border-l border-black/10 dark:border-white/10 min-h-0`}>
          <div className="h-12 flex items-center px-2 text-xs opacity-70 border-b border-black/10 dark:border-white/10">Secondary</div>
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto">
              {ui.viewLocations.explorer === 'secondary' ? <Sidebar projectId={projectId} /> : null}
              {ui.viewLocations.outline === 'secondary' ? <Outline /> : null}
            </div>
          </div>
        </aside>
      )}

      {ui.showPanel && ui.panelPosition === 'right' && (
        <div className={`row-start-2 hidden sm:block col-start-[${idx('panelRight')}] min-h-0`}>
          <RightPanel />
        </div>
      )}

      {/* Status bar spans full width */}
      <div className="row-start-3 col-span-full">
        <StatusBar projectId={projectId} />
      </div>

      {/* Mobile bottom nav (ActivityBar substitute) */}
      <div className="fixed bottom-6 inset-x-0 sm:hidden flex justify-center pointer-events-none">
        <div className="pointer-events-auto inline-flex gap-3 rounded-2xl bg-black/5 dark:bg-white/10 backdrop-blur px-4 py-2 border border-black/10 dark:border-white/10 text-xs">
          {(['explorer','search','source','run','ext'] as const).map((activity, i) => {
            const iconMap = {
              explorer: 'folder',
              search: 'search',
              source: 'branch',
              run: 'play',
              ext: 'puzzle',
            } as const;
            return (
              <button key={i} className="h-9 w-9 rounded-md hover:bg-black/10 dark:hover:bg-white/20" aria-label={activity} onClick={() => ui.setActiveActivity(activity)}>
                <Icon name={iconMap[activity]} size={18} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
    <CommandPalette />
    <AboutDialog />
    </>
  );
}

export function PieLayout(props: PieLayoutProps) {
  return (
    <PieUIProvider>
      <Chrome {...props} />
    </PieUIProvider>
  );
}
