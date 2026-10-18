/**
 * CodeMirror 6 extension for highlighting annotated text
 */

import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { StateField, StateEffect, type Range } from '@codemirror/state';
import { parseDocument } from '../parser/parser';
import { AuthorType, ParsedDocument } from '../types';
import { splitGraphemes } from '../utils/grapheme';
import type MarkdownAnnotationsPlugin from '../main';

/**
 * State effect to update annotations
 */
const setAnnotationsEffect = StateEffect.define<ParsedDocument>();

/**
 * State field to store parsed annotations
 */
const annotationsField = StateField.define<ParsedDocument | null>({
	create() {
		return null;
	},
	update(value, tr) {
		for (const effect of tr.effects) {
			if (effect.is(setAnnotationsEffect)) {
				return effect.value;
			}
		}
		return value;
	}
});

const DECORATIONS: Record<AuthorType, Decoration> = {
	[AuthorType.Human]: Decoration.mark({ class: 'md-annotation-human' }),
	[AuthorType.AI]: Decoration.mark({ class: 'md-annotation-ai' }),
	[AuthorType.Reference]: Decoration.mark({ class: 'md-annotation-reference' }),
};

/**
 * Create the annotation highlighting extension
 */
export function createAnnotationExtension(plugin: MarkdownAnnotationsPlugin) {
	return [
		annotationsField,
		ViewPlugin.fromClass(class {
			decorations: DecorationSet = Decoration.none;
			private parsing = false;
			private stale = false;
			private destroyed = false;

			constructor(view: EditorView) {
				void this.updateAnnotations(view);
			}

			update(update: ViewUpdate) {
				const annotations = update.state.field(annotationsField);
				const annotationsChanged = annotations !== update.startState.field(annotationsField);
				// `workspace.updateOptions()` reconfigures the editor after a settings change
				const reconfigured = update.transactions.some(tr => tr.reconfigured);

				if (annotationsChanged || reconfigured) {
					this.decorations = this.buildDecorations(annotations);
				} else if (update.docChanged) {
					// Keep highlights attached to their text until the reparse lands
					this.decorations = this.decorations.map(update.changes);
				}

				if (update.docChanged) {
					void this.updateAnnotations(update.view);
				}
			}

			destroy() {
				this.destroyed = true;
			}

			async updateAnnotations(view: EditorView) {
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
						const parsed = await parseDocument(view.state.doc.toString());
						if (this.destroyed) return;
						if (!this.stale) {
							view.dispatch({ effects: setAnnotationsEffect.of(parsed) });
						}
					} while (this.stale);
				} catch (error) {
					console.error('Error parsing annotations:', error);
				} finally {
					this.parsing = false;
				}
			}

			buildDecorations(parsed: ParsedDocument | null): DecorationSet {
				if (!plugin.settings.showVisualIndicators || !parsed?.annotations) {
					return Decoration.none;
				}

				// offsets[i] is the string offset of grapheme i
				const graphemes = splitGraphemes(parsed.text);
				const offsets = new Array<number>(graphemes.length + 1);
				offsets[0] = 0;
				for (let i = 0; i < graphemes.length; i++) {
					offsets[i + 1] = offsets[i] + graphemes[i].length;
				}
				const toOffset = (index: number) => offsets[Math.min(Math.max(index, 0), graphemes.length)];

				const ranges: Range<Decoration>[] = [];
				for (const annotation of parsed.annotations.authorAnnotations) {
					const decoration = DECORATIONS[annotation.type];
					for (const range of annotation.ranges) {
						const from = toOffset(range.location);
						const to = toOffset(range.location + range.length);
						if (from < to) {
							ranges.push(decoration.range(from, to));
						}
					}
				}

				// Authors' ranges interleave, so let CodeMirror sort them
				return Decoration.set(ranges, true);
			}
		}, {
			decorations: v => v.decorations
		})
	];
}
