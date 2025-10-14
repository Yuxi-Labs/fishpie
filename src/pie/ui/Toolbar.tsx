"use client";
import MenuBar from "@/pie/ui/MenuBar";
import { usePieUI } from "@/pie/state/ui";

export function Toolbar({ projectId }: { projectId?: string }) {
  const ui = usePieUI();
  return (
    <div className="flex items-center justify-between pr-2 pl-0 h-12 border-b border-black/10 dark:border-white/10 bg-black/[.03] dark:bg-white/[.03]">
      <div className="flex items-center gap-3 pl-0">
        <MenuBar />
      </div>
      <div className="flex items-center gap-1.5 pr-0.5">
        {/* Editor controls on the right */}
        <button title="Split Editor Right" className="h-8 w-8 rounded-md hover:bg-black/5 dark:hover:bg-white/10" onClick={() => ui.splitEditorRight()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M12 3v18" />
          </svg>
        </button>
        <button title="Toggle Primary Sidebar" className="h-8 w-8 rounded-md hover:bg-black/5 dark:hover:bg-white/10" onClick={() => ui.toggleSidebar()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <defs>
              <clipPath id="clip-primary">
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </clipPath>
            </defs>
            {/* shaded left region, inset 1px to respect rounded corners */}
            <g clipPath="url(#clip-primary)">
              {/* inset horizontally by 1px to match bottom icon styling */}
              <rect x="4" y="4" width="4" height="16" fill="#fff" />
              {/* subtle inner stroke to separate the shaded band visually */}
              <rect x="4.5" y="4.5" width="3" height="15" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.12" />
              {/* divider: 1px filled rect placed immediately to the right of the shaded band, inset vertically */}
              <rect x="8" y="4" width="1" height="16" fill="currentColor" />
            </g>
            {/* outline on top */}
            <rect width="18" height="18" x="3" y="3" rx="2" />
          </svg>
        </button>
        <button title="Toggle Bottom Panel" className="h-8 w-8 rounded-md hover:bg-black/5 dark:hover:bg-white/10" onClick={() => ui.togglePanel()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <defs>
              <clipPath id="clip-bottom">
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </clipPath>
            </defs>
            <g clipPath="url(#clip-bottom)">
              {/* shaded bottom region, inset 1px horizontally to respect rounded corners */}
              <rect x="4" y="17" width="16" height="4" fill="#fff" />
              {/* subtle inner stroke to separate the shaded band visually */}
              <rect x="4.5" y="17.5" width="15" height="3" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.12" />
              {/* divider: 1px filled rect placed immediately above the shaded band, inset horizontally */}
              <rect x="4" y="17" width="16" height="1" fill="currentColor" />
            </g>
            {/* outline on top */}
            <rect width="18" height="18" x="3" y="3" rx="2" />
          </svg>
        </button>
        <button title="Toggle Secondary Sidebar" className="h-8 w-8 rounded-md hover:bg-black/5 dark:hover:bg-white/10" onClick={() => ui.toggleSecondarySidebar()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <defs>
              <clipPath id="clip-secondary">
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </clipPath>
            </defs>
            <g clipPath="url(#clip-secondary)">
              {/* inset horizontally by 1px to match bottom icon styling */}
              <rect x="16" y="4" width="4" height="16" fill="#fff" />
              {/* subtle inner stroke to separate the shaded band visually */}
              <rect x="16.5" y="4.5" width="3" height="15" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.12" />
              {/* divider: 1px filled rect placed immediately to the left of the shaded band, inset vertically */}
              <rect x="15" y="4" width="1" height="16" fill="currentColor" />
            </g>
            {/* outline on top */}
            <rect width="18" height="18" x="3" y="3" rx="2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
