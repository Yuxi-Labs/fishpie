"use client";
import { useMemo, useState } from "react";
import type { JSX } from "react";
import { Icon } from "@/pie/icons";
import { usePieUI } from "@/pie/state/ui";

type Node = {
  name: string;
  type: "file" | "folder";
  children?: Node[];
};

const mockTree: Node = {
  name: "workspace",
  type: "folder",
  children: [
    { name: "src", type: "folder", children: [
      { name: "app", type: "folder", children: [ { name: "page.tsx", type: "file" } ] },
      { name: "fish", type: "folder", children: [ { name: "FishEditor.tsx", type: "file" } ] },
      { name: "pie", type: "folder", children: [ { name: "layout", type: "folder", children: [{ name: "PieLayout.tsx", type: "file" }] } ] },
    ]},
    { name: "README.md", type: "file" },
  ],
};

function keyFor(path: string[]) { return path.join("/"); }

export function Explorer() {
  const ui = usePieUI();
  if (!ui.hasWorkspace) return <div className="text-xs opacity-60 px-2 py-1">Open a folder to see files.</div>;
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["workspace","workspace/src","workspace/src/app","workspace/src/pie","workspace/src/pie/layout"]));
  const [selected, setSelected] = useState<string | null>(null);

  const toggle = (k: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  const renderNode = (node: Node, path: string[] = []): JSX.Element => {
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
          onDoubleClick={() => { if (!isFolder) { ui.openFile(node.name); ui.activateFile(node.name); } }}
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

  const tree = useMemo(() => mockTree, []);
  return (
    <div className="text-xs">
      {renderNode(tree)}
    </div>
  );
}

export default Explorer;
