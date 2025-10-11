"use client";
import MenuBar from "@/pie/ui/MenuBar";

export function Toolbar({ projectId }: { projectId?: string }) {
  return (
    <div className="flex items-center justify-start pr-3 pl-0 py-1 border-b border-black/10 dark:border-white/10 bg-black/[.03] dark:bg-white/[.03]">
      <div className="flex items-center gap-3">
        <MenuBar />
      </div>
    </div>
  );
}
