/**
 * Plugin settings
 */

export interface MarkdownAnnotationsSettings {
	/** Show visual indicators for annotations in the editor */
	showVisualIndicators: boolean;
	/** Default author name for new annotations */
	defaultAuthorName: string;
	/** Default author identifier (e.g., email) */
	defaultAuthorIdentifier: string;
	/** Warn when hash validation fails */
	warnOnHashMismatch: boolean;
}

export const DEFAULT_SETTINGS: MarkdownAnnotationsSettings = {
	showVisualIndicators: true,
	defaultAuthorName: '',
	defaultAuthorIdentifier: '',
	warnOnHashMismatch: true
};
