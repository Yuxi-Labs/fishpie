"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import logo from "../../../assets/images/fishpie-logo.svg";
import pkg from "../../../package.json" assert { type: "json" };
import { usePieUI } from "@/pie/state/ui";

export default function AboutDialog() {
  const ui = usePieUI();
  const closeRef = useRef<HTMLButtonElement>(null);
  const year = useMemo(() => new Date().getFullYear(), []);
  const appVersion: string = (pkg as { version?: string })?.version ?? "0.1.0";
  const [drag, setDrag] = useState<{dx: number; dy: number}>({ dx: 0, dy: 0 });
  const startRef = useRef<{x: number; y: number; dx: number; dy: number} | null>(null);

  useEffect(() => {
    if (!ui.showAbout) return;
    // Reset position so dialog always originates at center on open
    setDrag({ dx: 0, dy: 0 });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') ui.closeAbout(); };
    document.addEventListener('keydown', onKey);
    // move focus to Close for simple focus management
    closeRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [ui, ui.showAbout]);

  const onMouseDownDrag = (e: React.MouseEvent) => {
    // Ignore drag start when interacting with controls (buttons, inputs, links, etc.)
    const target = e.target as Element | null;
    if (target && target.closest('button, [role="button"], a, input, textarea, select, [contenteditable="true"]')) {
      return;
    }
    startRef.current = { x: e.clientX, y: e.clientY, dx: drag.dx, dy: drag.dy };
    const onMove = (ev: MouseEvent) => {
      if (!startRef.current) return;
      const dx = startRef.current.dx + (ev.clientX - startRef.current.x);
      const dy = startRef.current.dy + (ev.clientY - startRef.current.y);
      setDrag({ dx, dy });
    };
    const onUp = () => {
      startRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  if (!ui.showAbout) return null;
  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/60" onClick={() => ui.closeAbout()} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div
          className="w-full max-w-xl border border-black/20 dark:border-white/20 bg-white dark:bg-neutral-900 shadow-2xl select-none"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${drag.dx}px), calc(-50% + ${drag.dy}px))`,
          }}
          role="dialog"
          aria-modal="true"
          aria-label="About Fishpie"
          onMouseDown={onMouseDownDrag}
        >
          {/* Header area with title and dismiss */}
          <button
            className="absolute right-12 top-6 inline-flex h-8 w-8 items-center justify-center rounded hover:bg-black/5 hover:border hover:border-black/15 dark:hover:bg-white/10 dark:hover:border-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
            onClick={() => ui.closeAbout()}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div className="px-12 pt-6 select-none">
            <div className="flex items-start gap-5">
              <Image src={logo} alt="Fishpie" width={56} height={56} className="h-14 w-auto" />
              <div>
                <div className="text-3xl font-semibold mb-1">Fishpie</div>
                <div className="text-base opacity-70">A modern, web-native integrated development environment.</div>
              </div>
            </div>

            <div className="mt-6 px-6 py-4 border border-black/10 dark:border-white/10 bg-black/[.02] dark:bg-white/[.04]">
              <div className="grid grid-cols-[1fr_auto] gap-y-2 text-sm">
                <div>Application</div><div className="tabular-nums">{appVersion}</div>
              </div>
            </div>

            <div className="mt-6 text-sm opacity-70">
              © {year} William Sawyerr — All rights reserved
            </div>
          </div>

          <div className="px-12 py-4 flex justify-end mt-6">
            <button
              ref={closeRef}
              className="text-sm px-4 py-2 border border-black/15 dark:border-white/15 bg-white text-black dark:bg-neutral-800 dark:text-white shadow-sm hover:bg-white/90 dark:hover:bg-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              onClick={() => ui.closeAbout()}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
