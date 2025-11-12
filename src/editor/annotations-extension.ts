/**
 * CodeMirror 6 extension for highlighting annotated text
 */

import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';
import { RangeSetBuilder } from '@codemirror/state';
import { parseDocument } from '../parser/parser';
import { AuthorAnnotation, AuthorType, ParsedDocument } from '../types';
import { splitGraphemes } from '../utils/grapheme';

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

/**
 * Create the annotation highlighting extension
 */
export function createAnnotationExtension() {
	return [
		annotationsField,
		ViewPlugin.fromClass(class {
			decorations: DecorationSet;
			pending: boolean;

			constructor(view: EditorView) {
				this.decorations = Decoration.none;
				this.pending = false;
				this.updateAnnotations(view);
			}

			update(update: ViewUpdate) {
				if (update.docChanged) {
					this.updateAnnotations(update.view);
				}
				
				// Update decorations when annotations state changes
				const annotations = update.state.field(annotationsField);
				if (annotations) {
					this.decorations = this.buildDecorations(update.view, annotations);
				}
			}

			async updateAnnotations(view: EditorView) {
				if (this.pending) return;
				this.pending = true;

				try {
					const content = view.state.doc.toString();
					const parsed = await parseDocument(content);
					
					// Dispatch effect to update annotations state
					view.dispatch({
						effects: setAnnotationsEffect.of(parsed)
					});
				} catch (error) {
					console.error('Error parsing annotations:', error);
				} finally {
					this.pending = false;
				}
			}

			buildDecorations(view: EditorView, parsed: ParsedDocument): DecorationSet {
				const builder = new RangeSetBuilder<Decoration>();

				if (!parsed.annotations) {
					return builder.finish();
				}

				// Convert text to grapheme array for accurate positioning
				const graphemes = splitGraphemes(parsed.text);
				
				// Process each author annotation
				for (const annotation of parsed.annotations.authorAnnotations) {
					this.addAnnotationDecorations(annotation, graphemes, builder);
				}

				return builder.finish();
			}

			addAnnotationDecorations(
				annotation: AuthorAnnotation,
				graphemes: string[],
				builder: RangeSetBuilder<Decoration>
			) {
				for (const range of annotation.ranges) {
					try {
						// Calculate byte positions from grapheme indices
						const from = this.graphemeIndexToBytePosition(range.location, graphemes);
						const to = this.graphemeIndexToBytePosition(range.location + range.length, graphemes);

						if (from >= 0 && to >= 0 && from < to) {
							const decoration = this.createDecoration(annotation.type);
							builder.add(from, to, decoration);
						}
					} catch (error) {
						console.error('Error adding decoration for range:', range, error);
					}
				}
			}

			graphemeIndexToBytePosition(graphemeIndex: number, graphemes: string[]): number {
				// Sum the byte length of all graphemes up to the index
				let bytePosition = 0;
				for (let i = 0; i < graphemeIndex && i < graphemes.length; i++) {
					bytePosition += graphemes[i].length;
				}
				return bytePosition;
			}

			createDecoration(type: AuthorType): Decoration {
				const className = this.getClassNameForType(type);
				return Decoration.mark({ class: className });
			}

			getClassNameForType(type: AuthorType): string {
				switch (type) {
					case AuthorType.Human:
						return 'md-annotation-human';
					case AuthorType.AI:
						return 'md-annotation-ai';
					case AuthorType.Reference:
						return 'md-annotation-reference';
				}
			}
		}, {
			decorations: v => v.decorations
		})
	];
}
