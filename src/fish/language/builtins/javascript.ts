import type { LanguageProvider, Token, Position, CompletionItem, Hover } from "../types";

const jsKeywords = new Set([
  "break","case","catch","class","const","continue","debugger","default","delete","do","else","export","extends","finally","for","function","if","import","in","instanceof","let","new","return","super","switch","this","throw","try","typeof","var","void","while","with","yield","async","await"
]);

const jsGlobalObjects = new Set([
  "Array", "Object", "String", "Number", "Boolean", "Date", "Math", "RegExp", "Error",
  "Promise", "Set", "Map", "WeakSet", "WeakMap", "Symbol", "Proxy", "Reflect",
  "JSON", "console", "window", "document", "navigator", "location", "history"
]);

const jsBuiltinMethods = new Map<string, string>([
  ["map", "Creates a new array with the results of calling a function for every array element"],
  ["filter", "Creates a new array with all elements that pass the test"],
  ["reduce", "Executes a reducer function for array element"],
  ["forEach", "Executes a provided function once for each array element"],
  ["find", "Returns the value of the first element that passes a test"],
  ["some", "Checks if any array elements pass a test"],
  ["every", "Checks if all array elements pass a test"],
  ["includes", "Determines whether an array includes a certain value"],
  ["push", "Adds new elements to the end of an array"],
  ["pop", "Removes the last element from an array"],
  ["shift", "Removes the first element from an array"],
  ["unshift", "Adds new elements to the beginning of an array"],
  ["slice", "Returns selected elements in an array, as a new array"],
  ["splice", "Adds/removes elements from an array"],
  ["join", "Joins all elements of an array into a string"],
  ["sort", "Sorts the elements of an array"],
  ["reverse", "Reverses the order of the elements in an array"],
  ["indexOf", "Returns the first index at which a given element can be found"],
  ["length", "Returns the number of elements in an array or string"],
  ["toString", "Returns a string representing the object"],
  ["log", "Outputs a message to the console"],
  ["error", "Outputs an error message to the console"],
  ["warn", "Outputs a warning message to the console"],
]);

const keywordDocs = new Map<string, string>([
  ["const", "Declares a block-scoped, read-only named constant"],
  ["let", "Declares a block-scoped local variable"],
  ["var", "Declares a function-scoped or globally-scoped variable"],
  ["function", "Declares a function"],
  ["class", "Declares a class"],
  ["if", "Executes a statement if a specified condition is truthy"],
  ["else", "Executes a statement if the condition is falsy"],
  ["for", "Creates a loop"],
  ["while", "Creates a loop that executes while a condition is true"],
  ["return", "Ends function execution and specifies a value to be returned"],
  ["async", "Declares an async function"],
  ["await", "Waits for a Promise"],
  ["try", "Marks a block of statements to try"],
  ["catch", "Handles an exception"],
  ["throw", "Throws a user-defined exception"],
  ["new", "Creates an instance of an object"],
  ["this", "Refers to the object it belongs to"],
  ["import", "Imports bindings from another module"],
  ["export", "Exports functions, objects or primitives"],
]);

export const javascript: LanguageProvider = {
  id: "javascript",
  tokenize(text: string): Token[] {
    const tokens: Token[] = [];
    const lines = text.split(/\n/);
    for (let line = 0; line < lines.length; line++) {
      const l = lines[line];
      // comments
      const commentIdx = l.indexOf("//");
      if (commentIdx >= 0) {
        tokens.push({ text: l.slice(commentIdx), type: "comment", range: { start: { line, column: commentIdx }, end: { line, column: l.length } } });
      }
      // block comments (single-line scope)
      let m: RegExpExecArray | null;
      const block = /\/\*.*?\*\//g;
      while ((m = block.exec(l))) {
        tokens.push({ text: m[0], type: "comment", range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
      }
      // strings (very naive)
      const stringRegex = /(["'`])(?:\\.|(?!\1).)*\1/g;
      while ((m = stringRegex.exec(l))) {
        tokens.push({ text: m[0], type: "string", range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
      }
      // regex literals (simple heuristic: /.../ with flags)
      const regexRe = /\/(?:\\.|[^\/\n])+\/[gimsuy]*/g;
      while ((m = regexRe.exec(l))) {
        tokens.push({ text: m[0], type: "regex", range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
      }
      // numbers
      const numberRegex = /\b\d+\.?\d*\b/g;
      while ((m = numberRegex.exec(l))) {
        tokens.push({ text: m[0], type: "number", range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
      }
      // keywords and identifiers
      const word = /\b[a-zA-Z_$][\w$]*\b/g;
      while ((m = word.exec(l))) {
        if (jsKeywords.has(m[0])) {
          tokens.push({ text: m[0], type: "keyword", range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
        } else if (jsGlobalObjects.has(m[0])) {
          tokens.push({ text: m[0], type: "global", range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
        } else {
          tokens.push({ text: m[0], type: "identifier", range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
        }
      }
      // function and class declarations
      const fnDecl = /\bfunction\s+([a-zA-Z_$][\w$]*)/g;
      while ((m = fnDecl.exec(l))) {
        const name = m[1];
        const start = m.index + m[0].indexOf(name);
        tokens.push({ text: name, type: "function-name", range: { start: { line, column: start }, end: { line, column: start + name.length } } });
      }
      const clsDecl = /\bclass\s+([a-zA-Z_$][\w$]*)/g;
      while ((m = clsDecl.exec(l))) {
        const name = m[1];
        const start = m.index + m[0].indexOf(name);
        tokens.push({ text: name, type: "class-name", range: { start: { line, column: start }, end: { line, column: start + name.length } } });
      }
      // operators and punctuation
      const op = /(===|!==|==|!=|=>|<=|>=|\+\+|--|&&|\|\||[+\-*/%?:=<>!.,;()[\]{}])/g;
      while ((m = op.exec(l))) {
        tokens.push({ text: m[0], type: "operator", range: { start: { line, column: m.index }, end: { line, column: m.index + m[0].length } } });
      }
    }
    return tokens;
  },
  complete(_text: string, _pos: Position): CompletionItem[] {
    const completions: CompletionItem[] = [];
    
    // Keywords
    for (const kw of jsKeywords) {
      completions.push({ 
        label: kw, 
        kind: "keyword",
        detail: keywordDocs.get(kw) || "JavaScript keyword"
      });
    }
    
    // Global objects
    for (const obj of jsGlobalObjects) {
      completions.push({ 
        label: obj, 
        kind: "class",
        detail: `JavaScript global: ${obj}`
      });
    }
    
    return completions;
  },
  hover(text: string, position: Position): Hover | null {
    const toks = javascript.tokenize!(text) as Token[];
    const t = toks.find((tk: Token) => tk.range.start.line === position.line && position.column >= tk.range.start.column && position.column <= tk.range.end.column);
    if (!t) return null;
    
    // Check if it's a keyword
    if (t.type === "keyword") {
      const doc = keywordDocs.get(t.text);
      const mdn = `https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/${t.text}`;
      return { 
        contents: doc ? `**${t.text}** (keyword)\n\n${doc}\n\nMDN: ${mdn}` : `**${t.text}** - JavaScript keyword\n\nMDN: ${mdn}`,
        range: t.range 
      };
    }
    
    // Check if it's a global object
    if (t.type === "global") {
      const mdn = `https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/${t.text}`;
      return { 
        contents: `**${t.text}** - JavaScript global object\n\nMDN: ${mdn}`,
        range: t.range 
      };
    }
    
    // Check if it's a known method
    if (jsBuiltinMethods.has(t.text)) {
      const method = t.text;
      const base = (["map","filter","reduce","forEach","find","some","every","includes","slice","splice","push","pop","shift","unshift","join","sort","reverse","indexOf"].includes(method))
        ? `Array/${method}`
        : (method === 'toString' ? 'Object/toString' : (method === 'log' || method === 'error' || method === 'warn' || method === 'debug' || method === 'info' || method === 'table') ? `console/${method}` : `Global_Objects`);
      const mdn = base.includes('/') ? `https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/${base}` : `https://developer.mozilla.org/docs/Web/JavaScript/Reference/${base}`;
      return {
        contents: `**${t.text}**\n\n${jsBuiltinMethods.get(t.text)}\n\nMDN: ${mdn}`,
        range: t.range
      };
    }
    
    const map: Record<string, string> = { 
      keyword: "JavaScript keyword", 
      string: "String literal", 
      comment: "Comment",
      number: "Number literal",
      global: "Global object",
      identifier: "Identifier",
      "function-name": "Function name",
      "class-name": "Class name",
      operator: "Operator",
      regex: "Regular expression literal"
    };
    return { contents: map[t.type] ?? t.type, range: t.range };
  }
};
