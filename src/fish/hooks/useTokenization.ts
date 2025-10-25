/**
 * useTokenization hook - manages async syntax highlighting
 */

import { useState, useEffect, useRef } from "react";
import type { Token } from "@/fish/language/types";
import { tokenizeText } from "@/fish/features/tokenization";

export type UseTokenizationOptions = {
  languageId: string;
  text: string;
  enabled?: boolean;
};

export type UseTokenizationReturn = {
  tokens: Token[];
  isTokenizing: boolean;
};

/**
 * Hook to manage async tokenization with request sequencing
 */
export function useTokenization(options: UseTokenizationOptions): UseTokenizationReturn {
  const { languageId, text, enabled = true } = options;
  
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isTokenizing, setIsTokenizing] = useState(false);
  const requestSeqRef = useRef(0);
  
  useEffect(() => {
    if (!enabled) return;
    
    const requestId = ++requestSeqRef.current;
    setIsTokenizing(true);
    
    void (async () => {
      try {
        const result = await tokenizeText({ languageId, text });
        
        // Only update if this is still the latest request
        if (requestSeqRef.current === requestId) {
          setTokens(result || []);
          setIsTokenizing(false);
        }
      } catch (error) {
        console.error("Tokenization error:", error);
        if (requestSeqRef.current === requestId) {
          setTokens([]);
          setIsTokenizing(false);
        }
      }
    })();
  }, [languageId, text, enabled]);
  
  return {
    tokens,
    isTokenizing,
  };
}
