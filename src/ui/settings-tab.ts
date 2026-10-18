/**
 * Settings tab for Markdown Annotations plugin
 *
 * Settings are declared through `getSettingDefinitions()` (Obsidian 1.13+) rather
 * than drawn in `display()`, so Obsidian renders them natively and indexes them
 * for settings search. The authors collection uses a `list` definition, which
 * provides the add, delete, and drag-to-reorder affordances.
 */

import {
	App,
	ConfirmationModal,
	Modal,
	PluginSettingTab,
	Setting,
	type DropdownComponent,
	type SettingDefinitionItem,
	type SettingDefinitionList,
	type TextComponent,
} from 'obsidian';
import type MarkdownAnnotationsPlugin from '../main';
import { Author, MarkdownAnnotationsSettings } from '../settings';
import { AuthorType } from '../types';

const AUTHOR_TYPE_LABELS: Record<AuthorType, string> = {
	[AuthorType.Human]: 'Human',
	[AuthorType.AI]: 'AI',
	[AuthorType.Reference]: 'Reference',
};

type ToggleKey = 'showVisualIndicators' | 'warnOnHashMismatch';

const TOGGLE_KEYS: readonly ToggleKey[] = ['showVisualIndicators', 'warnOnHashMismatch'];

const isToggleKey = (key: string): key is ToggleKey =>
	(TOGGLE_KEYS as readonly string[]).includes(key);

export class MarkdownAnnotationsSettingTab extends PluginSettingTab {
	plugin: MarkdownAnnotationsPlugin;

	constructor(app: App, plugin: MarkdownAnnotationsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				type: 'group',
				heading: 'Display',
				items: [
					{
						name: 'Show authors',
						desc: 'Highlight annotated text in the editor by author type.',
						aliases: ['visual indicators', 'highlight', 'authorship', 'AI'],
						control: { type: 'toggle', key: 'showVisualIndicators' },
					},
					{
						name: 'Warn on hash mismatch',
						desc: 'Show a notice when opening a note whose annotations no longer match its text, for example after editing it outside Obsidian.',
						aliases: ['validate', 'SHA-256', 'integrity'],
						control: { type: 'toggle', key: 'warnOnHashMismatch' },
					},
				],
			},
			this.authorsList(),
		];
	}

	getControlValue(key: string): unknown {
		return this.plugin.settings[key as keyof MarkdownAnnotationsSettings];
	}

	/** Route control writes through the plugin so open editors refresh too. */
	async setControlValue(key: string, value: unknown): Promise<void> {
		if (!isToggleKey(key)) return;
		this.plugin.settings[key] = value === true;
		await this.plugin.saveSettings();
	}

	private authorsList(): SettingDefinitionList {
		const { authors } = this.plugin.settings;
		return {
			type: 'list',
			heading: 'Authors',
			emptyState: 'No authors yet. Add the people, AI models, and sources you annotate with.',
			addItem: {
				name: 'Add author',
				action: () => this.openAuthorModal(null),
			},
			onDelete: (index) => this.confirmDelete(index),
			onReorder: (from, to) => {
				const [moved] = authors.splice(from, 1);
				authors.splice(to, 0, moved);
				void this.plugin.saveSettings();
				this.update();
			},
			items: authors.map((author, index) => ({
				name: `${AUTHOR_TYPE_LABELS[author.type]}: ${author.name}`,
				desc: author.identifier ? `<${author.identifier}>` : 'No identifier',
				aliases: [author.name, author.identifier ?? '', AUTHOR_TYPE_LABELS[author.type]],
				action: () => this.openAuthorModal(index),
			})),
		};
	}

	private openAuthorModal(index: number | null): void {
		const existing = index === null ? null : this.plugin.settings.authors[index];
		new AuthorEditModal(this.app, existing, async (author) => {
			if (index === null) {
				this.plugin.settings.authors.push(author);
			} else {
				this.plugin.settings.authors[index] = author;
			}
			await this.plugin.saveSettings();
			this.update();
		}).open();
	}

	/** Deleting is not undoable, and `onDelete` also fires from the keyboard, so confirm first. */
	private confirmDelete(index: number): void {
		const author = this.plugin.settings.authors[index];
		if (!author) return;

		const modal = new ConfirmationModal(this.app)
			.addCancelButton()
			.addButton((btn) => btn
				.setButtonText('Delete')
				.setDestructive()
				.setCta()
				.onClick(async () => {
					this.plugin.settings.authors.splice(index, 1);
					await this.plugin.saveSettings();
					this.update();
				}));
		modal.setTitle('Delete author?');
		modal.setContent(`“${author.name}” will be removed from your authors. Annotations already in your notes are not changed.`);
		modal.open();
	}
}

/**
 * Modal for adding/editing an author
 */
class AuthorEditModal extends Modal {
	private author: Author | null;
	private onSubmit: (author: Author) => Promise<void>;

	private nameSetting!: Setting;
	private nameInput!: TextComponent;
	private typeSelect!: DropdownComponent;
	private identifierInput!: TextComponent;

	constructor(app: App, author: Author | null, onSubmit: (author: Author) => Promise<void>) {
		super(app);
		this.author = author;
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;
		this.setTitle(this.author ? 'Edit author' : 'Add author');

		this.nameSetting = new Setting(contentEl)
			.setName('Name')
			.setDesc('Display name for this author')
			.addText(text => {
				this.nameInput = text
					.setPlaceholder('e.g., John Doe')
					.setValue(this.author?.name ?? '')
					.onChange(() => this.nameSetting.setErrorMessage(null));
			});

		new Setting(contentEl)
			.setName('Type')
			.setDesc('Type of author')
			.addDropdown(dropdown => {
				this.typeSelect = dropdown
					.addOption(AuthorType.Human, 'Human (@)')
					.addOption(AuthorType.AI, 'AI (&)')
					.addOption(AuthorType.Reference, 'Reference (*)')
					.setValue(this.author?.type ?? AuthorType.Human);
			});

		new Setting(contentEl)
			.setName('Identifier')
			.setDesc('Optional email, website, or other identifier')
			.addText(text => {
				this.identifierInput = text
					.setPlaceholder('e.g., email@example.com')
					.setValue(this.author?.identifier ?? '');
			});

		new Setting(contentEl)
			.addButton(button => button
				.setButtonText('Cancel')
				.onClick(() => this.close()))
			.addButton(button => button
				.setButtonText('Save')
				.setCta()
				.onClick(() => void this.submit()));

		this.scope.register([], 'Enter', (evt) => {
			evt.preventDefault();
			void this.submit();
		});

		this.nameInput.inputEl.focus();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private async submit(): Promise<void> {
		const name = this.nameInput.getValue().trim();
		const identifier = this.identifierInput.getValue().trim();

		if (!name) {
			this.nameSetting.setErrorMessage('Name is required.');
			this.nameInput.inputEl.focus();
			return;
		}

		await this.onSubmit({
			id: this.author?.id ?? generateId(),
			name,
			type: this.typeSelect.getValue() as AuthorType,
			identifier: identifier || undefined,
		});
		this.close();
	}
}

function generateId(): string {
	return `author-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
