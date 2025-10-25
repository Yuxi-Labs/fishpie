import type { CaretPos } from "./types";

export type DocPos = { line: number; column: number };

/**
 * Operation types that can be undone/redone
 */
export type OperationType = 
  | "insert"      // Insert text at position
  | "delete"      // Delete text in range
  | "replace";    // Replace text in range

/**
 * A single text editing operation that can be undone/redone
 */
export interface HistoryOperation {
  type: OperationType;
  startPos: DocPos;
  endPos: DocPos;
  text: string;           // Text inserted (for insert/replace) or deleted text (for delete)
  newText?: string;       // New text for replace operations (for redo)
  timestamp: number;
  caretBefore: CaretPos;  // Cursor position before operation
  caretAfter: CaretPos;   // Cursor position after operation
  anchorBefore: CaretPos | null; // Selection anchor before operation
  anchorAfter: CaretPos | null;  // Selection anchor after operation
}

/**
 * A batch of operations that should be undone/redone together
 * This allows grouping rapid typing or related edits
 */
export interface HistoryBatch {
  operations: HistoryOperation[];
  timestamp: number;
}

export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
}

/**
 * Configuration for history manager behavior
 */
export interface HistoryConfig {
  maxHistorySize?: number;      // Maximum number of batches to keep (default: 100)
  batchTimeWindow?: number;      // Time window in ms for batching operations (default: 300ms)
  batchSizeLimit?: number;       // Max operations per batch (default: 50)
}

/**
 * Manages undo/redo history for text editing operations
 * 
 * Features:
 * - Records all text modifications with cursor positions
 * - Automatic operation batching for rapid typing
 * - Configurable history limits
 * - Cursor position restoration on undo/redo
 * - Clear separation between undo and redo stacks
 */
export class HistoryManager {
  private undoStack: HistoryBatch[] = [];
  private redoStack: HistoryBatch[] = [];
  private currentBatch: HistoryOperation[] = [];
  private lastOperationTime: number = 0;
  private config: Required<HistoryConfig>;

  constructor(config: HistoryConfig = {}) {
    this.config = {
      maxHistorySize: config.maxHistorySize ?? 100,
      batchTimeWindow: config.batchTimeWindow ?? 300,
      batchSizeLimit: config.batchSizeLimit ?? 50,
    };
  }

  /**
   * Record a new operation in the history
   * Operations within the batch time window are grouped together
   */
  recordOperation(op: HistoryOperation): void {
    const now = Date.now();
    const timeSinceLastOp = now - this.lastOperationTime;

    // Determine if we should start a new batch
    const shouldStartNewBatch = 
      this.currentBatch.length === 0 ||
      timeSinceLastOp > this.config.batchTimeWindow ||
      this.currentBatch.length >= this.config.batchSizeLimit ||
      this._shouldSeparateOperation(op, this.currentBatch[this.currentBatch.length - 1]);

    if (shouldStartNewBatch && this.currentBatch.length > 0) {
      this._commitCurrentBatch();
    }

    // Add operation to current batch
    this.currentBatch.push(op);
    this.lastOperationTime = now;

    // Clear redo stack when new operation is recorded
    this.redoStack = [];
  }

  /**
   * Determine if two operations should be in separate batches
   * Separate batches for: different operation types, distant positions, or different selections
   */
  private _shouldSeparateOperation(newOp: HistoryOperation, lastOp: HistoryOperation | undefined): boolean {
    if (!lastOp) return false;

    // Separate different operation types
    if (newOp.type !== lastOp.type) return true;

    // For delete operations, check if they're sequential
    if (newOp.type === "delete") {
      // Backspace: deleting backwards from same position
      const isSequentialBackspace = 
        newOp.endPos.line === lastOp.startPos.line &&
        newOp.endPos.column === lastOp.startPos.column;
      
      // Delete key: deleting forward from same position
      const isSequentialDelete = 
        newOp.startPos.line === lastOp.startPos.line &&
        newOp.startPos.column === lastOp.startPos.column;

      if (!isSequentialBackspace && !isSequentialDelete) return true;
    }

    // For insert operations, check if they're continuous
    if (newOp.type === "insert") {
      const isConsecutiveInsert = 
        newOp.startPos.line === lastOp.endPos.line &&
        newOp.startPos.column === lastOp.endPos.column;

      if (!isConsecutiveInsert) return true;

      // Separate on newlines or special characters
      if (newOp.text === "\n" || lastOp.text === "\n") return true;
    }

    return false;
  }

  /**
   * Commit the current batch to the undo stack
   */
  private _commitCurrentBatch(): void {
    if (this.currentBatch.length === 0) return;

    const batch: HistoryBatch = {
      operations: [...this.currentBatch],
      timestamp: Date.now(),
    };

    this.undoStack.push(batch);
    this.currentBatch = [];

    // Enforce history size limit
    if (this.undoStack.length > this.config.maxHistorySize) {
      this.undoStack.shift();
    }
  }

  /**
   * Force commit the current batch (useful before undo/redo operations)
   */
  commitBatch(): void {
    this._commitCurrentBatch();
  }

  /**
   * Get the next batch to undo (without removing it from stack)
   * Returns null if nothing to undo
   */
  peekUndo(): HistoryBatch | null {
    this.commitBatch();
    return this.undoStack.length > 0 ? this.undoStack[this.undoStack.length - 1] : null;
  }

  /**
   * Pop a batch from the undo stack and push to redo stack
   * Returns the batch to undo
   */
  popUndo(): HistoryBatch | null {
    this.commitBatch();
    const batch = this.undoStack.pop();
    if (batch) {
      this.redoStack.push(batch);
    }
    return batch ?? null;
  }

  /**
   * Get the next batch to redo (without removing it from stack)
   * Returns null if nothing to redo
   */
  peekRedo(): HistoryBatch | null {
    return this.redoStack.length > 0 ? this.redoStack[this.redoStack.length - 1] : null;
  }

  /**
   * Pop a batch from the redo stack and push to undo stack
   * Returns the batch to redo
   */
  popRedo(): HistoryBatch | null {
    const batch = this.redoStack.pop();
    if (batch) {
      this.undoStack.push(batch);
    }
    return batch ?? null;
  }

  /**
   * Get current history state
   */
  getState(): HistoryState {
    const pendingBatch = this.currentBatch.length > 0 ? 1 : 0;
    return {
      canUndo: this.undoStack.length > 0 || pendingBatch > 0,
      canRedo: this.redoStack.length > 0,
      undoCount: this.undoStack.length + pendingBatch,
      redoCount: this.redoStack.length,
    };
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.currentBatch = [];
    this.lastOperationTime = 0;
  }

  /**
   * Clear only the redo stack (useful when document changes externally)
   */
  clearRedo(): void {
    this.redoStack = [];
  }
}

/**
 * Create an insert operation record
 */
export function createInsertOperation(
  pos: DocPos,
  text: string,
  caretBefore: CaretPos,
  caretAfter: CaretPos,
  anchorBefore: CaretPos | null = null,
  anchorAfter: CaretPos | null = null
): HistoryOperation {
  return {
    type: "insert",
    startPos: pos,
    endPos: pos,
    text,
    timestamp: Date.now(),
    caretBefore,
    caretAfter,
    anchorBefore,
    anchorAfter,
  };
}

/**
 * Create a delete operation record
 */
export function createDeleteOperation(
  startPos: DocPos,
  endPos: DocPos,
  deletedText: string,
  caretBefore: CaretPos,
  caretAfter: CaretPos,
  anchorBefore: CaretPos | null = null,
  anchorAfter: CaretPos | null = null
): HistoryOperation {
  return {
    type: "delete",
    startPos,
    endPos,
    text: deletedText,
    timestamp: Date.now(),
    caretBefore,
    caretAfter,
    anchorBefore,
    anchorAfter,
  };
}

/**
 * Create a replace operation record
 */
export function createReplaceOperation(
  startPos: DocPos,
  endPos: DocPos,
  oldText: string,
  newText: string,
  caretBefore: CaretPos,
  caretAfter: CaretPos,
  anchorBefore: CaretPos | null = null,
  anchorAfter: CaretPos | null = null
): HistoryOperation {
  // Store both old text (for undo) and new text (for redo)
  return {
    type: "replace",
    startPos,
    endPos,
    text: oldText,    // Old text for undo
    newText: newText, // New text for redo
    timestamp: Date.now(),
    caretBefore,
    caretAfter,
    anchorBefore,
    anchorAfter,
  };
}
