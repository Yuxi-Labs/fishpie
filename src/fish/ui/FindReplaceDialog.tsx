"use client";

import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import styles from "./FindReplaceDialog.module.scss";

export interface FindReplaceProps {
  visible: boolean;
  onClose: () => void;
  onFindNext: (query: string, options: FindOptions) => void;
  onFindPrevious: (query: string, options: FindOptions) => void;
  onReplace: (query: string, replacement: string, options: FindOptions) => void;
  onReplaceAll: (query: string, replacement: string, options: FindOptions) => void;
  matchInfo?: { current: number; total: number };
  initialQuery?: string;
  mode?: 'find' | 'replace';
}

export interface FindOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
}

export function FindReplaceDialog({
  visible,
  onClose,
  onFindNext,
  onFindPrevious,
  onReplace,
  onReplaceAll,
  matchInfo,
  initialQuery = '',
  mode = 'find'
}: FindReplaceProps) {
  const [query, setQuery] = useState(initialQuery);
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [currentMode, setCurrentMode] = useState(mode);
  
  const findInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Focus find input when dialog becomes visible
  useEffect(() => {
    if (visible && findInputRef.current) {
      findInputRef.current.focus();
      findInputRef.current.select();
    }
  }, [visible]);

  // Update query when initialQuery changes
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  // Update mode when prop changes
  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  if (!visible) return null;

  const options: FindOptions = {
    caseSensitive,
    wholeWord,
    useRegex
  };

  const handleFindNext = () => {
    if (query) {
      onFindNext(query, options);
    }
  };

  const handleFindPrevious = () => {
    if (query) {
      onFindPrevious(query, options);
    }
  };

  const handleReplace = () => {
    if (query) {
      onReplace(query, replacement, options);
    }
  };

  const handleReplaceAll = () => {
    if (query) {
      onReplaceAll(query, replacement, options);
    }
  };

  const handleFindKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handleFindPrevious();
      } else {
        handleFindNext();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleReplaceKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleReplace();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Future: Add mode toggle button
  // const toggleMode = () => {
  //   setCurrentMode(currentMode === 'find' ? 'replace' : 'find');
  // };

  return (
    <div className={styles.findReplaceDialog}>
      <div className={styles.header}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${currentMode === 'find' ? styles.active : ''}`}
            onClick={() => setCurrentMode('find')}
            title="Find (Ctrl+F)"
          >
            Find
          </button>
          <button
            className={`${styles.tab} ${currentMode === 'replace' ? styles.active : ''}`}
            onClick={() => setCurrentMode('replace')}
            title="Replace (Ctrl+H)"
          >
            Replace
          </button>
        </div>
        <button
          className={styles.closeButton}
          onClick={onClose}
          title="Close (Escape)"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className={styles.content}>
        {/* Find Input */}
        <div className={styles.inputRow}>
          <input
            ref={findInputRef}
            type="text"
            className={styles.input}
            placeholder="Find"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleFindKeyDown}
            aria-label="Find"
          />
          <div className={styles.matchCounter}>
            {matchInfo && matchInfo.total > 0 ? (
              <span>{matchInfo.current + 1} of {matchInfo.total}</span>
            ) : query ? (
              <span>No results</span>
            ) : null}
          </div>
        </div>

        {/* Replace Input (only in replace mode) */}
        {currentMode === 'replace' && (
          <div className={styles.inputRow}>
            <input
              ref={replaceInputRef}
              type="text"
              className={styles.input}
              placeholder="Replace"
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              onKeyDown={handleReplaceKeyDown}
              aria-label="Replace"
            />
          </div>
        )}

        {/* Options */}
        <div className={styles.options}>
          <button
            className={`${styles.optionButton} ${caseSensitive ? styles.active : ''}`}
            onClick={() => setCaseSensitive(!caseSensitive)}
            title="Match Case (Alt+C)"
            aria-label="Match Case"
          >
            Aa
          </button>
          <button
            className={`${styles.optionButton} ${wholeWord ? styles.active : ''}`}
            onClick={() => setWholeWord(!wholeWord)}
            title="Match Whole Word (Alt+W)"
            aria-label="Match Whole Word"
          >
            Ab
          </button>
          <button
            className={`${styles.optionButton} ${useRegex ? styles.active : ''}`}
            onClick={() => setUseRegex(!useRegex)}
            title="Use Regular Expression (Alt+R)"
            aria-label="Use Regular Expression"
          >
            .*
          </button>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <div className={styles.navigationButtons}>
            <button
              className={styles.button}
              onClick={handleFindPrevious}
              disabled={!query || (matchInfo && matchInfo.total === 0)}
              title="Previous Match (Shift+Enter)"
              aria-label="Previous Match"
            >
              ↑
            </button>
            <button
              className={styles.button}
              onClick={handleFindNext}
              disabled={!query || (matchInfo && matchInfo.total === 0)}
              title="Next Match (Enter)"
              aria-label="Next Match"
            >
              ↓
            </button>
          </div>

          {currentMode === 'replace' && (
            <div className={styles.replaceButtons}>
              <button
                className={styles.button}
                onClick={handleReplace}
                disabled={!query || !matchInfo || matchInfo.total === 0}
                title="Replace (Ctrl+Shift+1)"
              >
                Replace
              </button>
              <button
                className={styles.button}
                onClick={handleReplaceAll}
                disabled={!query || !matchInfo || matchInfo.total === 0}
                title="Replace All (Ctrl+Shift+Enter)"
              >
                Replace All
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
