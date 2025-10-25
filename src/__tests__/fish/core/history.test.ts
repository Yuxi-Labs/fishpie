import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  HistoryManager,
  createInsertOperation,
  createDeleteOperation,
  createReplaceOperation,
  type DocPos,
} from "../../../fish/core/history";

describe("HistoryManager", () => {
  let history: HistoryManager;

  beforeEach(() => {
    history = new HistoryManager();
    // Mock Date.now for consistent timestamps in tests
    vi.useFakeTimers();
  });

  describe("basic operation recording", () => {
    it("should record insert operations", () => {
      const op = createInsertOperation(
        { line: 0, column: 0 },
        "hello",
        { line: 0, column: 0 },
        { line: 0, column: 5 }
      );

      history.recordOperation(op);

      const state = history.getState();
      expect(state.canUndo).toBe(true);
      expect(state.canRedo).toBe(false);
      expect(state.undoCount).toBe(1);
    });

    it("should record delete operations", () => {
      const op = createDeleteOperation(
        { line: 0, column: 0 },
        { line: 0, column: 5 },
        "hello",
        { line: 0, column: 5 },
        { line: 0, column: 0 }
      );

      history.recordOperation(op);

      const state = history.getState();
      expect(state.canUndo).toBe(true);
      expect(state.canRedo).toBe(false);
    });

    it("should record replace operations", () => {
      const op = createReplaceOperation(
        { line: 0, column: 0 },
        { line: 0, column: 5 },
        "hello",
        "world",
        { line: 0, column: 5 },
        { line: 0, column: 5 }
      );

      history.recordOperation(op);

      const state = history.getState();
      expect(state.canUndo).toBe(true);
    });
  });

  describe("operation batching", () => {
    it("should batch rapid typing into single undo unit", () => {
      // Simulate typing "hello" character by character
      const positions: DocPos[] = [
        { line: 0, column: 0 },
        { line: 0, column: 1 },
        { line: 0, column: 2 },
        { line: 0, column: 3 },
        { line: 0, column: 4 },
      ];

      positions.forEach((pos, i) => {
        const char = "hello"[i];
        const op = createInsertOperation(
          pos,
          char,
          pos,
          { line: 0, column: pos.column + 1 }
        );
        history.recordOperation(op);
        vi.advanceTimersByTime(50); // 50ms between keystrokes
      });

      // Operations should be batched (within 300ms window)
      const state = history.getState();
      expect(state.undoCount).toBe(1); // All in current batch
    });

    it("should start new batch after time window", () => {
      const op1 = createInsertOperation(
        { line: 0, column: 0 },
        "a",
        { line: 0, column: 0 },
        { line: 0, column: 1 }
      );
      history.recordOperation(op1);

      // Advance time beyond batch window (default 300ms)
      vi.advanceTimersByTime(400);

      const op2 = createInsertOperation(
        { line: 0, column: 1 },
        "b",
        { line: 0, column: 1 },
        { line: 0, column: 2 }
      );
      history.recordOperation(op2);

      history.commitBatch();

      const state = history.getState();
      expect(state.undoCount).toBe(2); // Two separate batches
    });

    it("should separate batches on newlines", () => {
      const op1 = createInsertOperation(
        { line: 0, column: 0 },
        "hello",
        { line: 0, column: 0 },
        { line: 0, column: 5 }
      );
      history.recordOperation(op1);

      const op2 = createInsertOperation(
        { line: 0, column: 5 },
        "\n",
        { line: 0, column: 5 },
        { line: 1, column: 0 }
      );
      history.recordOperation(op2);

      const op3 = createInsertOperation(
        { line: 1, column: 0 },
        "world",
        { line: 1, column: 0 },
        { line: 1, column: 5 }
      );
      history.recordOperation(op3);

      history.commitBatch();

      const state = history.getState();
      // Newline should separate batches
      expect(state.undoCount).toBeGreaterThan(1);
    });

    it("should separate different operation types", () => {
      const insert = createInsertOperation(
        { line: 0, column: 0 },
        "hello",
        { line: 0, column: 0 },
        { line: 0, column: 5 }
      );
      history.recordOperation(insert);

      const deleteOp = createDeleteOperation(
        { line: 0, column: 4 },
        { line: 0, column: 5 },
        "o",
        { line: 0, column: 5 },
        { line: 0, column: 4 }
      );
      history.recordOperation(deleteOp);

      history.commitBatch();

      const state = history.getState();
      expect(state.undoCount).toBe(2); // Different types = separate batches
    });
  });

  describe("undo operations", () => {
    it("should return null when nothing to undo", () => {
      const batch = history.popUndo();
      expect(batch).toBeNull();
    });

    it("should pop undo batch and push to redo", () => {
      const op = createInsertOperation(
        { line: 0, column: 0 },
        "test",
        { line: 0, column: 0 },
        { line: 0, column: 4 }
      );
      history.recordOperation(op);

      const batch = history.popUndo();
      expect(batch).not.toBeNull();
      expect(batch?.operations).toHaveLength(1);

      const state = history.getState();
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(true);
    });

    it("should preserve cursor positions in batch", () => {
      const caretBefore = { line: 0, column: 0 };
      const caretAfter = { line: 0, column: 5 };
      const anchorBefore = { line: 0, column: 0 };

      const op = createInsertOperation(
        { line: 0, column: 0 },
        "hello",
        caretBefore,
        caretAfter,
        anchorBefore,
        null
      );
      history.recordOperation(op);

      const batch = history.popUndo();
      expect(batch?.operations[0].caretBefore).toEqual(caretBefore);
      expect(batch?.operations[0].caretAfter).toEqual(caretAfter);
      expect(batch?.operations[0].anchorBefore).toEqual(anchorBefore);
    });

    it("should commit pending batch before undo", () => {
      const op = createInsertOperation(
        { line: 0, column: 0 },
        "test",
        { line: 0, column: 0 },
        { line: 0, column: 4 }
      );
      history.recordOperation(op);

      // Don't manually commit - popUndo should do it
      const batch = history.popUndo();
      expect(batch).not.toBeNull();
    });
  });

  describe("redo operations", () => {
    it("should return null when nothing to redo", () => {
      const batch = history.popRedo();
      expect(batch).toBeNull();
    });

    it("should redo after undo", () => {
      const op = createInsertOperation(
        { line: 0, column: 0 },
        "test",
        { line: 0, column: 0 },
        { line: 0, column: 4 }
      );
      history.recordOperation(op);

      // Undo
      const undoBatch = history.popUndo();
      expect(undoBatch).not.toBeNull();

      // Redo
      const redoBatch = history.popRedo();
      expect(redoBatch).not.toBeNull();
      expect(redoBatch?.operations[0].text).toBe("test");

      const state = history.getState();
      expect(state.canUndo).toBe(true);
      expect(state.canRedo).toBe(false);
    });

    it("should clear redo stack on new operation", () => {
      const op1 = createInsertOperation(
        { line: 0, column: 0 },
        "first",
        { line: 0, column: 0 },
        { line: 0, column: 5 }
      );
      history.recordOperation(op1);

      // Undo
      history.popUndo();

      expect(history.getState().canRedo).toBe(true);

      // Record new operation - should clear redo stack
      const op2 = createInsertOperation(
        { line: 0, column: 0 },
        "second",
        { line: 0, column: 0 },
        { line: 0, column: 6 }
      );
      history.recordOperation(op2);

      expect(history.getState().canRedo).toBe(false);
    });
  });

  describe("history limits", () => {
    it("should respect max history size", () => {
      const limitedHistory = new HistoryManager({ maxHistorySize: 5 });

      // Add 10 operations with time delays to create separate batches
      for (let i = 0; i < 10; i++) {
        const op = createInsertOperation(
          { line: 0, column: i },
          String(i),
          { line: 0, column: i },
          { line: 0, column: i + 1 }
        );
        limitedHistory.recordOperation(op);
        limitedHistory.commitBatch();
        vi.advanceTimersByTime(400); // Force new batch
      }

      const state = limitedHistory.getState();
      expect(state.undoCount).toBeLessThanOrEqual(5);
    });

    it("should respect batch size limit", () => {
      const limitedHistory = new HistoryManager({ batchSizeLimit: 3 });

      // Add 5 operations rapidly
      for (let i = 0; i < 5; i++) {
        const op = createInsertOperation(
          { line: 0, column: i },
          String(i),
          { line: 0, column: i },
          { line: 0, column: i + 1 }
        );
        limitedHistory.recordOperation(op);
        vi.advanceTimersByTime(50); // Within batch window
      }

      limitedHistory.commitBatch();

      const state = limitedHistory.getState();
      // Should have created multiple batches due to size limit
      expect(state.undoCount).toBeGreaterThan(1);
    });
  });

  describe("clear operations", () => {
    it("should clear all history", () => {
      const op = createInsertOperation(
        { line: 0, column: 0 },
        "test",
        { line: 0, column: 0 },
        { line: 0, column: 4 }
      );
      history.recordOperation(op);

      history.clear();

      const state = history.getState();
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(false);
      expect(state.undoCount).toBe(0);
      expect(state.redoCount).toBe(0);
    });

    it("should clear only redo stack", () => {
      const op = createInsertOperation(
        { line: 0, column: 0 },
        "test",
        { line: 0, column: 0 },
        { line: 0, column: 4 }
      );
      history.recordOperation(op);

      history.popUndo(); // Move to redo stack

      history.clearRedo();

      const state = history.getState();
      expect(state.canRedo).toBe(false);
      expect(state.canUndo).toBe(false); // Already moved to redo before clear
    });
  });

  describe("peek operations", () => {
    it("should peek undo without modifying stack", () => {
      const op = createInsertOperation(
        { line: 0, column: 0 },
        "test",
        { line: 0, column: 0 },
        { line: 0, column: 4 }
      );
      history.recordOperation(op);

      const batch = history.peekUndo();
      expect(batch).not.toBeNull();

      // State should unchanged
      const state = history.getState();
      expect(state.canUndo).toBe(true);
      expect(state.canRedo).toBe(false);
    });

    it("should peek redo without modifying stack", () => {
      const op = createInsertOperation(
        { line: 0, column: 0 },
        "test",
        { line: 0, column: 0 },
        { line: 0, column: 4 }
      );
      history.recordOperation(op);

      history.popUndo(); // Move to redo

      const batch = history.peekRedo();
      expect(batch).not.toBeNull();

      // State should be unchanged
      const state = history.getState();
      expect(state.canRedo).toBe(true);
      expect(state.canUndo).toBe(false);
    });
  });

  describe("replace operations", () => {
    it("should store both old and new text", () => {
      const op = createReplaceOperation(
        { line: 0, column: 0 },
        { line: 0, column: 5 },
        "hello",
        "world",
        { line: 0, column: 5 },
        { line: 0, column: 5 }
      );

      expect(op.text).toBe("hello"); // Old text
      expect(op.newText).toBe("world"); // New text
      expect(op.type).toBe("replace");
    });
  });

  describe("sequential delete operations", () => {
    it("should batch sequential backspace operations", () => {
      // Simulate backspace deleting "hello" -> "hell" -> "hel"
      const positions = [
        { start: { line: 0, column: 4 }, end: { line: 0, column: 5 }, text: "o" },
        { start: { line: 0, column: 3 }, end: { line: 0, column: 4 }, text: "l" },
        { start: { line: 0, column: 2 }, end: { line: 0, column: 3 }, text: "l" },
      ];

      positions.forEach((pos) => {
        const op = createDeleteOperation(
          pos.start,
          pos.end,
          pos.text,
          pos.end,
          pos.start
        );
        history.recordOperation(op);
        vi.advanceTimersByTime(50);
      });

      history.commitBatch();

      // Sequential backspace should be batched
      const state = history.getState();
      expect(state.undoCount).toBe(1);
    });

    it("should batch sequential forward delete operations", () => {
      // Simulate Delete key at same position
      const ops = ["a", "b", "c"].map((char) =>
        createDeleteOperation(
          { line: 0, column: 0 },
          { line: 0, column: 1 },
          char,
          { line: 0, column: 0 },
          { line: 0, column: 0 }
        )
      );

      ops.forEach((op) => {
        history.recordOperation(op);
        vi.advanceTimersByTime(50);
      });

      history.commitBatch();

      const state = history.getState();
      expect(state.undoCount).toBe(1);
    });
  });
});
