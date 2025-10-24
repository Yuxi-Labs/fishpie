import type { CompletionItem, Hover, Position } from "./types";

async function postLsp<T>(body: unknown): Promise<T | null> {
  try {
    const res = await fetch("/api/lsp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function requestCompletions(language: string, text: string, position: Position): Promise<CompletionItem[]> {
  const data = await postLsp<{ items?: CompletionItem[] }>({
    action: "complete",
    language,
    text,
    position,
  });
  return data?.items ?? [];
}

export async function requestHover(language: string, text: string, position: Position): Promise<Hover | null> {
  const data = await postLsp<{ hover?: Hover | null }>({
    action: "hover",
    language,
    text,
    position,
  });
  return data?.hover ?? null;
}
