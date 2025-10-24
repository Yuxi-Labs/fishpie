"use client";
import React, { useMemo, useState } from "react";
import type { JSX } from "react";
import Image from "next/image";
import { Icon } from "@/pie/icons";
import { usePieUI, type FSNode } from "@/pie/state/ui";
import cssSvg from "../../../assets/images/icons/css.svg";
import htmlSvg from "../../../assets/images/icons/html.svg";
import jsSvg from "../../../assets/images/icons/js.svg";
import mdSvg from "../../../assets/images/icons/md.svg";
import scssSvg from "../../../assets/images/icons/scss.svg";
import tsSvg from "../../../assets/images/icons/ts.svg";
import txtSvg from "../../../assets/images/icons/txt.svg";
import gptpSvg from "../../../assets/images/icons/gptp.svg";
import storySvg from "../../../assets/images/icons/story.svg";
import narrativeSvg from "../../../assets/images/icons/narrative.svg";

function keyFor(path: string[]) { return path.join("/"); }

export function Explorer() {
  const ui = usePieUI();
  const rootName = ui.rootName || "Folder";
  const ROOT_KEY = "__root__";
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([ROOT_KEY]));
  const [selected, setSelected] = useState<string | null>(null);
  const [hasKeyboardFocus, setHasKeyboardFocus] = useState(false);

  const toggle = (k: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      const collapsing = next.has(k);
      if (collapsing) next.delete(k); else next.add(k);
      // If collapsing a folder that contains the current selection, move selection to the folder itself
      if (collapsing && selected && (selected === k || selected.startsWith(k + "/"))) {
        setSelected(k);
      }
      return next;
    });
  };

  // Normalize Next/Turbopack asset imports to a URL string
  const assetUrl = (mod: unknown): string | undefined => {
    if (!mod) return undefined;
    if (typeof mod === 'string') return mod;
    if (typeof (mod as { src?: unknown }).src === 'string') return (mod as { src?: string }).src;
    // Handle modules exporting { default: string } or { default: { src: string } }
    const d = (mod as { default?: unknown }).default;
    if (typeof d === 'string') return d;
    if (typeof (d as { src?: unknown })?.src === 'string') return (d as { src: string }).src;
    return undefined;
  };

  const IconImg = ({ src, alt }: { src: string; alt: string }) => (
    <Image src={src} alt={alt} width={16} height={16} unoptimized className="inline-block" />
  );

  const fileIconFor = (filename: string): JSX.Element => {
    const ext = (filename.split(".").pop() || "").toLowerCase();
    if (ext === "css") {
      const url = assetUrl(cssSvg); return url ? <IconImg src={url} alt="CSS" /> : <Icon name="file" size={16} />;
    }
    if (ext === "scss" || ext === "sass") {
      const url = assetUrl(scssSvg); return url ? <IconImg src={url} alt="SCSS" /> : <Icon name="file" size={16} />;
    }
    if (ext === "html" || ext === "htm") {
      const url = assetUrl(htmlSvg); return url ? <IconImg src={url} alt="HTML" /> : <Icon name="file" size={16} />;
    }
    if (ext === "js" || ext === "mjs" || ext === "cjs" || ext === "jsx") {
      const url = assetUrl(jsSvg); return url ? <IconImg src={url} alt="JavaScript" /> : <Icon name="file" size={16} />;
    }
    if (ext === "ts" || ext === "tsx") {
      const url = assetUrl(tsSvg); return url ? <IconImg src={url} alt="TypeScript" /> : <Icon name="file" size={16} />;
    }
    if (ext === "md" || ext === "markdown") {
      const url = assetUrl(mdSvg); return url ? <IconImg src={url} alt="Markdown" /> : <Icon name="file" size={16} />;
    }
    if (ext === "txt") {
      const url = assetUrl(txtSvg); return url ? <IconImg src={url} alt="Text file" /> : <Icon name="file" size={16} />;
    }
    if (ext === "gptp") {
      const url = assetUrl(gptpSvg); return url ? <IconImg src={url} alt="GPT Prompt" /> : <Icon name="file" size={16} />;
    }
    if (ext === "story") {
      const url = assetUrl(storySvg); return url ? <IconImg src={url} alt="Story" /> : <Icon name="file" size={16} />;
    }
    if (ext === "narrative") {
      const url = assetUrl(narrativeSvg); return url ? <IconImg src={url} alt="Narrative" /> : <Icon name="file" size={16} />;
    }
    return <Icon name="file" size={16} />;
  };

  const renderNode = (node: FSNode, path: string[] = []): JSX.Element => {
    const currentPath = [...path, node.name];
    const k = keyFor(currentPath);
    const isFolder = node.type === "folder";
    const isOpen = isFolder && expanded.has(k);
    const isSelected = selected === k;
    
    // Check if this file is dirty in any open editor group
    const isDirty = !isFolder && ui.groups.some(g => 
      g.openFiles.some(f => f.name === node.path && f.dirty)
    );
    
    return (
      <div key={k} className="select-none">
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 ${isSelected ? 'bg-blue-100 dark:bg-blue-900/50' : ''}`}
          onClick={() => {
            setSelected(k);
            if (isFolder) toggle(k);
            else {
              // Single-click selects and opens as before
              ui.openFile(node.path);
              ui.activateFile(node.path);
            }
          }}
          onDoubleClick={() => {
            // Double-click should also open/activate files and toggle folders
            if (isFolder) toggle(k); else { ui.openFile(node.path); ui.activateFile(node.path); }
          }}
          role="treeitem"
          aria-selected={isSelected}
        >
          {isFolder ? (
            <>
              <Icon name={isOpen ? 'chevron-down' : 'chevron-right'} size={14} />
              <Icon name="folder" size={16} />
            </>
          ) : (
            <>
              <span className="inline-flex w-[14px]" />
              {fileIconFor(node.name)}
            </>
          )}
          <span className="truncate flex items-center gap-1">
            {node.name}
            {isDirty && <span className="text-amber-500 text-base leading-none">•</span>}
          </span>
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
  // Flatten currently visible nodes for keyboard navigation
  const visibleList = useMemo(() => {
    const out: Array<{ key: string; node: FSNode; isFolder: boolean }> = [];
    const walk = (n: FSNode, path: string[]) => {
      const k = keyFor([...path, n.name]);
      out.push({ key: k, node: n, isFolder: n.type === 'folder' });
      if (n.type === 'folder') {
        const isRoot = path.length === 0; // top-level folder representing workspace root
        const isOpen = isRoot ? expanded.has(ROOT_KEY) : expanded.has(k);
        if (isOpen && n.children) {
          for (const c of n.children) walk(c, [...path, n.name]);
        }
      }
    };
    if (tree) walk(tree, []);
    return out;
  }, [tree, expanded]);

  const setSelectionAndMaybeOpen = (k: string | null) => {
    setSelected(k);
    const item = visibleList.find(v => v.key === k);
    if (item && !item.isFolder) {
      ui.openFile(item.node.path);
      ui.activateFile(item.node.path);
    }
  };

  return (
    <div
      className="text-xs"
      tabIndex={0}
      onFocus={() => setHasKeyboardFocus(true)}
      onBlur={() => setHasKeyboardFocus(false)}
      onKeyDown={(e) => {
        if (!tree) return;
        const idx = selected ? visibleList.findIndex(v => v.key === selected) : -1;
        const firstKey = visibleList[0]?.key;
        const lastKey = visibleList[visibleList.length - 1]?.key;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIdx = idx < 0 ? 0 : Math.min(visibleList.length - 1, idx + 1);
          setSelectionAndMaybeOpen(visibleList[nextIdx]?.key ?? null);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const nextIdx = idx < 0 ? 0 : Math.max(0, idx - 1);
          setSelectionAndMaybeOpen(visibleList[nextIdx]?.key ?? null);
        } else if (e.key === 'Home') {
          e.preventDefault();
          if (firstKey) setSelectionAndMaybeOpen(firstKey);
        } else if (e.key === 'End') {
          e.preventDefault();
          if (lastKey) setSelectionAndMaybeOpen(lastKey);
        } else if (e.key === 'Enter' || e.key === ' ') {
          // Toggle folders, open files
          e.preventDefault();
          const item = visibleList[idx];
          if (!item) return;
          if (item.isFolder) {
            toggle(item.key);
          } else {
            ui.openFile(item.node.path); ui.activateFile(item.node.path);
          }
        } else if (e.key === 'ArrowRight') {
          const item = visibleList[idx];
          if (item && item.isFolder) {
            e.preventDefault();
            const isOpen = expanded.has(item.key);
            if (!isOpen) toggle(item.key);
          }
        } else if (e.key === 'ArrowLeft') {
          const item = visibleList[idx];
          if (item && item.isFolder) {
            e.preventDefault();
            const isOpen = expanded.has(item.key);
            if (isOpen) toggle(item.key);
          }
        }
      }}
      role="tree"
      aria-label="Explorer"
    >
      {!ui.hasFolder || !tree ? (
        <div className="p-2 space-y-2">
          <div className="text-xs opacity-60">Open a folder to see files.</div>
          <button className="px-2 py-1 rounded border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10" onClick={() => ui.openFolder()}>Open Folder…</button>
        </div>
      ) : (
        <div className="select-none">
          {/* Root header row (distinct) */}
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 font-semibold uppercase text-[0.8rem]`}
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
