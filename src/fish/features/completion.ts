/**
 * Completion feature logic - manages autocomplete requests and results
 */

import type { Position, CompletionItem } from "@/fish/language/types";
import { requestCompletions } from "@/fish/language/lspClient";
import { getContextualCompletions } from "@/fish/language/intellisense";

export type CompletionRequest = {
  languageId: string;
  text: string;
  position: Position;
  force?: boolean;
};

export type CompletionResult = {
  items: CompletionItem[];
  position: Position;
} | null;

/**
 * Request completions for the given position
 * Tries LSP first, falls back to built-in intellisense
 */
export async function fetchCompletions(
  request: CompletionRequest
): Promise<CompletionItem[] | null> {
  const { languageId, text, position, force } = request;

  // Try LSP first
  let items = await requestCompletions(languageId, text, position);

  // If no LSP results or forced, use built-in intellisense
  if ((!items || items.length === 0) || force) {
    const builtinItems = await getContextualCompletions(languageId, text, position);
    items = builtinItems && builtinItems.length > 0 ? builtinItems : items;
  }

  return items && items.length > 0 ? items : null;
}

/**
 * Navigate completion list index
 */
export function navigateCompletions(
  currentIndex: number,
  direction: "up" | "down",
  itemCount: number
): number {
  if (direction === "down") {
    return Math.min(itemCount - 1, currentIndex + 1);
  } else {
    return Math.max(0, currentIndex - 1);
  }
}

/**
 * Check if completion should be triggered for the given text context
 */
export function shouldTriggerCompletion(
  text: string,
  line: number,
  column: number
): boolean {
  const lines = text.split("\n");
  const lineText = lines[line] || "";
  const before = lineText.slice(0, column);

  // Trigger after typing identifier characters
  if (/[a-zA-Z_$]$/.test(before)) return true;

  // Trigger after dot/arrow for member access
  if (/\.$/.test(before) || /->$/.test(before)) return true;

  // Trigger after opening tag bracket in HTML/XML
  if (/<[a-zA-Z]*$/.test(before)) return true;

  return false;
}
