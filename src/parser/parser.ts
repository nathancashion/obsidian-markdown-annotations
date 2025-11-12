/**
 * Parser for Markdown Annotations
 */

import {
	ParsedDocument,
	AnnotationBlock,
	HashAnnotation,
	AuthorAnnotation,
	AuthorType,
	CharacterRange,
	AuthorIdentifier
} from '../types';
import { validateHash } from '../utils/hash';
import { countGraphemes, substringGraphemes } from '../utils/grapheme';

/**
 * Parse a markdown document with annotations
 * @param content Full markdown file content
 * @returns Parsed document with text and annotations
 */
export async function parseDocument(content: string): Promise<ParsedDocument> {
	// Split into text and annotation block
	const blockMatch = content.match(/\n---\n(.*?)\n\.\.\.\s*$/s);
	
	if (!blockMatch) {
		// No annotation block found
		return {
			text: content,
			hashValid: true
		};
	}
	
	const text = content.substring(0, blockMatch.index);
	const annotationBlockContent = blockMatch[1];
	
	try {
		const annotations = parseAnnotationBlock(annotationBlockContent);
		
		// Validate hash
		const hashValid = await validateAnnotationHash(text, annotations.hashAnnotation);
		
		return {
			text,
			annotations,
			hashValid
		};
	} catch (error) {
		// Invalid annotation block
		return {
			text: content,
			hashValid: false
		};
	}
}

/**
 * Parse the annotation block content
 * @param content Content between --- and ...
 * @returns Parsed annotation block
 */
function parseAnnotationBlock(content: string): AnnotationBlock {
	const lines = content.split('\n');
	const annotations = parseAnnotations(lines);
	
	// Extract hash annotation (must be first)
	const hashKey = annotations.keys().next().value;
	if (!hashKey || (!hashKey.startsWith('Annotations') && hashKey !== 'Annotations')) {
		throw new Error('Missing or invalid hash annotation');
	}
	
	const hashValue = annotations.get(hashKey);
	if (!hashValue) {
		throw new Error('Missing hash annotation value');
	}
	
	const hashAnnotation = parseHashAnnotation(hashValue);
	annotations.delete(hashKey);
	
	// Parse author annotations
	const authorAnnotations: AuthorAnnotation[] = [];
	const otherAnnotations = new Map<string, string>();
	
	for (const [key, value] of annotations.entries()) {
		if (key.startsWith('@') || key.startsWith('&') || key.startsWith('*')) {
			authorAnnotations.push(parseAuthorAnnotation(key, value));
		} else {
			otherAnnotations.set(key, value);
		}
	}
	
	return {
		hashAnnotation,
		authorAnnotations,
		otherAnnotations
	};
}

/**
 * Parse annotations from lines into key-value pairs
 * Handles continuation lines with proper indentation
 */
function parseAnnotations(lines: string[]): Map<string, string> {
	const annotations = new Map<string, string>();
	let currentKey: string | null = null;
	let currentValue: string[] = [];
	let minIndent: number | null = null;
	
	for (const line of lines) {
		// Check if this is a new annotation (contains unescaped colon)
		const colonMatch = line.match(/^(\s*)([^:]+?)(\s*):\s*(.*?)$/);
		
		if (colonMatch && !colonMatch[2].endsWith('\\')) {
			// Save previous annotation
			if (currentKey !== null) {
				annotations.set(currentKey, currentValue.join('\n'));
			}
			
			// Start new annotation
			const indent = colonMatch[1];
			currentKey = colonMatch[2].trim().replace(/\\:/g, ':');
			const value = colonMatch[4].trimEnd();
			currentValue = value ? [value] : [];
			minIndent = null;
		} else if (currentKey !== null) {
			// Continuation line
			const indent = line.match(/^(\s*)/)?.[1].length || 0;
			
			if (minIndent === null && line.trim()) {
				minIndent = indent;
			}
			
			if (minIndent !== null && indent >= minIndent) {
				const content = line.substring(minIndent);
				currentValue.push(content);
			}
		}
	}
	
	// Save last annotation
	if (currentKey !== null) {
		annotations.set(currentKey, currentValue.join('\n'));
	}
	
	return annotations;
}

/**
 * Parse hash annotation value
 * Format: "0,95 SHA-256 1132bf5e376a605f5beed4b204456114"
 */
function parseHashAnnotation(value: string): HashAnnotation {
	const parts = value.trim().split(/\s+/);
	
	if (parts.length < 3) {
		throw new Error('Invalid hash annotation format');
	}
	
	const range = parseCharacterRange(parts[0]);
	const algorithm = parts[1];
	const hash = parts[2];
	
	if (algorithm !== 'SHA-256') {
		throw new Error(`Unsupported hash algorithm: ${algorithm}`);
	}
	
	if (hash.length < 20 || hash.length > 64) {
		throw new Error('Hash must be 20-64 characters');
	}
	
	return { range, algorithm, hash };
}

/**
 * Parse author annotation
 * Format: "@Name <id>: 0,10 20,5 ..."
 */
function parseAuthorAnnotation(key: string, value: string): AuthorAnnotation {
	// Parse type
	const type = key[0] as AuthorType;
	
	// Parse name and identifier
	let name: string | undefined;
	let identifier: AuthorIdentifier | undefined;
	
	const keyContent = key.substring(1).trim();
	if (keyContent) {
		const identifierMatch = keyContent.match(/<([^>]+)>\s*$/);
		if (identifierMatch) {
			identifier = { value: identifierMatch[1] };
			name = keyContent.substring(0, identifierMatch.index).trim();
		} else {
			name = keyContent;
		}
	}
	
	// Parse ranges
	const ranges: CharacterRange[] = [];
	const rangeParts = value.trim().split(/\s+/);
	
	for (const part of rangeParts) {
		if (part && /^\d+/.test(part)) {
			ranges.push(parseCharacterRange(part));
		}
	}
	
	return {
		type,
		name,
		identifier,
		ranges
	};
}

/**
 * Parse a character range string
 * Format: "location,length" or "location" (length defaults to 1)
 */
function parseCharacterRange(rangeStr: string): CharacterRange {
	const parts = rangeStr.split(',');
	const location = parseInt(parts[0], 10);
	const length = parts[1] ? parseInt(parts[1], 10) : 1;
	
	if (isNaN(location) || isNaN(length)) {
		throw new Error(`Invalid character range: ${rangeStr}`);
	}
	
	return { location, length };
}

/**
 * Validate hash annotation against text
 */
async function validateAnnotationHash(text: string, hashAnnotation: HashAnnotation): Promise<boolean> {
	const { range, hash } = hashAnnotation;
	
	// Extract the text covered by the hash range
	const hashedText = substringGraphemes(text, range.location, range.length);
	
	return validateHash(hashedText, hash);
}
