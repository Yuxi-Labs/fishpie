/**
 * Tokenization logic - manages async syntax highlighting token fetching
 */

import type { Token } from "@/fish/language/types";
import { getOrLoadLanguage } from "@/fish/language/registry";

export type TokenizeRequest = {
  languageId: string;
  text: string;
};

/**
 * Request syntax highlighting tokens for the given text
 * Returns null if language doesn't support tokenization
 */
export async function tokenizeText(
  request: TokenizeRequest
): Promise<Token[] | null> {
  const { languageId, text } = request;

  const language = await getOrLoadLanguage(languageId);
  if (!language || !language.tokenize) {
    return null;
  }

  try {
    const tokens = await language.tokenize(text);
    return tokens;
  } catch (error) {
    console.error("Tokenization failed:", error);
    return null;
  }
}

/**
 * Check if language supports tokenization
 */
export async function supportsTokenization(languageId: string): Promise<boolean> {
  const language = await getOrLoadLanguage(languageId);
  return !!(language && language.tokenize);
}
