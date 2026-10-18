/**
 * CodeMirror 6 extension for highlighting annotated text
 */

import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import type { Range } from '@codemirror/state';
import { parseDocument } from '../parser/parser';
import { AuthorType } from '../types';
import type MarkdownAnnotationsPlugin from '../main';
import { AuthorshipState, authorshipField, authorshipWrite, loadParsed, writeAuthorship } from './authorship-state';

const DECORATIONS: Record<AuthorType, Decoration> = {
	[AuthorType.Human]: Decoration.mark({ class: 'md-annotation-human' }),
	[AuthorType.AI]: Decoration.mark({ class: 'md-annotation-ai' }),
	[AuthorType.Reference]: Decoration.mark({ class: 'md-annotation-reference' }),
};

/** How long typing must pause before the annotation block is rewritten to match. */
const UPKEEP_DELAY_MS = 1000;

/**
 * Create the annotation highlighting extension
 */
export function createAnnotationExtension(plugin: MarkdownAnnotationsPlugin) {
	return [
		authorshipField,
		ViewPlugin.fromClass(class {
			decorations: DecorationSet;
			private parsing = false;
			private stale = false;
			private destroyed = false;
			private upkeepTimer: number | null = null;

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
					if (typed) this.scheduleUpkeep();
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
			 * Only for notes that already have a block whose ranges we trust.
			 */
			scheduleUpkeep() {
				if (this.upkeepTimer !== null) window.clearTimeout(this.upkeepTimer);
				this.upkeepTimer = window.setTimeout(() => {
					this.upkeepTimer = null;
					if (this.destroyed) return;
					const { spans, other, blockText, trusted } = this.view.state.field(authorshipField);
					if (blockText === null || !trusted) return;
					void writeAuthorship(this.view, spans, other, { addToHistory: false, expectBlockText: blockText });
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
