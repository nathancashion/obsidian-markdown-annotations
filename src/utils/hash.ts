/**
 * Utilities for hash calculation and validation
 */

/**
 * Calculate SHA-256 hash of a string
 * @param text Text to hash
 * @param truncate Optional length to truncate the hash (20-64 characters)
 * @returns Hex-encoded SHA-256 hash
 */
export async function calculateSHA256(text: string, truncate?: number): Promise<string> {
	// Convert string to UTF-8 bytes
	const encoder = new TextEncoder();
	const data = encoder.encode(text);
	
	// Calculate SHA-256 hash
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	
	// Convert to hex string
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
	
	// Truncate if requested (must be 20-64 characters)
	if (truncate !== undefined) {
		if (truncate < 20 || truncate > 64) {
			throw new Error('Hash truncation must be between 20 and 64 characters');
		}
		return hashHex.substring(0, truncate);
	}
	
	return hashHex;
}

/**
 * Validate a hash against text
 * @param text Text to validate
 * @param expectedHash Expected hash value
 * @returns True if the hash matches (considering truncation)
 */
export async function validateHash(text: string, expectedHash: string): Promise<boolean> {
	const fullHash = await calculateSHA256(text);
	return fullHash.startsWith(expectedHash);
}
