/**
 * Locating and writing the annotation block at the end of a document
 */

import { AuthorType, CharacterRange } from '../types';
import { countGraphemes } from '../utils/grapheme';
import { calculateSHA256 } from '../utils/hash';

export interface BlockLocation {
	/** Offset where the text ends and the block's `\n---\n` opener begins */
	bodyEnd: number;
	/** Annotation lines between the `---` and `...` lines */
	blockText: string;
}

const BLOCK_TAIL = /^\n---\n([\s\S]*?)\n\.\.\.\s*$/;

/**
 * Find the annotation block. It must be the last `---` … `...` section of the
 * file, so search from the end: frontmatter and horizontal rules earlier in the
 * text also produce `\n---\n`.
 */
export function locateBlock(content: string): BlockLocation | null {
	const start = content.lastIndexOf('\n---\n');
	if (start < 0) return null;
	const match = content.slice(start).match(BLOCK_TAIL);
	return match ? { bodyEnd: start, blockText: match[1] } : null;
}

/** Zero-based line number of the block's `---` line, or null without a block. */
export function blockStartLine(content: string): number | null {
	const location = locateBlock(content);
	if (!location) return null;
	let line = 0;
	for (let i = 0; i <= location.bodyEnd; i++) {
		if (content.charCodeAt(i) === 10) line++;
	}
	return line;
}

export interface AuthorKeyParts {
	type: AuthorType;
	name?: string;
	identifier?: string;
}

/** Annotation key for an author, e.g. `@Jane Doe <jane@example.com>`. */
export function formatAuthorKey({ type, name, identifier }: AuthorKeyParts): string {
	const escapedName = (name ?? '').replace(/:/g, '\\:');
	return `${type}${escapedName}${identifier ? ` <${identifier}>` : ''}`;
}

export interface AuthorEntry {
	key: string;
	ranges: CharacterRange[];
}

function formatRange({ location, length }: CharacterRange): string {
	return length === 1 ? `${location}` : `${location},${length}`;
}

/**
 * Build the annotation lines for `text`, hashing all of it. Lines end with two
 * spaces, as iA Writer writes them, so tools unaware of annotations still
 * render one annotation per line.
 */
export async function buildBlockText(
	text: string,
	authors: AuthorEntry[],
	other: [string, string][]
): Promise<string> {
	const hash = await calculateSHA256(text, 32);
	const lines = [`Annotations: 0,${countGraphemes(text)} SHA-256 ${hash}`];
	for (const { key, ranges } of authors) {
		lines.push(`${key}: ${ranges.map(formatRange).join(' ')}`);
	}
	for (const [key, value] of other) {
		const [first, ...rest] = value.split('\n');
		lines.push(`${key.replace(/:/g, '\\:')}: ${first}`, ...rest.map(line => `  ${line}`));
	}
	return lines.map(line => `${line}  `).join('\n');
}
