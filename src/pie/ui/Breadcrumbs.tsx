"use client";
export function Breadcrumbs({ parts }: { parts: string[] }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-xs text-black/70 dark:text-white/70">
      {parts.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="truncate max-w-[12ch]">{p}</span>
          {i < parts.length - 1 ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-50">
              <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : null}
        </div>
      ))}
    </div>
  );
}
