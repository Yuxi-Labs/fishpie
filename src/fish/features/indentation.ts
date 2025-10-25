/**
 * Smart indentation detection and formatting
 */

export type IndentStyle = {
  tabChar: string; // "\t" or "  " or "    "
  useTabs: boolean;
  spaceSize: number; // 2 or 4
};

/**
 * Detect indentation style from document text
 * Analyzes first 100 lines to determine tabs vs spaces and indent size
 */
export function detectIndentStyle(text: string): IndentStyle {
  const lines = text.split("\n");
  let tabChar = "\t";
  let useTabs = true;
  let spaceSize = 2;

  // Check first 100 lines for indentation patterns
  for (const line of lines.slice(0, 100)) {
    const spaceMatch = line.match(/^( {2,})/);
    const tabMatch = line.match(/^\t+/);

    if (spaceMatch) {
      const spaces = spaceMatch[1].length;
      if (spaces % 4 === 0) {
        spaceSize = 4;
      } else if (spaces % 2 === 0) {
        spaceSize = 2;
      }
      tabChar = " ".repeat(spaceSize);
      useTabs = false;
      break;
    }

    if (tabMatch) {
      tabChar = "\t";
      useTabs = true;
      break;
    }
  }

  return { tabChar, useTabs, spaceSize };
}

/**
 * Get the leading whitespace of a line
 */
export function getLineIndent(lineText: string): string {
  const match = lineText.match(/^[\t ]*/);
  return match ? match[0] : "";
}

/**
 * Check if line ends with a character that should increase indent
 */
export function shouldIncreaseIndent(lineText: string): boolean {
  const trimmed = lineText.trim();
  return /[{[(:]$/.test(trimmed);
}

/**
 * Check if cursor is between matching pairs (e.g., {|})
 */
export function isBetweenMatchingPairs(
  charBefore: string,
  charAfter: string
): boolean {
  return (
    (charBefore === "{" && charAfter === "}") ||
    (charBefore === "[" && charAfter === "]") ||
    (charBefore === "(" && charAfter === ")")
  );
}

/**
 * Calculate text to insert on Enter key press
 * Handles smart indentation for matching pairs and after opening braces
 */
export function calculateEnterIndent(params: {
  currentLineText: string;
  caretColumn: number;
  indentStyle: IndentStyle;
}): { textToInsert: string; caretOffset: number } {
  const { currentLineText, caretColumn, indentStyle } = params;
  const indent = getLineIndent(currentLineText);
  const charBefore = caretColumn > 0 ? currentLineText[caretColumn - 1] : "";
  const charAfter = currentLineText[caretColumn] || "";

  // Between matching pairs: insert newline with extra indent, then another line with original indent
  if (isBetweenMatchingPairs(charBefore, charAfter)) {
    const textToInsert = "\n" + indent + indentStyle.tabChar + "\n" + indent;
    // Cursor should be on middle line after the extra indent
    const caretOffset = ("\n" + indent + indentStyle.tabChar).length;
    return { textToInsert, caretOffset };
  }

  // After opening brace/bracket/paren/colon: add extra indent
  const needsExtraIndent = shouldIncreaseIndent(currentLineText);
  const extraIndent = needsExtraIndent ? indentStyle.tabChar : "";
  const textToInsert = "\n" + indent + extraIndent;

  return { textToInsert, caretOffset: textToInsert.length };
}
