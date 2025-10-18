"use client";
import Explorer from "@/pie/ui/Explorer";
import { usePieUI } from "@/pie/state/ui";

export function Sidebar({}: { projectId?: string }) {
  usePieUI();
  return (
    <div className="p-3 text-sm h-full overflow-auto">
      <Explorer />
    </div>
  );
}
