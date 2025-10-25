/**
 * Token color resolver - maps token types to CSS variables
 */

export type TokenColorResolver = (type?: string) => string;

/**
 * Create a color resolver from computed styles
 */
export function createColorResolver(styles: CSSStyleDeclaration): TokenColorResolver {
  return (type?: string): string => {
    switch (type) {
      // General code tokens
      case "keyword":
        return styles.getPropertyValue("--token-keyword") || "#7c3aed";
      case "type-keyword":
        return styles.getPropertyValue("--token-type") || "#2563eb";
      case "primitive-type":
        return styles.getPropertyValue("--token-primitive") || "#3b82f6";
      case "number":
        return styles.getPropertyValue("--token-number") || "#14b8a6";
      case "global":
        return styles.getPropertyValue("--token-global") || "#6366f1";
      case "string":
        return styles.getPropertyValue("--token-string") || "#16a34a";
      case "comment":
        return styles.getPropertyValue("--token-comment") || "#9ca3af";
      case "operator":
        return styles.getPropertyValue("--token-operator") || "#f43f5e";
      case "regex":
        return styles.getPropertyValue("--token-regex") || "#06b6d4";
      case "identifier":
        return styles.getPropertyValue("--token-identifier") || "#60a5fa";
      case "variable":
        return styles.getPropertyValue("--token-variable") || "#c084fc";
      case "interpolation":
        return styles.getPropertyValue("--token-interpolation") || "#a855f7";
      case "function-name":
      case "function":
        return styles.getPropertyValue("--token-function") || "#22c55e";
      case "property":
        return styles.getPropertyValue("--token-property") || "#f59e0b";
      case "class-name":
        return styles.getPropertyValue("--token-class") || "#fb7185";
      case "punctuation":
        return styles.getPropertyValue("--token-punctuation") || "#6b7280";

      // Markup / style
      case "tag":
        return styles.getPropertyValue("--token-tag") || "#dc2626";
      case "attribute":
        return styles.getPropertyValue("--token-attribute") || "#fbbf24";
      case "attr-value":
        return styles.getPropertyValue("--token-attr-value") || "#10b981";
      case "entity":
        return styles.getPropertyValue("--token-entity") || "#f59e0b";
      case "doctype":
        return styles.getPropertyValue("--token-doctype") || "#9ca3af";
      case "at-rule":
        return styles.getPropertyValue("--token-atrule") || "#0891b2";
      case "selector-class":
        return styles.getPropertyValue("--token-selector-class") || "#f472b6";
      case "selector-id":
        return styles.getPropertyValue("--token-selector-id") || "#22d3ee";
      case "pseudo":
        return styles.getPropertyValue("--token-pseudo") || "#a78bfa";
      case "value":
        return styles.getPropertyValue("--token-value") || "#60a5fa";
      case "color":
        return styles.getPropertyValue("--token-color") || "#34d399";

      // Markdown
      case "heading":
        return styles.getPropertyValue("--token-heading") || "#eab308";
      case "inline":
        return styles.getPropertyValue("--token-inline") || "#d946ef";
      case "code-block":
        return styles.getPropertyValue("--token-codeblock") || "#94a3b8";
      case "blockquote":
        return styles.getPropertyValue("--token-blockquote") || "#9ca3af";
      case "list":
        return styles.getPropertyValue("--token-list") || "#06b6d4";
      case "link":
        return styles.getPropertyValue("--token-link") || "#3b82f6";
      case "image":
        return styles.getPropertyValue("--token-image") || "#ec4899";

      // Story/Narrative
      case "scene":
        return styles.getPropertyValue("--token-scene") || "#0ea5e9";
      case "character":
        return styles.getPropertyValue("--token-character") || "#22c55e";
      case "dialogue":
        return styles.getPropertyValue("--token-dialogue") || "#f97316";
      case "action":
        return styles.getPropertyValue("--token-action") || "#84cc16";
      case "symbol":
        return styles.getPropertyValue("--token-symbol") || "#d946ef";

      default:
        return styles.getPropertyValue("--foreground") || "#111";
    }
  };
}
