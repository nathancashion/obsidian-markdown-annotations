/**
 * Types and interfaces for Markdown Annotations
 */

/**
 * Represents a character range in the document
 */
export interface CharacterRange {
	/** Starting position (grapheme cluster index) */
	location: number;
	/** Length in grapheme clusters (defaults to 1 if omitted) */
	length: number;
}

/**
 * Type of author annotation
 */
export enum AuthorType {
	Human = '@',
	AI = '&',
	Reference = '*'
}

/**
 * Represents an author identifier
 */
export interface AuthorIdentifier {
	value: string;
}

/**
 * Represents an author annotation
 */
export interface AuthorAnnotation {
	/** Type of author (@, &, or *) */
	type: AuthorType;
	/** Optional author name */
	name?: string;
	/** Optional author identifier (e.g., <email@example.com>) */
	identifier?: AuthorIdentifier;
	/** Character ranges this author contributed */
	ranges: CharacterRange[];
}

/**
 * Represents the hash annotation used for validation
 */
export interface HashAnnotation {
	/** Character range covered by the hash */
	range: CharacterRange;
	/** Hash algorithm (must be "SHA-256") */
	algorithm: string;
	/** Hash value (20-64 characters) */
	hash: string;
}

/**
 * Represents a complete annotation block
 */
export interface AnnotationBlock {
	/** Hash annotation for validation */
	hashAnnotation: HashAnnotation;
	/** All author annotations in the document */
	authorAnnotations: AuthorAnnotation[];
	/** Other annotations not parsed as hash or author annotations */
	otherAnnotations: Map<string, string>;
}

/**
 * Result of parsing a markdown file with annotations
 */
export interface ParsedDocument {
	/** The text content (excluding annotation block) */
	text: string;
	/** Parsed annotation block, if present */
	annotations?: AnnotationBlock;
	/** Whether the hash validation passed */
	hashValid: boolean;
}
