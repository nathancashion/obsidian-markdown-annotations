/**
 * CodeMirror 6 extension for highlighting annotated text
 */

import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { Prec, type Range } from '@codemirror/state';
import { formatAuthorKey } from '../annotations/block';
import { parseDocument } from '../parser/parser';
import { AuthorType } from '../types';
import type MarkdownAnnotationsPlugin from '../main';
import {
	AuthorshipState,
	authorshipField,
	authorshipWrite,
	bodyEnd,
	expectPaste,
	loadParsed,
	pendingPasteField,
	typingAuthor,
	writeAuthorship,
} from './authorship-state';
import { authorForSource, clipboardSourceUrl } from './paste-source';

const DECORATIONS: Record<AuthorType, Decoration> = {
	[AuthorType.Human]: Decoration.mark({ class: 'md-annotation-human' }),
	[AuthorType.AI]: Decoration.mark({ class: 'md-annotation-ai' }),
	[AuthorType.Reference]: Decoration.mark({ class: 'md-annotation-reference' }),
};

/** How long typing must pause before the annotation block is rewritten to match. */
const UPKEEP_DELAY_MS = 1000;

/** How long a recognized paste waits for the editor to insert it (Obsidian may convert HTML first). */
const PASTE_WINDOW_MS = 1000;

/**
 * Create the annotation highlighting extension
 */
export function createAnnotationExtension(plugin: MarkdownAnnotationsPlugin) {
	return [
		authorshipField,
		pendingPasteField,
		typingAuthor.of(() => {
			const author = plugin.getDefaultAuthor();
			return author && { key: formatAuthorKey(author), type: author.type };
		}),
		// Runs before Obsidian's own paste handling, which inserts the text
		Prec.highest(EditorView.domEventHandlers({
			paste(event, view) {
				if (!plugin.settings.recognizePasteSource || !event.clipboardData?.getData('text/plain')) return false;
				if (view.state.selection.main.from > bodyEnd(view.state)) return false;
				const source = clipboardSourceUrl();
				const author = source && authorForSource(plugin.settings.authors, source);
				if (!author) return false;

				view.dispatch({ effects: expectPaste.of({ key: formatAuthorKey(author), type: author.type }) });
				window.setTimeout(() => {
					if (view.state.field(pendingPasteField, false)) view.dispatch({ effects: expectPaste.of(null) });
				}, PASTE_WINDOW_MS);
				return false;
			},
		})),
		ViewPlugin.fromClass(class {
			decorations: DecorationSet;
			private parsing = false;
			private stale = false;
			private destroyed = false;
			private upkeepTimer: number | null = null;
			/** The pending upkeep may add a block to a note without one */
			private upkeepCreates = false;

			constructor(private view: EditorView) {
				this.decorations = this.buildDecorations(view.state.field(authorshipField));
				void this.updateAnnotations();
			}

			update(update: ViewUpdate) {
				const authorship = update.state.field(authorshipField);
				// `workspace.updateOptions()` reconfigures the editor after a settings change
				const reconfigured = update.transactions.some(tr => tr.reconfigured);

				if (authorship !== update.startState.field(authorshipField) || reconfigured) {
					this.decorations = this.buildDecorations(authorship);
				}

				if (update.docChanged) {
					void this.updateAnnotations();
					const typed = update.transactions.some(tr => tr.docChanged && !tr.annotation(authorshipWrite));
					// A recognized paste can add the first authorship to a note
					const pasted = update.transactions.some(tr => tr.docChanged && tr.startState.field(pendingPasteField, false));
					if (typed) this.scheduleUpkeep(pasted);
				}
			}

			destroy() {
				this.destroyed = true;
				if (this.upkeepTimer !== null) window.clearTimeout(this.upkeepTimer);
			}

			async updateAnnotations() {
				// Parsing is async (hashing), so coalesce edits that arrive mid-parse
				// into one more pass rather than dropping them.
				if (this.parsing) {
					this.stale = true;
					return;
				}
				this.parsing = true;

				try {
					do {
						this.stale = false;
						const parsed = await parseDocument(this.view.state.doc.toString());
						if (this.destroyed) return;
						if (!this.stale) {
							this.view.dispatch({ effects: loadParsed.of(parsed) });
						}
					} while (this.stale);
				} catch (error) {
					console.error('Error parsing annotations:', error);
				} finally {
					this.parsing = false;
				}
			}

			/**
			 * After edits, rewrite the block so its ranges and hash match the text again.
			 * Only for notes that already have a block whose ranges we trust, unless
			 * `create` allows adding one.
			 */
			scheduleUpkeep(create = false) {
				if (this.upkeepTimer !== null) window.clearTimeout(this.upkeepTimer);
				this.upkeepCreates ||= create;
				this.upkeepTimer = window.setTimeout(() => {
					this.upkeepTimer = null;
					const creates = this.upkeepCreates;
					this.upkeepCreates = false;
					if (this.destroyed) return;
					const { spans, other, blockText, trusted } = this.view.state.field(authorshipField);
					if (!trusted || (blockText === null && !(creates && spans.length))) return;
					void writeAuthorship(this.view, spans, other, { addToHistory: false, expectBlockText: blockText ?? undefined });
				}, UPKEEP_DELAY_MS);
			}

			buildDecorations(authorship: AuthorshipState): DecorationSet {
				if (!plugin.settings.showVisualIndicators) return Decoration.none;
				const ranges: Range<Decoration>[] = authorship.spans.map(span =>
					DECORATIONS[span.type].range(span.from, span.to));
				return Decoration.set(ranges, true);
			}
		}, {
			decorations: v => v.decorations
		})
	];
}
