"use client";
import Explorer from "@/pie/ui/Explorer";
import { usePieUI } from "@/pie/state/ui";

export function Sidebar({ projectId }: { projectId?: string }) {
  const ui = usePieUI();
  return (
    <div className="p-3 text-sm h-full overflow-auto">
      {!ui.hasWorkspace ? (
        <></>
      ) : (
        <>
          <div className="font-semibold mb-2">Workspace</div>
          <div className="opacity-70 mb-3">{projectId ?? "untitled"}</div>
          <Explorer />
        </>
      )}
    </div>
  );
}
