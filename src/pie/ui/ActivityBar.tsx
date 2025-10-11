"use client";
import { Icon } from "@/pie/icons";
import { usePieUI } from "@/pie/state/ui";

export function ActivityBar() {
  const ui = usePieUI();
  const items = [
    { activity: "explorer" as const, label: "Explorer", icon: "folder" as const },
    { activity: "search" as const, label: "Search", icon: "search" as const },
    { activity: "source" as const, label: "Source", icon: "branch" as const },
    { activity: "run" as const, label: "Run", icon: "play" as const },
    { activity: "ext" as const, label: "Ext", icon: "puzzle" as const },
  ];
  return (
    <nav className="hidden sm:flex h-full flex-col items-center gap-3 py-3 w-12 border-r border-black/10 dark:border-white/10 bg-black/[.02] dark:bg-white/[.02] text-xs" aria-label="Activity Bar">
      {items.map((it) => {
        const active = ui.activeActivity === it.activity;
        return (
          <button
            key={it.activity}
            className={`relative group inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 ${active ? 'bg-black/10 dark:bg-white/15' : ''}`}
            title={it.label}
            aria-label={it.label}
            onClick={() => ui.setActiveActivity(it.activity)}
          >
            {active && <span className="absolute left-0 inset-y-0 w-[3px] bg-blue-500 rounded-r" aria-hidden />}
            <Icon name={it.icon} size={18} />
          </button>
        );
      })}
      <div className="mt-auto" />
      <div className="flex flex-col gap-2">
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10"
          title="Toggle Panel"
          aria-label="Toggle Panel"
          onClick={() => ui.togglePanel()}
        >
          <Icon name="play" size={18} />
        </button>
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10"
          title="Settings"
          aria-label="Settings"
        >
          <Icon name="gear" size={18} />
        </button>
      </div>
    </nav>
  );
}
