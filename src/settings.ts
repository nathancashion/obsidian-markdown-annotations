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
