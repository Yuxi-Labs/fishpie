/**
 * Core types for Fish editor
 */

export type CaretPos = { line: number; column: number };

export type Selection = {
  anchor: CaretPos | null;
  caret: CaretPos;
};

export type FileState = {
  doc: import("./document").TextDocument;
  caret: CaretPos;
  anchor: CaretPos | null;
};

export type EditorSizing = {
  textFontSize: number;
  lineNumberFontSize: number;
  lineHeight: number;
  caretWidth: number;
  pad: number;
  gutterExtra: number;
};

export type SnippetStop = {
  start: CaretPos;
  end: CaretPos;
};

export type SnippetSession = {
  stops: SnippetStop[];
  index: number;
};
