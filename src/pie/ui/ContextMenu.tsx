"use client";
import { useEffect, useRef, useState } from 'react';

type ContextMenuItem = 
  | { type: 'item'; label: string; shortcut?: string; onSelect: () => void; disabled?: boolean }
  | { type: 'separator' };

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);
  
  // Adjust position to keep menu within viewport
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    
    let adjustedX = x;
    let adjustedY = y;
    
    if (x + rect.width > vw) {
      adjustedX = vw - rect.width - 8;
    }
    
    if (y + rect.height > vh) {
      adjustedY = vh - rect.height - 8;
    }
    
    if (adjustedX !== x || adjustedY !== y) {
      menuRef.current.style.left = `${adjustedX}px`;
      menuRef.current.style.top = `${adjustedY}px`;
    }
  }, [x, y]);
  
  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[200px] py-1.5 rounded-lg border bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-xl shadow-2xl border-black/[0.08] dark:border-white/[0.08]"
      style={{ left: x, top: y }}
    >
      {items.map((item, idx) => {
        if (item.type === 'separator') {
          return (
            <div key={`sep-${idx}`} className="h-px bg-black/[0.08] dark:bg-white/[0.08] my-1.5 mx-2" />
          );
        }
        
        return (
          <button
            key={idx}
            disabled={item.disabled}
            onClick={() => {
              if (!item.disabled) {
                item.onSelect();
                onClose();
              }
            }}
            className="w-full px-3 py-1.5 flex items-center justify-between text-left text-[13px] hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-75"
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span className="ml-8 text-[11px] font-mono opacity-60">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Provider to manage context menu state globally
export function useContextMenu() {
  const [menu, setMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  
  const showContextMenu = (x: number, y: number, items: ContextMenuItem[]) => {
    setMenu({ x, y, items });
  };
  
  const hideContextMenu = () => {
    setMenu(null);
  };
  
  return { menu, showContextMenu, hideContextMenu };
}
