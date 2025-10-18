"use client";
import { useRef, useState } from "react";

export function BottomPanel() {
  const [height, setHeight] = useState(160);
  const resizing = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    resizing.current = true;
    startY.current = e.clientY;
    startH.current = height;
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  const onMove = (e: MouseEvent) => {
    if (!resizing.current) return;
    const delta = startY.current - e.clientY; // drag up increases height
    setHeight(Math.max(80, Math.min(400, startH.current + delta)));
  };
  const onUp = () => {
    resizing.current = false;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  };

  return (
    <div className="w-full border-t border-black/10 dark:border-white/10 bg-black/[.02] dark:bg-white/[.02] overflow-x-hidden" style={{ height }}>
      <div className="flex items-center gap-2 px-2 text-xs border-b border-black/10 dark:border-white/10">
        {['Problems','Output','Terminal','Log'].map((t) => (
          <button key={t} className="px-2 py-1 hover:bg-black/5 dark:hover:bg-white/10">{t}</button>
        ))}
        <div className="ml-auto px-2 py-1 opacity-70">Alt+` to toggle</div>
      </div>
  <div className="h-[calc(100%-2rem)] overflow-y-auto overflow-x-hidden p-2 text-xs">
        <pre className="opacity-70">No output yet.</pre>
      </div>
      <div className="h-2 cursor-ns-resize hover:bg-black/10 dark:hover:bg-white/10" onMouseDown={onMouseDown} />
    </div>
  );
}
