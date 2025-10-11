import React from 'react';
import type { JSX } from 'react';

export type IconName = 'folder' | 'file' | 'file-plus' | 'search' | 'branch' | 'play' | 'puzzle' | 'chevron-right' | 'chevron-down' | 'gear';

type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
  title?: string;
};

const svgProps = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
});

function FolderIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg {...svgProps(size, className)} aria-hidden>
      <path d="M3 7h6l2 2h10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
      <path d="M21 9H11L9 7H3" />
    </svg>
  );
}

function SearchIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg {...svgProps(size, className)} aria-hidden>
      <circle cx="11" cy="11" r="6" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </svg>
  );
}

function BranchIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg {...svgProps(size, className)} aria-hidden>
      <circle cx="6" cy="5" r="2" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="12" r="2" />
      <path d="M8 5h4a4 4 0 0 1 4 4v0" />
      <path d="M8 19h4a4 4 0 0 0 4-4v0" />
      <line x1="6" y1="7" x2="6" y2="17" />
    </svg>
  );
}

function PlayIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg {...svgProps(size, className)} aria-hidden>
      <polygon points="7,5 19,12 7,19" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PuzzleIcon({ size = 20, className }: { size?: number; className?: string }) {
  // Simple jigsaw-like silhouette
  return (
    <svg {...svgProps(size, className)} aria-hidden>
      <path d="M6 3h4a2 2 0 1 1 0 4h4v4a2 2 0 1 1 4 0v4h-4a2 2 0 1 1-4 0H6V7h2a2 2 0 1 0 0-4H6z" />
    </svg>
  );
}

function ChevronRightIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg {...svgProps(size, className)} aria-hidden>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function ChevronDownIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg {...svgProps(size, className)} aria-hidden>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function FileIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg {...svgProps(size, className)} aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function FilePlusIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg {...svgProps(size, className)} aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="12" x2="12" y2="18" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  );
}

function GearIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg {...svgProps(size, className)} aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 9 3.09V3a2 2 0 1 1 4 0v.09c0 .65.38 1.24.97 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0c.27.59.86.97 1.51.97H21a2 2 0 1 1 0 4h-.09c-.65 0-1.24.38-1.51.97z" />
    </svg>
  );
}

const registry: Record<IconName, (p: { size?: number; className?: string }) => JSX.Element> = {
  folder: (p) => <FolderIcon {...p} />,
  file: (p) => <FileIcon {...p} />,
  'file-plus': (p) => <FilePlusIcon {...p} />,
  search: (p) => <SearchIcon {...p} />,
  branch: (p) => <BranchIcon {...p} />,
  play: (p) => <PlayIcon {...p} />,
  puzzle: (p) => <PuzzleIcon {...p} />,
  'chevron-right': (p) => <ChevronRightIcon {...p} />,
  'chevron-down': (p) => <ChevronDownIcon {...p} />,
  'gear': (p) => <GearIcon {...p} />,
};

export function Icon({ name, size = 20, className, title }: IconProps) {
  const Comp = registry[name];
  return (
    <span role="img" aria-label={title} title={title} className="inline-flex items-center justify-center">
      {Comp({ size, className })}
    </span>
  );
}

export { FolderIcon, FileIcon, FilePlusIcon, SearchIcon, BranchIcon, PlayIcon, PuzzleIcon, ChevronRightIcon, ChevronDownIcon, GearIcon };
