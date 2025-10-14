"use client";
import { Icon } from "@/pie/icons";
import { usePieUI } from "@/pie/state/ui";

export function ActivityBar() {
  const ui = usePieUI();
  const items = [
    { activity: "explorer" as const, label: "Explorer", icon: "file-tree" as const },
    { activity: "search" as const, label: "Search", icon: "search" as const },
  { activity: "source" as const, label: "Version Control", icon: "git" as const },
  { activity: "run" as const, label: "Terminal", icon: "terminal" as const },
  { activity: "ext" as const, label: "Extensions", icon: "blocks" as const },
  ];
  return (
  <nav className="hidden sm:flex h-full flex-col items-center gap-3 pt-1 pb-3 w-12 border-r border-black/10 dark:border-white/10 bg-black/[.02] dark:bg-white/[.02] text-xs" aria-label="Activity Bar">
      {items.map((it, idx) => {
        const active = ui.activeActivity === it.activity;
        return (
          <button
            key={it.activity}
            className={`relative group inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 ${active ? 'bg-black/10 dark:bg-white/15' : ''}`}
            title={it.label}
            aria-label={it.label}
            onClick={() => {
              if (it.activity === 'explorer') {
                // First icon toggles Explorer + Sidebar visibility
                if (ui.activeActivity === 'explorer' && ui.showSidebar) {
                  ui.toggleSidebar();
                } else {
                  if (!ui.showSidebar) ui.toggleSidebar();
                  ui.setActiveActivity('explorer');
                }
              } else {
                ui.setActiveActivity(it.activity);
              }
            }}
          >
            {active && <span className="absolute left-0 inset-y-0 w-[3px] bg-blue-500 rounded-r" aria-hidden />}
            <Icon name={it.icon} size={24} className="stroke-[1.5]" />
          </button>
        );
      })}
      {/* Settings joins main icons */}
      <button
        className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10"
        title="Settings"
        aria-label="Settings"
      >
        <Icon name="gear" size={28} className="stroke-[1.5]" />
      </button>
    </nav>
  );
}
