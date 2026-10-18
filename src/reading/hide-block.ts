/**
 * Hide the annotation block in Reading view and in exports (PDF export renders
 * through the same Markdown post-processors).
 */

import type { MarkdownPostProcessorContext } from 'obsidian';
import { blockStartLine } from '../annotations/block';

export const HIDDEN_CLASS = 'md-annotations-block';

/** Hash annotation line, e.g. `Annotations: 0,95 SHA-256 1132bf5e…` */
const HASH_LINE = /^\s*[^:\n]+:\s*\d+(?:,\d+)?\s+SHA-256\s+[0-9a-f]{20,64}\b/;

let cachedText: string | null = null;
let cachedLine: number | null = null;

function startLine(text: string): number | null {
	if (text !== cachedText) {
		cachedText = text;
		cachedLine = blockStartLine(text);
	}
	return cachedLine;
}

export function hideAnnotationBlock(el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
	const info = ctx.getSectionInfo(el);
	if (info) {
		const line = startLine(info.text);
		if (line !== null && info.lineStart >= line) el.addClass(HIDDEN_CLASS);
		return;
	}

	// Without section info, recognize the block's paragraph by its hash line.
	// The `---` rule before it is hidden from CSS (see styles.css).
	const paragraph = el.matches('p') ? el : el.querySelector(':scope > p');
	if (paragraph && HASH_LINE.test(paragraph.textContent ?? '')) {
		el.addClass(HIDDEN_CLASS);
	}
}
