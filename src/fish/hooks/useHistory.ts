import { useRef, useCallback } from "react";
import { HistoryManager, type HistoryConfig, type HistoryState } from "../core/history";
import type { TextDocument } from "../core/document";
import type { CaretPos } from "../core/types";

export interface UseHistoryReturn {
  historyManager: HistoryManager;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => { caret: CaretPos; anchor: CaretPos | null } | null;
  redo: () => { caret: CaretPos; anchor: CaretPos | null } | null;
  clear: () => void;
  getState: () => HistoryState;
}

/**
 * React hook for managing undo/redo history for a text document
 * 
 * This hook provides:
 * - A HistoryManager instance
 * - undo() and redo() functions that apply changes to the document
 * - Current history state (canUndo, canRedo)
 * - Cursor position restoration after undo/redo
 * 
 * @param docRef - Reference to the TextDocument instance
 * @param config - Optional configuration for history behavior
 * @returns History manager, undo/redo functions, and state
 */
export function useHistory(
  docRef: React.MutableRefObject<TextDocument>,
  config?: HistoryConfig
): UseHistoryReturn {
  const historyManagerRef = useRef<HistoryManager>(new HistoryManager(config));

  /**
   * Perform undo operation
   * Returns the cursor position to restore, or null if nothing to undo
   */
  const undo = useCallback((): { caret: CaretPos; anchor: CaretPos | null } | null => {
    const batch = historyManagerRef.current.popUndo();
    if (!batch) return null;

    const doc = docRef.current;

    // Apply operations in reverse order
    for (let i = batch.operations.length - 1; i >= 0; i--) {
      const op = batch.operations[i];

      switch (op.type) {
        case "insert": {
          // Undo insert: delete the inserted text
          // Calculate end position after the insert
          const lines = op.text.split("\n");
          if (lines.length === 1) {
            // Single line insert
            const endPos = {
              line: op.startPos.line,
              column: op.startPos.column + op.text.length
            };
            doc.deleteRange(op.startPos, endPos);
          } else {
            // Multi-line insert
            const endPos = {
              line: op.startPos.line + lines.length - 1,
              column: lines[lines.length - 1].length
            };
            doc.deleteRange(op.startPos, endPos);
          }
          break;
        }

        case "delete": {
          // Undo delete: re-insert the deleted text
          doc.insertText(op.startPos, op.text);
          break;
        }

        case "replace": {
          // Undo replace: delete the new text and restore the old text
          // First, we need to calculate where the new text ends
          if (op.newText) {
            const newLines = op.newText.split("\n");
            const newEndPos = newLines.length === 1
              ? { line: op.startPos.line, column: op.startPos.column + op.newText.length }
              : { line: op.startPos.line + newLines.length - 1, column: newLines[newLines.length - 1].length };
            
            // Delete the new text
            doc.deleteRange(op.startPos, newEndPos);
          }
          // Insert the old text
          doc.insertText(op.startPos, op.text);
          break;
        }
      }
    }

    // Return the cursor position from the first operation (before the batch was applied)
    const firstOp = batch.operations[0];
    return {
      caret: firstOp.caretBefore,
      anchor: firstOp.anchorBefore,
    };
  }, [docRef]);

  /**
   * Perform redo operation
   * Returns the cursor position to restore, or null if nothing to redo
   */
  const redo = useCallback((): { caret: CaretPos; anchor: CaretPos | null } | null => {
    const batch = historyManagerRef.current.popRedo();
    if (!batch) return null;

    const doc = docRef.current;

    // Apply operations in original order
    for (const op of batch.operations) {
      switch (op.type) {
        case "insert": {
          doc.insertText(op.startPos, op.text);
          break;
        }

        case "delete": {
          doc.deleteRange(op.startPos, op.endPos);
          break;
        }

        case "replace": {
          // Redo replace: delete old text and insert new text
          doc.deleteRange(op.startPos, op.endPos);
          if (op.newText) {
            doc.insertText(op.startPos, op.newText);
          }
          break;
        }
      }
    }

    // Return the cursor position from the last operation (after the batch was applied)
    const lastOp = batch.operations[batch.operations.length - 1];
    return {
      caret: lastOp.caretAfter,
      anchor: lastOp.anchorAfter,
    };
  }, [docRef]);

  /**
   * Clear all history
   */
  const clear = useCallback(() => {
    historyManagerRef.current.clear();
  }, []);

  /**
   * Get current history state
   */
  const getState = useCallback(() => {
    return historyManagerRef.current.getState();
  }, []);

  // Get current state for return values
  const state = historyManagerRef.current.getState();

  return {
    historyManager: historyManagerRef.current,
    canUndo: state.canUndo,
    canRedo: state.canRedo,
    undo,
    redo,
    clear,
    getState,
  };
}
