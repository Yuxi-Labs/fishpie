import { NextRequest } from "next/server";
import { getOrLoadLanguage } from "@/fish/language/registry";
import type { Position } from "@/fish/language/types";

type LspRequest = {
  action: "complete" | "hover";
  language: string;
  text: string;
  position: Position;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LspRequest;
    const lang = await getOrLoadLanguage(body.language);
    if (!lang) {
      return Response.json({ error: `Language '${body.language}' not available` }, { status: 404 });
    }

    if (body.action === "complete") {
      const items = (await lang.complete?.(body.text, body.position)) ?? [];
      return Response.json({ items });
    }

    if (body.action === "hover") {
      const hover = (await lang.hover?.(body.text, body.position)) ?? null;
      return Response.json({ hover });
    }

    return Response.json({ error: "Unsupported action" }, { status: 400 });
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
}
