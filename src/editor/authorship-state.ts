/**
 * Authorship as editor state.
 *
 * Annotation ranges are stored as grapheme indexes in the file, but while a note
 * is open they live here as document offsets ("spans") and are mapped through
 * every edit, so they keep pointing at the right text. Writing serializes the
 * spans back into the annotation block with a fresh hash.
 */

import { Annotation, ChangeDesc, ChangeSet, EditorState, StateEffect, StateField, Transaction } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { editorInfoField } from 'obsidian';
import { AuthorEntry, buildBlockText, formatAuthorKey, locateBlock } from '../annotations/block';
import { AuthorType, CharacterRange, ParsedDocument } from '../types';
import { splitGraphemes } from '../utils/grapheme';

export interface Span {
	from: number;
	to: number;
	/** Annotation key, e.g. `&Claude <https://claude.ai>` */
	key: string;
	type: AuthorType;
}

export interface AuthorshipState {
	/** Sorted, non-overlapping spans in document offsets */
	spans: Span[];
	/** Block lines the spans were loaded from or last written as; null when the note has no block */
	blockText: string | null;
	/** Whether the stored hash matched the text at the last parse */
	hashValid: boolean;
	/** Whether the spans can be trusted: loaded with a valid hash, written by us, or kept by the user */
	trusted: boolean;
	/** Non-author annotations, preserved on write */
	other: [string, string][];
}

const EMPTY: AuthorshipState = { spans: [], blockText: null, hashValid: true, trusted: true, other: [] };

/** A parse of the current document finished. */
export const loadParsed = StateEffect.define<ParsedDocument>();
/** Replace the authorship state outright (after a write, or when the user keeps misplaced spans). */
export const setAuthorship = StateEffect.define<AuthorshipState>();
/** Marks transactions this plugin made, so they don't schedule another write. */
export const authorshipWrite = Annotation.define<boolean>();

export const authorshipField = StateField.define<AuthorshipState>({
	create: () => EMPTY,
	update(value, tr) {
		let next = tr.docChanged ? { ...value, spans: mapSpans(value.spans, tr.changes) } : value;
		for (const effect of tr.effects) {
			if (effect.is(setAuthorship)) {
				next = effect.value;
			} else if (effect.is(loadParsed)) {
				const parsed = effect.value;
				// Same block as before means only the text changed: the mapped spans
				// are more accurate than the stored ranges, so keep them.
				next = parsed.blockText !== undefined && parsed.blockText === next.blockText
					? { ...next, hashValid: parsed.hashValid }
					: fromParsed(parsed);
			}
		}
		return next;
	}
});

function fromParsed(parsed: ParsedDocument): AuthorshipState {
	if (!parsed.annotations || parsed.blockText === undefined) return EMPTY;

	const offsets = graphemeOffsets(parsed.text);
	const toOffset = (index: number) => offsets[Math.min(Math.max(index, 0), offsets.length - 1)];

	let spans: Span[] = [];
	for (const annotation of parsed.annotations.authorAnnotations) {
		const key = formatAuthorKey({
			type: annotation.type,
			name: annotation.name,
			identifier: annotation.identifier?.value,
		});
		for (const range of annotation.ranges) {
			const from = toOffset(range.location);
			const to = toOffset(range.location + range.length);
			if (from < to) spans = replaceSpans(spans, from, to, { key, type: annotation.type });
		}
	}

	return {
		spans,
		blockText: parsed.blockText,
		hashValid: parsed.hashValid,
		trusted: parsed.hashValid,
		other: [...parsed.annotations.otherAnnotations.entries()],
	};
}

function mapSpans(spans: Span[], changes: ChangeDesc): Span[] {
	const mapped: Span[] = [];
	for (const span of spans) {
		// Text typed inside a span joins it; text typed at either edge does not.
		const from = changes.mapPos(span.from, 1);
		const to = changes.mapPos(span.to, -1);
		if (from < to) mapped.push({ ...span, from, to });
	}
	return mapped;
}

/** Replace whatever authorship covers `[from, to)` with `author`, or clear it when null. */
export function replaceSpans(
	spans: Span[],
	from: number,
	to: number,
	author: Pick<Span, 'key' | 'type'> | null
): Span[] {
	const result: Span[] = [];
	for (const span of spans) {
		if (span.to <= from || span.from >= to) {
			result.push(span);
			continue;
		}
		if (span.from < from) result.push({ ...span, to: from });
		if (span.to > to) result.push({ ...span, from: to });
	}
	if (author && from < to) result.push({ from, to, ...author });
	result.sort((a, b) => a.from - b.from);

	// Merge touching spans by the same author
	const merged: Span[] = [];
	for (const span of result) {
		const last = merged[merged.length - 1];
		if (last && last.key === span.key && last.to === span.from) {
			last.to = span.to;
		} else {
			merged.push({ ...span });
		}
	}
	return merged;
}

export function spanAt(spans: Span[], pos: number): Span | null {
	return spans.find(span => span.from <= pos && pos < span.to) ?? null;
}

/** The single author covering all of `[from, to)`, or null if it is mixed or partly unannotated. */
export function uniformKey(spans: Span[], from: number, to: number): string | null {
	const covering = spans.filter(span => span.to > from && span.from < to);
	if (!covering.length || covering[0].from > from || covering[covering.length - 1].to < to) return null;
	for (let i = 0; i < covering.length; i++) {
		if (covering[i].key !== covering[0].key) return null;
		if (i > 0 && covering[i - 1].to !== covering[i].from) return null;
	}
	return covering[0].key;
}

/** Offset where the text ends and the annotation block (if any) begins. */
export function bodyEnd(state: EditorState): number {
	return locateBlock(state.doc.toString())?.bodyEnd ?? state.doc.length;
}

/** offsets[i] is the string offset of grapheme i; the last entry is the text length. */
function graphemeOffsets(text: string): number[] {
	const graphemes = splitGraphemes(text);
	const offsets = new Array<number>(graphemes.length + 1);
	offsets[0] = 0;
	for (let i = 0; i < graphemes.length; i++) offsets[i + 1] = offsets[i] + graphemes[i].length;
	return offsets;
}

/** Index of the first grapheme starting at or after `offset`. */
function graphemeIndex(offsets: number[], offset: number): number {
	let lo = 0;
	let hi = offsets.length - 1;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if (offsets[mid] < offset) lo = mid + 1;
		else hi = mid;
	}
	return lo;
}

export interface PasteEdit {
	/** Range of the current document to replace, in offsets before the paste */
	from: number;
	to: number;
	text: string;
	/** Author of the pasted text */
	author: Pick<Span, 'key' | 'type'>;
}

export interface WriteOptions {
	/** Record the write in undo history. Automatic upkeep after typing does not. */
	addToHistory: boolean;
	/** Only write if the document still ends with this block. Guards against a file switch or a hand edit landing first. */
	expectBlockText?: string;
	/** Insert text in the same transaction and attribute it, so one undo removes both. `spans` are in offsets before the paste. */
	paste?: PasteEdit;
}

/**
 * Serialize `spans` into the document's annotation block, replacing any existing
 * block. Removes the block when nothing is left to record.
 */
export async function writeAuthorship(
	view: EditorView,
	spans: Span[],
	other: [string, string][],
	options: WriteOptions
): Promise<boolean> {
	const path = view.state.field(editorInfoField, false)?.file?.path;

	// Hashing is async; retry if the document changes underneath us.
	for (let attempt = 0; attempt < 3; attempt++) {
		const doc = view.state.doc;
		const original = doc.toString();
		const location = locateBlock(original);
		if (options.expectBlockText !== undefined && location?.blockText !== options.expectBlockText) return false;

		const end = location?.bodyEnd ?? original.length;
		const { paste } = options;
		if (paste && (paste.from > end || paste.to > end)) return false;

		// Work out the text and spans as they will be once the paste lands
		let pasteChange: ChangeSet | null = null;
		let content = original;
		let pending = spans;
		if (paste) {
			pasteChange = ChangeSet.of({ from: paste.from, to: paste.to, insert: paste.text }, doc.length);
			content = original.slice(0, paste.from) + paste.text + original.slice(paste.to);
			pending = replaceSpans(mapSpans(spans, pasteChange), paste.from, paste.from + paste.text.length, paste.author);
		}
		const newEnd = pasteChange ? pasteChange.mapPos(end, 1) : end;

		const body = content.slice(0, newEnd);
		const kept = pending
			.map(span => ({ ...span, to: Math.min(span.to, newEnd) }))
			.filter(span => span.from < span.to);

		let insert: string;
		let blockText: string | null;
		if (!kept.length && !other.length) {
			if (!location && !paste) return false;
			insert = '';
			blockText = null;
		} else {
			// Keep an empty line before `---`, so the last line of text isn't read as a heading.
			const separator = body.endsWith('\n') ? '' : '\n';
			const text = body + separator;
			blockText = await buildBlockText(text, toEntries(text, kept), other);
			insert = `${separator}\n---\n${blockText}\n...\n`;
		}

		if (view.state.doc !== doc) continue;
		if (view.state.field(editorInfoField, false)?.file?.path !== path) return false;
		if (!paste && original.slice(end) === insert) return true;

		// Both changes are in pre-paste offsets; the paste sits before the block.
		const changes = [{ from: end, to: doc.length, insert }];
		if (paste) changes.unshift({ from: paste.from, to: paste.to, insert: paste.text });

		view.dispatch({
			changes,
			effects: setAuthorship.of({ spans: kept, blockText, hashValid: true, trusted: true, other }),
			selection: paste ? { anchor: paste.from + paste.text.length } : undefined,
			scrollIntoView: !!paste,
			userEvent: paste ? 'input.paste' : undefined,
			annotations: [authorshipWrite.of(true), Transaction.addToHistory.of(options.addToHistory)],
		});
		return true;
	}
	return false;
}

function toEntries(text: string, spans: Span[]): AuthorEntry[] {
	const offsets = graphemeOffsets(text);
	const entries = new Map<string, CharacterRange[]>();
	for (const span of spans) {
		const location = graphemeIndex(offsets, span.from);
		const length = graphemeIndex(offsets, span.to) - location;
		if (length <= 0) continue;
		const ranges = entries.get(span.key) ?? [];
		ranges.push({ location, length });
		entries.set(span.key, ranges);
	}
	return [...entries].map(([key, ranges]) => ({ key, ranges }));
}
