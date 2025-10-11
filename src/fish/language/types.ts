export type Position = { line: number; column: number };
export type Range = { start: Position; end: Position };

export type Token = {
  text: string;
  type: string; // e.g., keyword, string, comment
  range: Range;
};

export type CompletionItem = {
  label: string;
  kind?: string;
  insertText?: string;
  detail?: string;
};

export type Hover = {
  contents: string; // markdown or plaintext for now
  range?: Range;
};

export interface LanguageProvider {
  id: string; // e.g., 'gptp', 'narrative', 'typescript'
  // Simple tokenization for syntax highlighting
  tokenize?(text: string): Token[] | Promise<Token[]>;
  // Completion at a given position
  complete?(text: string, position: Position): Promise<CompletionItem[]> | CompletionItem[];
  // Hover info for a position
  hover?(text: string, position: Position): Promise<Hover | null> | Hover | null;
}
