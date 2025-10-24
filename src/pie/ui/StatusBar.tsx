"use client";
import { usePieUI } from "@/pie/state/ui";
import { languageForFilename } from "@/fish/language/registry";

export function StatusBar({}: { projectId?: string }) {
  const ui = usePieUI();
  const hasActiveFile = !!ui.activeFile;
  const activeName = ui.activeFile || "";
  const langId = activeName ? languageForFilename(activeName) : undefined;
  
  // Map language IDs to display names
  const langDisplayName: Record<string, string> = {
    plaintext: "Plain Text",
    markdown: "Markdown",
    html: "HTML",
    css: "CSS",
    scss: "SCSS",
    javascript: "JavaScript",
    typescript: "TypeScript",
    story: "Story",
    gptp: "GPTP",
    narrative: "Narrative",
  };

  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-t border-black/10 dark:border-white/10 text-xs bg-black/[.02] dark:bg-white/[.02] min-h-[28px]">
      <div className="flex items-center gap-3">
        {hasActiveFile ? (
          <>
            <span>Ln {ui.cursor.line}, Col {ui.cursor.column}</span>
            <span>{ui.eol}</span>
            <span>UTF-8</span>
            {/* Auto-detected language display */}
            <span className="opacity-70">
              {langDisplayName[langId || "plaintext"] || "Plain Text"}
            </span>
          </>
        ) : (
          <span className="opacity-50">No file open</span>
        )}
      </div>
      <div className="flex items-center gap-3 opacity-70">
        <span>Fishpie</span>
      </div>
    </div>
  );
}
