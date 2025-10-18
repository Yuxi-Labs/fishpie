import type { LanguageProvider, Token } from "../types";

export const plaintext: LanguageProvider = {
  id: "plaintext",
  tokenize(_text: string): Token[] {
    // No special tokens; return empty for plain rendering
    return [];
  },
};
