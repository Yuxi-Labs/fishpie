import type { LanguageProvider, Token, CompletionItem, Position } from "../types";

export const plaintext: LanguageProvider = {
  id: "plaintext",
  tokenize(_text: string): Token[] {
    // No special tokens; return empty for plain rendering
    return [];
  },
  complete(_text: string, _position: Position): CompletionItem[] {
    // No completions for plain text
    return [];
  },
  hover(): null {
    // No hover info for plain text
    return null;
  }
};
