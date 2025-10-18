"use client";
import { usePieUI } from "@/pie/state/ui";
import { Icon } from "@/pie/icons";

export default function Welcome() {
  const ui = usePieUI();
  const Action = ({ icon, label, onClick }: { icon: 'file' | 'file-plus' | 'folder' | 'gear'; label: string; onClick: () => void }) => (
    <button onClick={onClick} className="flex flex-col items-center gap-2 p-3 rounded hover:bg-black/5 dark:hover:bg-white/10">
      <Icon name={icon} size={28} />
      <div className="text-sm opacity-90">{label}</div>
    </button>
  );

  return (
    <div className="h-full w-full grid place-items-center">
      <div className="text-center px-6 py-6">
  <div className="text-2xl mb-2">Welcome to Fishpie</div>
        <div className="text-sm opacity-70 mb-6">Start by creating a new file, opening a file, or opening a folder.</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          <Action icon="file" label="New File" onClick={() => { ui.openFile("Untitled-1"); }} />
          <Action icon="file-plus" label="Open File" onClick={() => ui.openWorkspace()} />
          <Action icon="folder" label="Open Folder" onClick={() => ui.openFolder()} />
          <Action icon="gear" label="Preferences" onClick={() => ui.setActiveActivity('explorer')} />
        </div>
      </div>
    </div>
  );
}
