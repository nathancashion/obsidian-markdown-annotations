/**
 * Editor context menu and commands for assigning authorship
 */

import { EditorView } from '@codemirror/view';
import { ConfirmationModal, Editor, FuzzySuggestModal, Menu, MenuItem, Notice } from 'obsidian';
import { formatAuthorKey } from '../annotations/block';
import type MarkdownAnnotationsPlugin from '../main';
import type { Author } from '../settings';
import { AuthorType } from '../types';
import { AuthorEditModal } from '../ui/settings-tab';
import {
	AuthorshipState,
	authorshipField,
	bodyEnd,
	replaceSpans,
	setAuthorship,
	spanAt,
	uniformKey,
	writeAuthorship,
} from './authorship-state';

const AUTHOR_ICONS: Record<AuthorType, string> = {
	[AuthorType.Human]: 'user',
	[AuthorType.AI]: 'bot',
	[AuthorType.Reference]: 'quote',
};

const SECTION = 'authorship';

export const authorKey = (author: Author) => formatAuthorKey(author);

/**
 * `Editor` doesn't expose its CodeMirror view in the public API, but every
 * Markdown editor has one at `editor.cm`.
 */
export function getEditorView(editor: Editor): EditorView | null {
	const cm = (editor as unknown as { cm?: unknown }).cm;
	return cm instanceof EditorView && cm.state.field(authorshipField, false) ? cm : null;
}

/**
 * Nested menus exist at runtime but aren't in the public typings, so check for
 * them and fall back to flat items.
 */
type NestableMenuItem = MenuItem & { setSubmenu?: () => Menu };
const canNest = () => typeof (MenuItem.prototype as NestableMenuItem).setSubmenu === 'function';

interface Target {
	from: number;
	to: number;
	/** The text was selected, rather than a passage picked out by the cursor */
	selection: boolean;
}

/** The selection, or with no selection, the annotated passage under the cursor. */
function getTarget(view: EditorView): Target | null {
	const { main } = view.state.selection;
	const end = bodyEnd(view.state);
	if (!main.empty) {
		const to = Math.min(main.to, end);
		return main.from < to ? { from: main.from, to, selection: true } : null;
	}
	const span = spanAt(view.state.field(authorshipField).spans, main.head);
	return span ? { from: span.from, to: span.to, selection: false } : null;
}

/**
 * Add a submenu listing every author, then "New author…". `checkedKey` marks
 * the current author. With no submenu support, items go in `menu` directly,
 * prefixed with `title`.
 */
function addAuthorMenu(
	plugin: MarkdownAnnotationsPlugin,
	menu: Menu,
	title: string,
	icon: string,
	checkedKey: string | null,
	choose: (author: Author) => void
): void {
	const fill = (target: Menu, prefix: string) => {
		for (const author of plugin.settings.authors) {
			target.addItem(item => {
				item
					.setSection(SECTION)
					.setTitle(prefix + author.name)
					.setIcon(AUTHOR_ICONS[author.type])
					.onClick(() => choose(author));
				if (authorKey(author) === checkedKey) item.setChecked(true);
			});
		}
		target.addItem(item => item
			.setSection(`${SECTION}-new`)
			.setTitle(`${prefix}New author…`)
			.setIcon('user-plus')
			.onClick(() => {
				new AuthorEditModal(plugin.app, null, async (author) => {
					await plugin.addAuthor(author);
					choose(author);
				}).open();
			}));
	};

	if (canNest()) {
		menu.addItem(item => {
			item.setSection(SECTION).setTitle(title).setIcon(icon);
			const submenu = (item as NestableMenuItem).setSubmenu?.();
			if (submenu) fill(submenu, '');
		});
	} else {
		fill(menu, `${title} `);
	}
}

export function registerAuthorshipMenu(plugin: MarkdownAnnotationsPlugin): void {
	plugin.registerEvent(plugin.app.workspace.on('editor-menu', (menu: Menu, editor: Editor) => {
		const view = getEditorView(editor);
		if (!view) return;

		const target = getTarget(view);
		if (target) {
			const { spans } = view.state.field(authorshipField);
			addAuthorMenu(
				plugin, menu,
				target.selection ? 'Mark as' : 'Change author to',
				'signature',
				uniformKey(spans, target.from, target.to),
				author => void applyAuthorship(plugin, view, target.from, target.to, author)
			);

			if (spans.some(span => span.to > target.from && span.from < target.to)) {
				menu.addItem(item => item
					.setSection(SECTION)
					.setTitle(target.selection ? 'Clear authorship' : 'Clear authorship of passage')
					.setIcon('eraser')
					.onClick(() => void applyAuthorship(plugin, view, target.from, target.to, null)));
			}
		}

		addAuthorMenu(plugin, menu, 'Paste as', 'clipboard-paste', null,
			author => void pasteAs(plugin, view, author));
	}));

	plugin.addCommand({
		id: 'mark-selection-default-author',
		name: 'Mark selection as default author',
		editorCheckCallback: (checking, editor) => {
			const view = getEditorView(editor);
			const author = plugin.getDefaultAuthor();
			const target = view && getTarget(view);
			if (!view || !author || !target?.selection) return false;
			if (!checking) void applyAuthorship(plugin, view, target.from, target.to, author);
			return true;
		},
	});

	plugin.addCommand({
		id: 'clear-selection-authorship',
		name: 'Clear authorship of selection',
		editorCheckCallback: (checking, editor) => {
			const view = getEditorView(editor);
			const target = view && getTarget(view);
			if (!view || !target?.selection) return false;
			if (!checking) void applyAuthorship(plugin, view, target.from, target.to, null);
			return true;
		},
	});

	plugin.addCommand({
		id: 'paste-as',
		name: 'Paste as…',
		editorCheckCallback: (checking, editor) => {
			const view = getEditorView(editor);
			if (!view || !plugin.settings.authors.length) return false;
			if (!checking) {
				new AuthorSuggestModal(plugin, author => void pasteAs(plugin, view, author)).open();
			}
			return true;
		},
	});
}

/** Spans to edit, after asking to keep or discard them if they may be misplaced. Null if cancelled. */
async function trustedState(plugin: MarkdownAnnotationsPlugin, view: EditorView): Promise<AuthorshipState | null> {
	let state = view.state.field(authorshipField);
	if (state.trusted) return state;

	// The spec asks users to keep or discard misplaced annotations before editing them.
	const choice = await askKeepOrDiscard(plugin);
	if (choice === null) return null;
	state = view.state.field(authorshipField);
	state = choice === 'keep'
		? { ...state, trusted: true }
		: { ...state, spans: [], trusted: true };
	view.dispatch({ effects: setAuthorship.of(state) });
	return state;
}

/** Assign `[from, to)` to `author`, or clear it when null, and write the block. */
async function applyAuthorship(
	plugin: MarkdownAnnotationsPlugin,
	view: EditorView,
	from: number,
	to: number,
	author: Author | null
): Promise<void> {
	const state = await trustedState(plugin, view);
	if (!state) return;
	const spans = replaceSpans(state.spans, from, to, author && { key: authorKey(author), type: author.type });
	const written = await writeAuthorship(view, spans, state.other, { addToHistory: true });
	if (!written) new Notice('Could not update authorship. Try again.');
}

/** Paste the clipboard's text over the selection, attributed to `author`. */
async function pasteAs(plugin: MarkdownAnnotationsPlugin, view: EditorView, author: Author): Promise<void> {
	let text: string;
	try {
		text = (await navigator.clipboard.readText()).replace(/\r\n?/g, '\n');
	} catch {
		new Notice('Could not read the clipboard.');
		return;
	}
	if (!text) {
		new Notice('The clipboard has no text to paste.');
		return;
	}

	const state = await trustedState(plugin, view);
	if (!state) return;

	const { from, to } = view.state.selection.main;
	if (from > bodyEnd(view.state)) {
		new Notice('Paste into the note’s text, above the annotations.');
		return;
	}

	const written = await writeAuthorship(view, state.spans, state.other, {
		addToHistory: true,
		paste: { from, to, text, author: { key: authorKey(author), type: author.type } },
	});
	if (!written) new Notice('Could not paste. Try again.');
	view.focus();
}

class AuthorSuggestModal extends FuzzySuggestModal<Author> {
	constructor(private plugin: MarkdownAnnotationsPlugin, private choose: (author: Author) => void) {
		super(plugin.app);
		this.setPlaceholder('Paste as…');
	}

	getItems(): Author[] {
		return this.plugin.settings.authors;
	}

	getItemText(author: Author): string {
		return author.name;
	}

	onChooseItem(author: Author): void {
		this.choose(author);
	}
}

function askKeepOrDiscard(plugin: MarkdownAnnotationsPlugin): Promise<'keep' | 'discard' | null> {
	return new Promise(resolve => {
		let choice: 'keep' | 'discard' | null = null;
		const modal = new ConfirmationModal(plugin.app)
			.addCancelButton()
			.addButton(btn => btn
				.setButtonText('Discard annotations')
				.setDestructive()
				.setSecondary()
				.onClick(() => { choice = 'discard'; }))
			.addButton(btn => btn
				.setButtonText('Keep annotations')
				.setCta()
				.setInitialFocus()
				.onClick(() => { choice = 'keep'; }));
		modal.setTitle('Annotations may be misplaced');
		modal.setContent('This note’s text changed since its annotations were written, so some highlights may cover the wrong text. Keep them as they are, or discard them and start over?');
		const onClose = modal.onClose.bind(modal);
		modal.onClose = () => {
			onClose();
			resolve(choice);
		};
		modal.open();
	});
}
