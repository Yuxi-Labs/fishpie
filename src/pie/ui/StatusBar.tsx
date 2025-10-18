"use client";
import { usePieUI } from "@/pie/state/ui";
import { languageForFilename } from "@/fish/language/registry";

export function StatusBar({}: { projectId?: string }) {
  const ui = usePieUI();
  const hasActiveFile = !!ui.activeFile;
  const activeName = ui.activeFile || "";
  const langId = activeName ? languageForFilename(activeName) : undefined;
  const friendlyLang = (() => {
    const id = langId || "";
    switch (id) {
      case "plaintext": return "Plain Text";
      case "typescript": return "TypeScript";
      case "javascript": return "JavaScript";
      case "markdown": return "Markdown";
      case "html": return "HTML";
      case "css": return "CSS";
  case "scss": return "SCSS";
  case "story": return "Story";
  case "gptp": return "GPTP";
      default: return id ? id.charAt(0).toUpperCase() + id.slice(1) : "";
    }
  })();
  return (
    <div className="flex items-center justify-between px-3 py-1 border-t border-black/10 dark:border-white/10 text-xs bg-black/[.02] dark:bg-white/[.02]">
      {hasActiveFile ? (
        <div className="flex items-center gap-3">
          <span>Ln {ui.cursor.line}, Col {ui.cursor.column}</span>
          <span>{ui.eol}</span>
          <span>UTF-8</span>
          {friendlyLang ? <span>{friendlyLang}</span> : null}
        </div>
      ) : (
        <div />
      )}
      <div className="opacity-70">{ui.rootName ?? ""}</div>
    </div>
  );
}
