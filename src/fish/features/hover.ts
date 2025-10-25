/**
 * Hover tooltip feature logic - manages hover information requests
 */

import type { Position } from "@/fish/language/types";
import { requestHover } from "@/fish/language/lspClient";
import { getHover } from "@/fish/language/intellisense";

export type HoverRequest = {
  languageId: string;
  text: string;
  position: Position;
};

export type HoverInfo = {
  contents: string;
  range?: {
    start: Position;
    end: Position;
  };
} | null;

/**
 * Request hover information for the given position
 * Tries LSP first, falls back to built-in intellisense
 */
export async function fetchHover(request: HoverRequest): Promise<HoverInfo> {
  const { languageId, text, position } = request;

  // Try LSP first
  let hover = await requestHover(languageId, text, position);

  // If no LSP result, use built-in intellisense
  if (!hover) {
    hover = await getHover(languageId, text, position);
  }

  return hover;
}

/**
 * Default hover delay in milliseconds
 */
export const DEFAULT_HOVER_DELAY = 400;
