import { describe, it, expect } from 'vitest';
import { languageForFilename, getLanguage, getOrLoadLanguage } from '@/fish/language/registry';

describe('language registry', () => {
  it('maps filenames to language ids', () => {
    expect(languageForFilename(undefined)).toBe('plaintext');
    expect(languageForFilename('README.md')).toBe('markdown');
    expect(languageForFilename('index.html')).toBe('html');
    expect(languageForFilename('styles.css')).toBe('css');
    expect(languageForFilename('main.ts')).toBe('typescript');
    expect(languageForFilename('main.tsx')).toBe('typescript');
    expect(languageForFilename('app.js')).toBe('javascript');
    expect(languageForFilename('app.jsx')).toBe('javascript');
    expect(languageForFilename('story.story')).toBe('story');
    expect(languageForFilename('script.narrative')).toBe('narrative');
    expect(languageForFilename('flow.gptp')).toBe('gptp');
    expect(languageForFilename('unknown.xyz')).toBe('plaintext');
  });

  it('has built-in languages pre-registered', () => {
    for (const id of ['plaintext','markdown','html','css','javascript','typescript','story']) {
      const lang = getLanguage(id);
      expect(lang, `expected built-in ${id} to be registered`).toBeTruthy();
      expect(lang?.id).toBe(id);
    }
  });

  it('loads optional adapters gracefully when requested', async () => {
    const maybeNarrative = await getOrLoadLanguage('narrative');
    if (maybeNarrative) {
      expect(maybeNarrative.id).toBe('narrative');
    } else {
      expect(maybeNarrative).toBeUndefined();
    }

    const maybeGptp = await getOrLoadLanguage('gptp');
    if (maybeGptp) {
      expect(maybeGptp.id).toBe('gptp');
    } else {
      expect(maybeGptp).toBeUndefined();
    }
  });
});
