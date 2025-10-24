import { describe, it, expect } from 'vitest';
import type { Token } from '@/fish/language/types';
import { markdown } from '@/fish/language/builtins/markdown';
import { javascript } from '@/fish/language/builtins/javascript';
import { html } from '@/fish/language/builtins/html';
import { css } from '@/fish/language/builtins/css';
import { typescript } from '@/fish/language/builtins/typescript';
import { story } from '@/fish/language/builtins/story';
import gptp from '@/fish/language/adapters/gptp';

async function toTokens(m: Token[] | Promise<Token[]>): Promise<Token[]> { return m instanceof Promise ? await m : m; }

describe('language tokenization (builtins)', () => {
  it('markdown highlights headings and inline', async () => {
    const toks = await toTokens(markdown.tokenize!('# Title\nThis has **bold** and `code`.'));
    expect(toks.some((t: Token) => t.type === 'heading')).toBe(true);
    expect(toks.some((t: Token) => t.type === 'inline')).toBe(true);
  });
  it('javascript highlights keywords and strings', async () => {
    const toks = await toTokens(javascript.tokenize!("const s = 'x'; // cmt"));
    expect(toks.some((t: Token) => t.type === 'keyword' && t.text === 'const')).toBe(true);
    expect(toks.some((t: Token) => t.type === 'string')).toBe(true);
    expect(toks.some((t: Token) => t.type === 'comment')).toBe(true);
  });
  it('html highlights tags', async () => {
    const toks = await toTokens(html.tokenize!('<div>ok</div>'));
    expect(toks.some((t: Token) => t.type === 'tag')).toBe(true);
  });
  it('css highlights comments and at-rules', async () => {
    const toks = await toTokens(css.tokenize!('/* hi */\n@media screen { }'));
    expect(toks.some((t: Token) => t.type === 'comment')).toBe(true);
    expect(toks.some((t: Token) => t.type === 'at-rule' && t.text.startsWith('@media'))).toBe(true);
  });
  it('typescript adds type-keywords over js', async () => {
    const toks = await toTokens(typescript.tokenize!('interface X { y: string }'));
    expect(toks.some((t: Token) => t.type === 'type-keyword' && t.text === 'interface')).toBe(true);
  });
  it('story highlights scene/character/dialogue', async () => {
    const toks = await toTokens(story.tokenize!('== Scene ==\nALICE: hi'));
    expect(toks.some((t: Token) => t.type === 'scene')).toBe(true);
    expect(toks.some((t: Token) => t.type === 'character')).toBe(true);
    expect(toks.some((t: Token) => t.type === 'dialogue')).toBe(true);
  });
  it('gptp adapter tokenizes keys and strings', async () => {
    const toks = await toTokens(gptp.tokenize!('"title": "Hello"\n"steps": 1'));
    expect(toks.some((t: Token) => t.type === 'property' && t.text === 'title')).toBe(true);
    expect(toks.some((t: Token) => t.type === 'string')).toBe(true);
  });
});
