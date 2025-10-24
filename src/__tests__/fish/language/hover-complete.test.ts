import { describe, it, expect } from 'vitest';
import type { Position, CompletionItem, Hover } from '@/fish/language/types';
import { javascript } from '@/fish/language/builtins/javascript';
import { markdown } from '@/fish/language/builtins/markdown';
import { html } from '@/fish/language/builtins/html';
import gptp from '@/fish/language/adapters/gptp';

describe('language hover and completion', () => {
  it('javascript: completion provides keywords and hover identifies keyword', async () => {
    const text = "const a = 1";
    const pos: Position = { line: 0, column: 1 }; // over 'o' in 'const'
    const items: CompletionItem[] = await javascript.complete!(text, pos);
    expect(Array.isArray(items) && items.length > 0).toBe(true);
    expect(items.some((i: CompletionItem) => i.label === 'const')).toBe(true);
    const hv = javascript.hover!(text, pos);
    const h = hv as Hover | null;
    expect(h && h.contents.toLowerCase()).toContain('keyword');
  });

  it('markdown: completion offers headings and hover on heading', () => {
    const text = '# Title';
    const pos: Position = { line: 0, column: 2 };
    const items = markdown.complete!(text, pos) as CompletionItem[];
    expect(items.some((i: CompletionItem) => i.label.startsWith('#'))).toBe(true);
    const hv = markdown.hover!(text, pos) as Hover | null;
    expect(hv && hv.contents.toLowerCase()).toContain('heading');
  });

  it('html: completion suggests tags and hover on tag', async () => {
    const text = '<div>ok</div>';
    const pos: Position = { line: 0, column: 2 }; // inside tag name
    const items = html.complete!(text, pos) as CompletionItem[];
    expect(items.some((i: CompletionItem) => i.label.includes('<div>'))).toBe(true);
    const hv = await html.hover!(text, pos) as Hover | null;
    // Updated to match enhanced hover format that includes "html element" or "container"
    expect(hv && hv.contents.toLowerCase()).toMatch(/html|element|container|tag/);
  });

  it('gptp: completion suggests properties and hover shows property doc', async () => {
    const text = '"title": "Hello"';
    const pos: Position = { line: 0, column: 2 }; // inside key
    const items: CompletionItem[] = await gptp.complete!(text, pos);
    expect(items.some((i: CompletionItem) => i.label === 'title' || i.kind === 'property')).toBe(true);
    const hv = await gptp.hover!(text, pos) as Hover | null;
    // Updated to match gptp hover format that includes "field" or "property"
    expect(hv && hv.contents.toLowerCase()).toMatch(/field|property/);
  });
});
