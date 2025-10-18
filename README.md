# Fishpie

A modern, web-native integrated development environment for writing code, domain-specific languages and more.

## Editor sizing (line numbers, gutter, caret)

The canvas-based `FishEditor` exposes CSS variables you can tweak to adjust line numbers, gutter width, caret size, and line height without changing code. These variables are scoped to the `.fish-editor` class.

- `--fish-line-number-font-size` (px): font size for line numbers (larger makes them more legible)
- `--fish-text-font-size` (px): font size for editor text
- `--fish-line-height` (px): line height; caret height uses line height for a normal-looking caret
- `--fish-caret-width` (px): caret thickness in pixels
- `--fish-editor-padding` (px): inner padding around content
- `--fish-gutter-extra` (px): extra space added to the computed gutter width to make it wider

Tailwind-first usage with responsive overrides (current):

```tsx
<div
	className="fish-editor [--fish-text-font-size:16px] [--fish-line-number-font-size:18px] [--fish-line-height:24px] [--fish-caret-width:2px] [--fish-gutter-extra:12px]
						 md:[--fish-text-font-size:18px] md:[--fish-line-number-font-size:26px] md:[--fish-line-height:30px] md:[--fish-gutter-extra:18px]"
>
	<FishEditor />
</div>
```

Or, if you prefer SCSS for theme-level defaults (fine-tuning only):

```css
.fish-editor {
	--fish-line-number-font-size: 24px;
	--fish-text-font-size: 18px;
	--fish-line-height: 30px;
	--fish-caret-width: 2px;
	--fish-gutter-extra: 18px; /* widen gutter further */
}
```

These values are read at render time from the editor container. Prefer the semantic Tailwind utilities for responsive behavior; use SCSS for theme fine-tuning or if you need project-wide defaults.

Note: You can factor these into your own semantic utilities later if desired, but for now the editor keeps everything local and explicit to prevent accidental app-wide changes.