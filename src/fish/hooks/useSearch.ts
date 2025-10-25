import { useCallback, useState } from "react";
import type { DocPos } from "../core/document";
import {
  searchText,
  findNextMatch,
  findPreviousMatch,
  getCurrentMatchIndex,
  type SearchMatch,
  type SearchOptions
} from "../core/search";

export interface UseSearchOptions {
  /** Get current document text */
  getDocText: () => string;
  /** Get current cursor position */
  getCursorPos: () => DocPos;
  /** Set cursor position */
  setCursorPos: (anchor: DocPos, caret: DocPos) => void;
  /** Apply text replacement (should handle history recording) */
  applyReplacement: (match: SearchMatch, replacement: string) => void;
  /** Callback when search results change */
  onMatchesChange?: (matches: SearchMatch[], currentIndex: number) => void;
  /** Callback when current match index changes */
  onCurrentMatchChange?: (index: number) => void;
}

export interface UseSearchReturn {
  /** Current search query */
  query: string;
  /** Current search matches */
  matches: SearchMatch[];
  /** Index of current match */
  currentMatchIndex: number;
  /** Total number of matches */
  totalMatches: number;
  /** Search options */
  options: SearchOptions;
  /** Whether search is active */
  isSearching: boolean;
  /** Perform a new search */
  search: (query: string, options?: Partial<SearchOptions>) => void;
  /** Clear current search */
  clear: () => void;
  /** Navigate to next match */
  findNext: () => void;
  /** Navigate to previous match */
  findPrevious: () => void;
  /** Go to specific match by index */
  goToMatch: (index: number) => void;
  /** Replace current match */
  replace: (replacement: string) => void;
  /** Replace all matches */
  replaceAll: (replacement: string) => void;
  /** Update search options */
  setOptions: (options: Partial<SearchOptions>) => void;
}

export function useSearch(
  hookOptions: UseSearchOptions
): UseSearchReturn {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [options, setOptionsState] = useState<SearchOptions>({
    caseSensitive: false,
    useRegex: false,
    wholeWord: false
  });

  // Perform search
  const search = useCallback(
    (newQuery: string, newOptions?: Partial<SearchOptions>) => {
      const searchOptions = newOptions ? { ...options, ...newOptions } : options;
      setOptionsState(searchOptions);
      setQuery(newQuery);

      if (!newQuery) {
        setMatches([]);
        setCurrentMatchIndex(-1);
        hookOptions.onMatchesChange?.([], -1);
        return;
      }

      const text = hookOptions.getDocText();
      const result = searchText(text, newQuery, searchOptions);
      
      setMatches(result.matches);
      
      // Find current match based on cursor position
      const cursorPos = hookOptions.getCursorPos();
      const currentIndex = getCurrentMatchIndex(result.matches, cursorPos);
      setCurrentMatchIndex(currentIndex);
      
      hookOptions.onMatchesChange?.(result.matches, currentIndex);
    },
    [options, hookOptions]
  );

  // Clear search
  const clear = useCallback(() => {
    setQuery("");
    setMatches([]);
    setCurrentMatchIndex(-1);
    hookOptions.onMatchesChange?.([], -1);
  }, [hookOptions]);

  // Find next match
  const findNext = useCallback(() => {
    if (matches.length === 0) return;

    const cursorPos = hookOptions.getCursorPos();
    const nextIndex = findNextMatch(matches, cursorPos, true);
    
    if (nextIndex !== -1) {
      setCurrentMatchIndex(nextIndex);
      hookOptions.onCurrentMatchChange?.(nextIndex);
      
      // Move cursor to the match
      const match = matches[nextIndex];
      hookOptions.setCursorPos(match.startPos, match.endPos);
    }
  }, [matches, hookOptions]);

  // Find previous match
  const findPrevious = useCallback(() => {
    if (matches.length === 0) return;

    const cursorPos = hookOptions.getCursorPos();
    const prevIndex = findPreviousMatch(matches, cursorPos, true);
    
    if (prevIndex !== -1) {
      setCurrentMatchIndex(prevIndex);
      hookOptions.onCurrentMatchChange?.(prevIndex);
      
      // Move cursor to the match
      const match = matches[prevIndex];
      hookOptions.setCursorPos(match.startPos, match.endPos);
    }
  }, [matches, hookOptions]);

  // Go to specific match
  const goToMatch = useCallback(
    (index: number) => {
      if (index < 0 || index >= matches.length) return;

      setCurrentMatchIndex(index);
      hookOptions.onCurrentMatchChange?.(index);
      
      // Move cursor to the match
      const match = matches[index];
      hookOptions.setCursorPos(match.startPos, match.endPos);
    },
    [matches, hookOptions]
  );

  // Replace current match
  const replace = useCallback(
    (replacement: string) => {
      if (currentMatchIndex === -1 || currentMatchIndex >= matches.length) return;

      const currentMatch = matches[currentMatchIndex];
      
      // Apply replacement (this should handle history recording)
      hookOptions.applyReplacement(currentMatch, replacement);
      
      // Re-run search to update matches
      search(query, options);
    },
    [currentMatchIndex, matches, options, query, search, hookOptions]
  );

  // Replace all matches
  const replaceAll = useCallback(
    (replacement: string) => {
      if (matches.length === 0) return;

      // Replace from end to beginning to avoid position shifts
      const sortedMatches = [...matches].sort((a, b) => {
        if (a.startPos.line !== b.startPos.line) {
          return b.startPos.line - a.startPos.line;
        }
        return b.startPos.column - a.startPos.column;
      });

      for (const match of sortedMatches) {
        hookOptions.applyReplacement(match, replacement);
      }
      
      // Re-run search to update matches (should be empty now)
      search(query, options);
    },
    [matches, query, options, search, hookOptions]
  );

  // Update search options
  const setOptions = useCallback(
    (newOptions: Partial<SearchOptions>) => {
      const updatedOptions = { ...options, ...newOptions };
      setOptionsState(updatedOptions);
      
      // Re-run search with new options
      if (query) {
        search(query, updatedOptions);
      }
    },
    [options, query, search]
  );

  return {
    query,
    matches,
    currentMatchIndex,
    totalMatches: matches.length,
    options,
    isSearching: matches.length > 0 || query.length > 0,
    search,
    clear,
    findNext,
    findPrevious,
    goToMatch,
    replace,
    replaceAll,
    setOptions
  };
}
