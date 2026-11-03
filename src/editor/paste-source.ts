/**
 * Recognizing who wrote pasted text from where it was copied
 *
 * Browsers record the page a selection was copied from on the system clipboard.
 * When that page's address matches an author's identifier (a website such as
 * `claude.ai`), the paste is attributed to that author, as iA Writer does.
 */

import { Platform } from 'obsidian';
import type { Author } from '../settings';

interface ElectronClipboard {
	read(format: string): string;
	readBuffer(format: string): Uint8Array;
}

/** Sites that moved; an identifier naming one matches the others too. */
const SAME_SITE: string[][] = [
	['chatgpt.com', 'chat.openai.com'],
	['gemini.google.com', 'bard.google.com'],
];

function electronClipboard(): ElectronClipboard | null {
	if (!Platform.isDesktopApp) return null;
	try {
		const req = (window as unknown as { require?: (id: string) => unknown }).require;
		return (req?.('electron') as { clipboard?: ElectronClipboard } | undefined)?.clipboard ?? null;
	} catch {
		return null;
	}
}

function firstUrl(text: string): string | null {
	return text.match(/https?:\/\/[^\s\x00-\x1f"'<>]+/)?.[0] ?? null;
}

/** Address of the page the clipboard's contents were copied from, if the source app recorded one. */
export function clipboardSourceUrl(): string | null {
	const clipboard = electronClipboard();
	if (!clipboard) return null;

	const readers: (() => string | null)[] = [
		// Chrome, Edge, Arc, Brave and other Chromium browsers on macOS
		() => firstUrl(clipboard.read('org.chromium.source-url')),
		// Chromium browsers on Linux
		() => firstUrl(clipboard.read('chromium/x-source-url')),
		// Windows: the HTML clipboard format carries a SourceURL header
		() => {
			const header = clipboard.read('HTML Format').match(/^SourceURL:(.+)$/m);
			return header ? firstUrl(header[1]) : null;
		},
		// Safari: the web archive's main resource is the page
		() => firstUrl(new TextDecoder('latin1').decode(clipboard.readBuffer('com.apple.webarchive'))),
	];
	for (const read of readers) {
		try {
			const url = read();
			if (url) return url;
		} catch {
			// Format not supported on this platform
		}
	}
	return null;
}

interface Site {
	host: string;
	path: string;
}

function parseSite(address: string): Site | null {
	const trimmed = address.trim().replace(/^<|>$/g, '');
	// An email address names a person, not a site
	if (!trimmed || /^[^/]*@/.test(trimmed.replace(/^\w+:\/\//, ''))) return null;
	try {
		const url = new URL(/^\w+:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`);
		return { host: url.hostname.toLowerCase().replace(/^www\./, ''), path: url.pathname.replace(/\/+$/, '') };
	} catch {
		return null;
	}
}

/** How specifically `site` (an identifier) covers `source`; 0 when it doesn't. */
function matchScore(site: Site, source: Site): number {
	const hosts = SAME_SITE.find(group => group.includes(site.host)) ?? [site.host];
	const host = hosts.find(h => source.host === h || source.host.endsWith(`.${h}`));
	if (!host) return 0;
	if (site.path && source.path !== site.path && !source.path.startsWith(`${site.path}/`)) return 0;
	return host.length + site.path.length;
}

/** The author whose identifier best matches the page at `sourceUrl`, if any. */
export function authorForSource(authors: Author[], sourceUrl: string): Author | null {
	const source = parseSite(sourceUrl);
	if (!source) return null;
	let best: Author | null = null;
	let bestScore = 0;
	for (const author of authors) {
		const site = author.identifier ? parseSite(author.identifier) : null;
		const score = site ? matchScore(site, source) : 0;
		if (score > bestScore) {
			best = author;
			bestScore = score;
		}
	}
	return best;
}
