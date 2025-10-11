import type { LanguageProvider } from "./types";
import { plaintext } from "./builtins/plaintext";
import { markdown } from "./builtins/markdown";
import { html } from "./builtins/html";
import { css } from "./builtins/css";
import { javascript } from "./builtins/javascript";
import { typescript } from "./builtins/typescript";
import { story } from "./builtins/story";

const registry = new Map<string, LanguageProvider>();

export function registerLanguage(provider: LanguageProvider) {
  registry.set(provider.id, provider);
}

export function getLanguage(id: string): LanguageProvider | undefined {
  return registry.get(id);
}

// Opportunistically register external providers if available.
// This keeps Fishpie decoupled: we don't hard depend on these packages.
export async function tryLoadExternalLanguage(id: string): Promise<LanguageProvider | undefined> {
  try {
    if (id === "narrative") {
      const di = (s: string) => (eval('import') as (x: string) => Promise<unknown>)(s);
      const mod = (await di("@/fish/language/adapters/narrative")) as { default: LanguageProvider };
      registerLanguage(mod.default);
      return mod.default;
    }
    if (id === "gptp") {
      const di = (s: string) => (eval('import') as (x: string) => Promise<unknown>)(s);
      const mod = (await di("@/fish/language/adapters/gptp")) as { default: LanguageProvider };
      registerLanguage(mod.default);
      return mod.default;
    }
  } catch {
    // Ignore if not installed
    return undefined;
  }
  return undefined;
}

export async function getOrLoadLanguage(id: string): Promise<LanguageProvider | undefined> {
  const existing = getLanguage(id);
  if (existing) return existing;
  return await tryLoadExternalLanguage(id);
}

// Pre-register built-in languages
registerLanguage(plaintext);
registerLanguage(markdown);
registerLanguage(html);
registerLanguage(css);
registerLanguage(javascript);
registerLanguage(typescript);
registerLanguage(story);

export function languageForFilename(filename?: string): string {
  if (!filename) return "plaintext";
  const f = filename.toLowerCase();
  if (f.endsWith(".md")) return "markdown";
  if (f.endsWith(".html") || f.endsWith(".htm")) return "html";
  if (f.endsWith(".css")) return "css";
  if (f.endsWith(".ts")) return "typescript";
  if (f.endsWith(".tsx")) return "typescript";
  if (f.endsWith(".js")) return "javascript";
  if (f.endsWith(".jsx")) return "javascript";
  if (f.endsWith(".story")) return "story";
  if (f.endsWith(".narrative")) return "narrative";
  if (f.endsWith(".gptp")) return "gptp";
  return "plaintext";
}
