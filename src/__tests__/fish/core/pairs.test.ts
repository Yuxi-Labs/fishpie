import { describe, it, expect } from 'vitest';
import { autoPairDecision } from '@/fish/core/pairs';

describe('autoPairDecision', () => {
  it('pairs brackets when at end of line', () => {
    expect(autoPairDecision('(', undefined).kind).toBe('pair');
    expect(autoPairDecision('[', undefined).kind).toBe('pair');
    expect(autoPairDecision('{', undefined).kind).toBe('pair');
  });

  it('pairs quotes and backticks', () => {
    expect(autoPairDecision('"', undefined).kind).toBe('pair');
    expect(autoPairDecision("'", undefined).kind).toBe('pair');
    expect(autoPairDecision('`', undefined).kind).toBe('pair');
  });

  it('skips over existing closer', () => {
    expect(autoPairDecision(')', ')').kind).toBe('skip');
    expect(autoPairDecision('"', '"').kind).toBe('skip');
  });

  it('does not pair before word chars', () => {
    expect(autoPairDecision('(', 'a').kind).toBe('none');
    expect(autoPairDecision('"', 'x').kind).toBe('none');
  });

  it('html angle bracket only in html', () => {
    expect(autoPairDecision('<', undefined, 'html').kind).toBe('pair');
    expect(autoPairDecision('<', undefined, 'css').kind).toBe('none');
  });
});
