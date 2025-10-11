"use client";
export function Breadcrumbs({ parts }: { parts: string[] }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-xs text-black/70 dark:text-white/70">
      {parts.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="truncate max-w-[12ch]">{p}</span>
          {i < parts.length - 1 ? <span className="opacity-50">/</span> : null}
        </div>
      ))}
    </div>
  );
}
