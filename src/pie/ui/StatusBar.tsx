"use client";
import { usePieUI } from "@/pie/state/ui";

export function StatusBar({ projectId }: { projectId?: string }) {
  const ui = usePieUI();
  const hasActiveFile = !!ui.activeFile;
  return (
    <div className="flex items-center justify-between px-3 py-1 border-t border-black/10 dark:border-white/10 text-xs bg-black/[.02] dark:bg-white/[.02]">
      {hasActiveFile ? (
        <div className="flex items-center gap-3">
          <span>Ln {ui.cursor.line}, Col {ui.cursor.column}</span>
          <span>{ui.eol}</span>
          <span>{ui.encoding}</span>
          <span>{ui.languageId}</span>
        </div>
      ) : (
        <div />
      )}
      <div className="opacity-70">{projectId ?? "untitled"}</div>
    </div>
  );
}
