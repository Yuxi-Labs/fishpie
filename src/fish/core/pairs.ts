export type PairDecision =
  | { kind: 'pair'; close: string }
  | { kind: 'skip' }
  | { kind: 'none' };

const PAIRS: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
  '"': '"',
  "'": "'",
  '`': '`',
};

export function autoPairDecision(ch: string, nextChar?: string, languageId?: string): PairDecision {
  // HTML angle bracket pairing only in html context
  if (ch === '<') {
    if (languageId === 'html') {
      // If nextChar is '>', we might be typing inside a tag; pair anyway only when at whitespace or end
      if (!nextChar || /\s/.test(nextChar)) return { kind: 'pair', close: '>' };
    }
    return { kind: 'none' };
  }

  // Symmetric quotes: treat as opener unless next char matches (then skip)
  if (ch === '"' || ch === "'" || ch === '`') {
    if (nextChar === ch) return { kind: 'skip' };
    if (nextChar && /[A-Za-z0-9_]/.test(nextChar)) return { kind: 'none' };
    return { kind: 'pair', close: ch };
  }

  // Non-symmetric structural closers: if user types a closer and it's already next, skip
  const structuralClosers = new Set([')', ']', '}']);
  if (structuralClosers.has(ch)) {
    if (nextChar === ch) return { kind: 'skip' };
    return { kind: 'none' };
  }

  const close = PAIRS[ch];
  if (!close) return { kind: 'none' };

  // Pair when at end-of-line or before whitespace or before non-word char
  if (!nextChar || /\s/.test(nextChar) || /[^A-Za-z0-9_]/.test(nextChar)) {
    return { kind: 'pair', close };
  }
  return { kind: 'none' };
}
