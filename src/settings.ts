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

export type HighlightStyle = 'text' | 'background';

export interface MarkdownAnnotationsSettings {
	/** Show visual indicators for annotations in the editor */
	showVisualIndicators: boolean;
	/** Color the text itself (as iA Writer does) or highlight behind it */
	highlightStyle: HighlightStyle;
	/** Warn when hash validation fails */
	warnOnHashMismatch: boolean;
	/** List of configured authors */
	authors: Author[];
	/** Author used by "Mark selection as default author"; usually you */
	defaultAuthorId: string | null;
	/** Whether the "Self" author has been offered, so deleting it sticks */
	selfSeeded: boolean;
}

export const DEFAULT_SETTINGS: MarkdownAnnotationsSettings = {
	showVisualIndicators: true,
	highlightStyle: 'text',
	warnOnHashMismatch: true,
	authors: [],
	defaultAuthorId: null,
	selfSeeded: false,
};

/**
 * Obsidian has no public API for the user's or account's name, so the human
 * author starts as "Self" (as iA Writer does) and can be renamed.
 */
const SELF_AUTHOR: Author = { id: 'self', name: 'Self', type: AuthorType.Human };

const AUTHOR_TYPES = new Set<string>(Object.values(AuthorType));

/**
 * Merge stored data over the defaults. Each load gets its own `authors` array,
 * so edits never mutate `DEFAULT_SETTINGS`, and malformed author entries are dropped.
 * The first load adds a "Self" author if there is no human author yet.
 */
export function normalizeSettings(stored: unknown): MarkdownAnnotationsSettings {
	const data = (stored && typeof stored === 'object' ? stored : {}) as Partial<MarkdownAnnotationsSettings>;
	const authors = (Array.isArray(data.authors) ? data.authors : [])
		.filter((a): a is Author => !!a && typeof a.id === 'string' && typeof a.name === 'string' && AUTHOR_TYPES.has(a.type))
		.map((a) => ({ ...a }));

	if (!data.selfSeeded && !authors.some(a => a.type === AuthorType.Human)) {
		authors.unshift({ ...SELF_AUTHOR });
	}

	const settings: MarkdownAnnotationsSettings = {
		showVisualIndicators: data.showVisualIndicators ?? DEFAULT_SETTINGS.showVisualIndicators,
		highlightStyle: data.highlightStyle === 'background' ? 'background' : 'text',
		warnOnHashMismatch: data.warnOnHashMismatch ?? DEFAULT_SETTINGS.warnOnHashMismatch,
		authors,
		defaultAuthorId: typeof data.defaultAuthorId === 'string' ? data.defaultAuthorId : null,
		selfSeeded: true,
	};
	ensureDefaultAuthor(settings);
	return settings;
}

/** Point `defaultAuthorId` at an existing author, preferring the first human. */
export function ensureDefaultAuthor(settings: MarkdownAnnotationsSettings): void {
	if (settings.authors.some(a => a.id === settings.defaultAuthorId)) return;
	const fallback = settings.authors.find(a => a.type === AuthorType.Human) ?? settings.authors[0];
	settings.defaultAuthorId = fallback?.id ?? null;
}
