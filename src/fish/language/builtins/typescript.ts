import type { LanguageProvider, Token, Position, CompletionItem, Hover } from "../types";
import { javascript } from "./javascript";

const tsTypes = new Set(["interface","type","enum","namespace","abstract","declare","implements","readonly","keyof","infer","is","as","satisfies","override","public","private","protected"]);

const tsTypeDocs = new Map<string, string>([
  ["interface", "Defines a contract for objects - describes the shape an object must have"],
  ["type", "Creates a type alias - gives a new name to a type"],
  ["enum", "Defines a set of named constants"],
  ["namespace", "Groups related code under a single name"],
  ["abstract", "Defines abstract classes or methods that must be implemented"],
  ["declare", "Declares ambient variables or modules"],
  ["implements", "Specifies that a class implements an interface"],
  ["readonly", "Makes a property read-only"],
  ["keyof", "Gets the keys of an object type"],
  ["infer", "Infers a type within conditional types"],
  ["is", "Type predicate for type guards"],
  ["as", "Type assertion - tells the compiler to treat a value as a specific type"],
  ["satisfies", "Validates that a value matches a type without changing its inferred type"],
  ["override", "Explicitly marks a method as overriding a parent method"],
  ["public", "Makes a class member accessible from anywhere"],
  ["private", "Makes a class member accessible only within the class"],
  ["protected", "Makes a class member accessible within the class and subclasses"],
]);

const tsPrimitives = new Set(["string", "number", "boolean", "any", "void", "never", "unknown", "null", "undefined"]);

export const typescript: LanguageProvider = {
  id: "typescript",
  async tokenize(text: string): Promise<Token[]> {
    const baseMaybe = javascript.tokenize?.(text) ?? [];
    const base = baseMaybe instanceof Promise ? await baseMaybe : baseMaybe;
    const tokens: Token[] = [...base];
    const lines = text.split(/\n/);
    for (let line = 0; line < lines.length; line++) {
      const l = lines[line];
      const word = /\b[a-zA-Z_$][\w$]*\b/g;
      let m: RegExpExecArray | null;
      while ((m = word.exec(l))) {
        if (tsTypes.has(m[0])) {
          tokens.push({ text: m[0], type: "type-keyword", range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
        } else if (tsPrimitives.has(m[0])) {
          tokens.push({ text: m[0], type: "primitive-type", range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
        }
      }
    }
    return tokens;
  },
  async complete(_text: string, _pos: Position): Promise<CompletionItem[]> {
    const jsCompletionsMaybe = javascript.complete?.(_text, _pos) ?? [];
    const jsCompletions = jsCompletionsMaybe instanceof Promise ? await jsCompletionsMaybe : jsCompletionsMaybe;
    const tsCompletions: CompletionItem[] = [];
    
    // Add TypeScript-specific keywords
    for (const kw of tsTypes) {
      tsCompletions.push({ 
        label: kw, 
        kind: "type-keyword",
        detail: tsTypeDocs.get(kw) || "TypeScript keyword"
      });
    }
    
    // Add primitive types
    for (const prim of tsPrimitives) {
      tsCompletions.push({ 
        label: prim, 
        kind: "type",
        detail: `TypeScript primitive type: ${prim}`
      });
    }
    
    // Add utility types
    tsCompletions.push(
      { label: "Partial", kind: "type", detail: "Makes all properties optional" },
      { label: "Required", kind: "type", detail: "Makes all properties required" },
      { label: "Readonly", kind: "type", detail: "Makes all properties readonly" },
      { label: "Pick", kind: "type", detail: "Picks a set of properties from a type" },
      { label: "Omit", kind: "type", detail: "Omits a set of properties from a type" },
      { label: "Record", kind: "type", detail: "Constructs an object type with keys and values" },
      { label: "Exclude", kind: "type", detail: "Excludes types from a union" },
      { label: "Extract", kind: "type", detail: "Extracts types from a union" },
      { label: "NonNullable", kind: "type", detail: "Removes null and undefined from a type" },
      { label: "ReturnType", kind: "type", detail: "Gets the return type of a function" },
      { label: "Parameters", kind: "type", detail: "Gets the parameter types of a function" },
      { label: "Promise", kind: "type", detail: "Represents an async operation" },
      { label: "Array", kind: "type", detail: "Array type" },
      { label: "Map", kind: "type", detail: "Map collection type" },
      { label: "Set", kind: "type", detail: "Set collection type" },
    );
    
    return [...tsCompletions, ...jsCompletions];
  },
  async hover(text: string, position: Position): Promise<Hover | null> {
    const baseMaybe = javascript.tokenize?.(text) ?? [];
    const base = baseMaybe instanceof Promise ? await baseMaybe : baseMaybe;
    
    // Check for TypeScript-specific tokens first
    const lines = text.split(/\n/);
    if (position.line < lines.length) {
      const line = lines[position.line];
      const word = /\b[a-zA-Z_$][\w$]*\b/g;
      let m: RegExpExecArray | null;
      while ((m = word.exec(line))) {
        const start = m.index;
        const end = m.index + m[0].length;
        if (position.column >= start && position.column <= end) {
          const text = m[0];
          
          // Check TypeScript keywords
          if (tsTypes.has(text)) {
            const doc = tsTypeDocs.get(text);
            return {
              contents: doc ? `**${text}** (TypeScript keyword)\n\n${doc}` : `**${text}** - TypeScript keyword`,
              range: { start: { line: position.line, column: start }, end: { line: position.line, column: end } }
            };
          }
          
          // Check primitive types
          if (tsPrimitives.has(text)) {
            return {
              contents: `**${text}** - TypeScript primitive type`,
              range: { start: { line: position.line, column: start }, end: { line: position.line, column: end } }
            };
          }
        }
      }
    }
    
    // Fall back to JavaScript hover
    const t = (base as Token[]).find((tk: Token) => tk.range.start.line === position.line && position.column >= tk.range.start.column && position.column <= tk.range.end.column);
    if (t) {
      if (t.type === 'type-keyword') {
        const doc = tsTypeDocs.get(t.text);
        return { 
          contents: doc ? `**${t.text}** (TypeScript keyword)\n\n${doc}` : `**${t.text}** - TypeScript keyword`,
          range: t.range 
        };
      }
      if (t.type === 'keyword') return { contents: `**${t.text}** - JavaScript keyword`, range: t.range };
      return { contents: t.type, range: t.range };
    }
    return null;
  }
};
