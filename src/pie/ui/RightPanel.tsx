"use client";
import { useRef, useState } from "react";

export function RightPanel() {
  const [width, setWidth] = useState(360);
  const resizing = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    resizing.current = true;
    startX.current = e.clientX;
    startW.current = width;
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  const onMove = (e: MouseEvent) => {
    if (!resizing.current) return;
    const delta = startX.current - e.clientX; // drag left increases width
    setWidth(Math.max(240, Math.min(640, startW.current + delta)));
  };
  const onUp = () => {
    resizing.current = false;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  };

  return (
    <div className="relative h-full border-l border-black/10 dark:border-white/10 bg-black/[.02] dark:bg-white/[.02] overflow-x-hidden" style={{ width }}>
      <div className="flex items-center gap-2 px-2 text-xs border-b border-black/10 dark:border-white/10">
        {['Problems','Output','Terminal','Log'].map((t) => (
          <button key={t} className="px-2 py-1 hover:bg-black/5 dark:hover:bg-white/10">{t}</button>
        ))}
        <div className="ml-auto px-2 py-1 opacity-70">Alt+` to toggle</div>
      </div>
  <div className="h-[calc(100%-2rem)] overflow-y-auto overflow-x-hidden p-2 text-xs">
        <pre className="opacity-70">No output yet.</pre>
      </div>
      <div className="absolute top-0 left-0 h-full w-[3px] cursor-ew-resize hover:bg-black/10 dark:hover:bg-white/10" onMouseDown={onMouseDown} />
    </div>
  );
}

export default RightPanel;
