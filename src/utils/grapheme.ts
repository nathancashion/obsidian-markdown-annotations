/**
 * Utilities for working with grapheme clusters
 * Uses the graphemer library to handle Unicode grapheme clusters correctly
 */

import Graphemer from 'graphemer';

const splitter = new Graphemer();

/**
 * Split text into grapheme clusters
 * @param text Text to split
 * @returns Array of grapheme clusters
 */
export function splitGraphemes(text: string): string[] {
	return splitter.splitGraphemes(text);
}

/**
 * Count grapheme clusters in text
 * @param text Text to count
 * @returns Number of grapheme clusters
 */
export function countGraphemes(text: string): number {
	return splitter.countGraphemes(text);
}

/**
 * Extract substring based on grapheme cluster indices
 * @param text Source text
 * @param start Starting grapheme index
 * @param length Number of grapheme clusters to extract
 * @returns Substring
 */
export function substringGraphemes(text: string, start: number, length: number): string {
	const graphemes = splitGraphemes(text);
	return graphemes.slice(start, start + length).join('');
}

/**
 * Get grapheme cluster at a specific index
 * @param text Source text
 * @param index Grapheme cluster index
 * @returns Grapheme cluster at that position, or empty string if out of bounds
 */
export function graphemeAt(text: string, index: number): string {
	const graphemes = splitGraphemes(text);
	return graphemes[index] || '';
}
