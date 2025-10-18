"use client";
import { useMemo, useState } from "react";
import type { JSX } from "react";
import { Icon } from "@/pie/icons";
import { usePieUI, type FSNode } from "@/pie/state/ui";

function keyFor(path: string[]) { return path.join("/"); }

export function Explorer() {
  const ui = usePieUI();
  const rootName = ui.rootName || "Folder";
  const ROOT_KEY = "__root__";
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([ROOT_KEY]));
  const [selected, setSelected] = useState<string | null>(null);

  const toggle = (k: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  const renderNode = (node: FSNode, path: string[] = []): JSX.Element => {
    const currentPath = [...path, node.name];
    const k = keyFor(currentPath);
    const isFolder = node.type === "folder";
    const isOpen = isFolder && expanded.has(k);
    const isSelected = selected === k;
    return (
      <div key={k} className="select-none">
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 ${isSelected ? 'bg-black/5 dark:bg-white/10' : ''}`}
          onClick={() => { if (isFolder) toggle(k); setSelected(k); }}
          onDoubleClick={() => { if (!isFolder) { ui.openFile(node.path); ui.activateFile(node.path); } }}
        >
          {isFolder ? (
            <>
              <Icon name={isOpen ? 'chevron-down' : 'chevron-right'} size={14} />
              <Icon name="folder" size={16} />
            </>
          ) : (
            <>
              <span className="inline-flex w-[14px]" />
              <Icon name="file" size={16} />
            </>
          )}
          <span className="truncate">{node.name}</span>
        </div>
        {isFolder && isOpen && node.children && (
          <div className="ml-4">
            {node.children.map(child => renderNode(child, currentPath))}
          </div>
        )}
      </div>
    );
  };

  const tree = useMemo(() => ui.fileTree, [ui.fileTree]);
  return (
    <div className="text-xs">
      {!ui.hasFolder || !tree ? (
        <div className="p-2 space-y-2">
          <div className="text-xs opacity-60">Open a folder to see files.</div>
          <button className="px-2 py-1 rounded border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10" onClick={() => ui.openFolder()}>Open Folder…</button>
        </div>
      ) : (
        <div className="select-none">
          {/* Root header row (distinct) */}
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 font-semibold uppercase text-[0.8rem]`}
            onClick={() => toggle(ROOT_KEY)}
          >
            <Icon name={expanded.has(ROOT_KEY) ? 'chevron-down' : 'chevron-right'} size={14} />
            <Icon name="folder" size={16} />
            <span className="truncate tracking-wide">{rootName}</span>
          </div>
          {expanded.has(ROOT_KEY) && tree.children?.length ? (
            <div className="ml-4">
              {tree.children.map(child => renderNode(child, [tree.name]))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default Explorer;
