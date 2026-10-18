/**
 * Plugin settings
 */

import { AuthorType } from './types';

/**
 * Represents a configured author that can be used for annotations
 */
export interface Author {
	/** Unique ID for this author */
	id: string;
	/** Display name */
	name: string;
	/** Type of author (@, &, or *) */
	type: AuthorType;
	/** Optional identifier (e.g., email, website) */
	identifier?: string;
}

export interface MarkdownAnnotationsSettings {
	/** Show visual indicators for annotations in the editor */
	showVisualIndicators: boolean;
	/** Warn when hash validation fails */
	warnOnHashMismatch: boolean;
	/** List of configured authors */
	authors: Author[];
}

export const DEFAULT_SETTINGS: MarkdownAnnotationsSettings = {
	showVisualIndicators: true,
	warnOnHashMismatch: true,
	authors: []
};

const AUTHOR_TYPES = new Set<string>(Object.values(AuthorType));

/**
 * Merge stored data over the defaults. Each load gets its own `authors` array,
 * so edits never mutate `DEFAULT_SETTINGS`, and malformed author entries are dropped.
 */
export function normalizeSettings(stored: unknown): MarkdownAnnotationsSettings {
	const data = (stored && typeof stored === 'object' ? stored : {}) as Partial<MarkdownAnnotationsSettings>;
	const authors = Array.isArray(data.authors) ? data.authors : [];
	return {
		showVisualIndicators: data.showVisualIndicators ?? DEFAULT_SETTINGS.showVisualIndicators,
		warnOnHashMismatch: data.warnOnHashMismatch ?? DEFAULT_SETTINGS.warnOnHashMismatch,
		authors: authors
			.filter((a): a is Author => !!a && typeof a.id === 'string' && typeof a.name === 'string' && AUTHOR_TYPES.has(a.type))
			.map((a) => ({ ...a })),
	};
}
