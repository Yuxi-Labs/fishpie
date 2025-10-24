import path from "node:path";
import type { CompletionItem, Hover, Position, Range } from "./types";

let tsModule: typeof import("typescript") | null = null;
const libSnapshotCache = new Map<string, import("typescript").IScriptSnapshot>();

async function loadTs(): Promise<typeof import("typescript")> {
  if (!tsModule) {
    const mod = await import("typescript");
    tsModule = (mod as unknown as { default?: typeof import("typescript") }).default ?? (mod as typeof import("typescript"));
  }
  return tsModule!;
}

type LanguageKey = "typescript" | "javascript";

type ServiceContext = {
  service: import("typescript").LanguageService;
  sourceFile: import("typescript").SourceFile;
  program: import("typescript").Program | undefined;
  dispose: () => void;
};

async function createService(language: LanguageKey, text: string): Promise<{ ctx: ServiceContext; fileName: string } | null> {
  const ts = await loadTs();
  const fileName = language === "typescript" ? "module.tsx" : "module.jsx";
  const scriptKind = language === "typescript" ? ts.ScriptKind.TSX : ts.ScriptKind.JSX;
  const compilerOptions: import("typescript").CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    allowJs: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    jsx: ts.JsxEmit.ReactJSX,
    checkJs: language === "javascript",
    skipLibCheck: true,
    lib: ["lib.es2022.d.ts", "lib.dom.d.ts"],
  };

  const defaultLibPath = ts.getDefaultLibFilePath(compilerOptions);
  const libDir = path.dirname(defaultLibPath);
  const additionalLibs = (compilerOptions.lib ?? []).map(libName => path.join(libDir, libName));
  const scriptFiles = new Set<string>([fileName, defaultLibPath, ...additionalLibs]);
  const useCaseSensitive = Boolean(ts.sys.useCaseSensitiveFileNames);

  const resolveSnapshotPath = (name: string): string | null => {
    const normalize = (value: string) => (useCaseSensitive ? value : value.toLowerCase());
    const normalizedName = normalize(name);
    for (const candidate of scriptFiles) {
      if (normalize(candidate) === normalizedName) return candidate;
    }
    const tryPaths: string[] = [name];
    if (libDir) {
      tryPaths.push(path.join(libDir, name));
    }
    for (const candidate of tryPaths) {
      const resolved = ts.sys.resolvePath ? ts.sys.resolvePath(candidate) : candidate;
      if (ts.sys.fileExists(resolved)) {
        scriptFiles.add(resolved);
        return resolved;
      }
    }
    return null;
  };

  const host: import("typescript").LanguageServiceHost = {
    getCompilationSettings: () => compilerOptions,
    getScriptFileNames: () => Array.from(scriptFiles),
    getScriptVersion: () => "1",
    getCurrentDirectory: () => ts.sys.getCurrentDirectory?.() ?? "",
    getDefaultLibFileName: opts => ts.getDefaultLibFilePath(opts),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
    useCaseSensitiveFileNames: () => useCaseSensitive,
    getScriptSnapshot: (name: string) => {
      if (name === fileName) {
        return ts.ScriptSnapshot.fromString(text);
      }
      const resolved = resolveSnapshotPath(name);
      if (!resolved) return undefined;
      if (resolved === fileName) {
        return ts.ScriptSnapshot.fromString(text);
      }
      let snap = libSnapshotCache.get(resolved);
      if (!snap) {
        const content = ts.sys.readFile(resolved);
        if (!content) return undefined;
        snap = ts.ScriptSnapshot.fromString(content);
        libSnapshotCache.set(resolved, snap);
      }
      return snap;
    },
  };

  const service = ts.createLanguageService(host, ts.createDocumentRegistry());
  const sourceFile = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, scriptKind);
  const program = service.getProgram();
  return {
    ctx: {
      service,
      sourceFile,
      program,
      dispose: () => service.dispose(),
    },
    fileName,
  };
}

function toOffset(ts: typeof import("typescript"), source: import("typescript").SourceFile, pos: Position): number {
  const offset = source.getPositionOfLineAndCharacter(pos.line, pos.column);
  return offset;
}

function spanToRange(ts: typeof import("typescript"), source: import("typescript").SourceFile, start: number, length: number): Range {
  const begin = source.getLineAndCharacterOfPosition(start);
  const end = source.getLineAndCharacterOfPosition(start + length);
  return {
    start: { line: begin.line, column: begin.character },
    end: { line: end.line, column: end.character },
  };
}

function buildDetail(ts: typeof import("typescript"), info?: import("typescript").CompletionEntryDetails | null): string | undefined {
  if (!info) return undefined;
  const parts = [
    ts.displayPartsToString(info.displayParts ?? []),
    ts.displayPartsToString(info.documentation ?? []),
  ].filter(Boolean);
  if ((info.tags?.length ?? 0) > 0) {
    const tags = info.tags!
      .map(tag => `@${tag.name}${tag.text ? " " + ts.displayPartsToString(tag.text) : ""}`)
      .filter(Boolean)
      .join("\n");
    if (tags) parts.push(tags);
  }
  return parts.join("\n\n").trim() || undefined;
}

export async function tsLikeCompletions(language: LanguageKey, text: string, position: Position): Promise<CompletionItem[]> {
  const svc = await createService(language, text);
  if (!svc) return [];
  const ts = await loadTs();
  const { service, sourceFile, dispose } = svc.ctx;
  const { fileName } = svc;
  try {
    const offset = toOffset(ts, sourceFile, position);
    const completions = service.getCompletionsAtPosition(fileName, offset, {
      includeCompletionsForModuleExports: true,
      includeCompletionsWithInsertText: true,
      triggerCharacter: undefined,
    });
    if (!completions) return [];
    return completions.entries.slice(0, 60).map(entry => {
      const details = service.getCompletionEntryDetails(
        fileName,
        offset,
        entry.name,
        undefined,
        entry.source,
        undefined,
        undefined,
      );
      return {
        label: entry.name,
        kind: entry.kind,
        insertText: entry.insertText ?? entry.name,
        detail: buildDetail(ts, details) ?? entry.kind,
      } satisfies CompletionItem;
    });
  } finally {
    dispose();
  }
}

export async function tsLikeHover(language: LanguageKey, text: string, position: Position): Promise<Hover | null> {
  const svc = await createService(language, text);
  if (!svc) return null;
  const ts = await loadTs();
  const { service, sourceFile, dispose } = svc.ctx;
  const { fileName } = svc;
  try {
    const offset = toOffset(ts, sourceFile, position);
    const info = service.getQuickInfoAtPosition(fileName, offset);
    if (!info) return null;
    const display = ts.displayPartsToString(info.displayParts ?? []);
    const doc = ts.displayPartsToString(info.documentation ?? []);
    const tags = (info.tags ?? [])
      .map(tag => `@${tag.name}${tag.text ? " " + ts.displayPartsToString(tag.text) : ""}`)
      .filter(Boolean)
      .join("\n");
    const body = [display, doc, tags].filter(Boolean).join("\n\n");
    const range = spanToRange(ts, sourceFile, info.textSpan.start, info.textSpan.length);
    return { contents: body || display, range };
  } finally {
    dispose();
  }
}
