/**
 * Settings tab for Markdown Annotations plugin
 */

import { App, PluginSettingTab, Setting } from 'obsidian';
import MarkdownAnnotationsPlugin from '../main';
import { Author } from '../settings';
import { AuthorType } from '../types';

export class MarkdownAnnotationsSettingTab extends PluginSettingTab {
	plugin: MarkdownAnnotationsPlugin;

	constructor(app: App, plugin: MarkdownAnnotationsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Markdown Annotations Settings' });

		// General settings
		new Setting(containerEl)
			.setName('Show visual indicators')
			.setDesc('Display visual indicators for annotated text in the editor')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showVisualIndicators)
				.onChange(async (value) => {
					this.plugin.settings.showVisualIndicators = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Warn on hash mismatch')
			.setDesc('Show warning when annotation hash validation fails')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.warnOnHashMismatch)
				.onChange(async (value) => {
					this.plugin.settings.warnOnHashMismatch = value;
					await this.plugin.saveSettings();
				}));

		// Authors section
		containerEl.createEl('h3', { text: 'Authors' });
		containerEl.createEl('p', { 
			text: 'Configure authors that can be used for annotations. These will be available when creating new annotations.',
			cls: 'setting-item-description'
		});

		// Display existing authors
		this.plugin.settings.authors.forEach((author, index) => {
			this.displayAuthor(containerEl, author, index);
		});

		// Add new author button
		new Setting(containerEl)
			.addButton(button => button
				.setButtonText('Add Author')
				.setCta()
				.onClick(() => {
					this.addNewAuthor();
				}));
	}

	private displayAuthor(containerEl: HTMLElement, author: Author, index: number): void {
		const authorContainer = containerEl.createDiv({ cls: 'markdown-annotations-author' });
		
		// Author header with delete button
		const headerSetting = new Setting(authorContainer)
			.setName(this.getAuthorDisplayName(author))
			.setDesc(this.getAuthorDescription(author))
			.addButton(button => button
				.setButtonText('Edit')
				.onClick(() => {
					this.editAuthor(index);
				}))
			.addButton(button => button
				.setButtonText('Delete')
				.setWarning()
				.onClick(async () => {
					this.plugin.settings.authors.splice(index, 1);
					await this.plugin.saveSettings();
					this.display();
				}));
	}

	private getAuthorDisplayName(author: Author): string {
		const typeLabel = this.getAuthorTypeLabel(author.type);
		return `${typeLabel}: ${author.name}`;
	}

	private getAuthorDescription(author: Author): string {
		if (author.identifier) {
			return `<${author.identifier}>`;
		}
		return 'No identifier';
	}

	private getAuthorTypeLabel(type: AuthorType): string {
		switch (type) {
			case AuthorType.Human:
				return 'Human';
			case AuthorType.AI:
				return 'AI';
			case AuthorType.Reference:
				return 'Reference';
		}
	}

	private addNewAuthor(): void {
		const modal = new AuthorEditModal(this.app, this.plugin, null, async (author) => {
			this.plugin.settings.authors.push(author);
			await this.plugin.saveSettings();
			this.display();
		});
		modal.open();
	}

	private editAuthor(index: number): void {
		const author = this.plugin.settings.authors[index];
		const modal = new AuthorEditModal(this.app, this.plugin, author, async (updatedAuthor) => {
			this.plugin.settings.authors[index] = updatedAuthor;
			await this.plugin.saveSettings();
			this.display();
		});
		modal.open();
	}
}

/**
 * Modal for adding/editing an author
 */
import { Modal } from 'obsidian';

class AuthorEditModal extends Modal {
	plugin: MarkdownAnnotationsPlugin;
	author: Author | null;
	onSubmit: (author: Author) => void;
	
	private nameInput: HTMLInputElement;
	private typeSelect: HTMLSelectElement;
	private identifierInput: HTMLInputElement;

	constructor(
		app: App,
		plugin: MarkdownAnnotationsPlugin,
		author: Author | null,
		onSubmit: (author: Author) => void
	) {
		super(app);
		this.plugin = plugin;
		this.author = author;
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: this.author ? 'Edit Author' : 'Add Author' });

		// Name field
		new Setting(contentEl)
			.setName('Name')
			.setDesc('Display name for this author')
			.addText(text => {
				this.nameInput = text.inputEl;
				text
					.setPlaceholder('e.g., John Doe')
					.setValue(this.author?.name || '')
					.inputEl.focus();
			});

		// Type field
		new Setting(contentEl)
			.setName('Type')
			.setDesc('Type of author')
			.addDropdown(dropdown => {
				this.typeSelect = dropdown.selectEl;
				dropdown
					.addOption(AuthorType.Human, 'Human (@)')
					.addOption(AuthorType.AI, 'AI (&)')
					.addOption(AuthorType.Reference, 'Reference (*)')
					.setValue(this.author?.type || AuthorType.Human);
			});

		// Identifier field
		new Setting(contentEl)
			.setName('Identifier (optional)')
			.setDesc('Email, website, or other identifier')
			.addText(text => {
				this.identifierInput = text.inputEl;
				text
					.setPlaceholder('e.g., email@example.com')
					.setValue(this.author?.identifier || '');
			});

		// Buttons
		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
		
		buttonContainer.createEl('button', { text: 'Cancel' })
			.addEventListener('click', () => this.close());
		
		buttonContainer.createEl('button', { text: 'Save', cls: 'mod-cta' })
			.addEventListener('click', () => this.submit());
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}

	private submit(): void {
		const name = this.nameInput.value.trim();
		const type = this.typeSelect.value as AuthorType;
		const identifier = this.identifierInput.value.trim();

		if (!name) {
			// Show error
			return;
		}

		const author: Author = {
			id: this.author?.id || this.generateId(),
			name,
			type,
			identifier: identifier || undefined
		};

		this.onSubmit(author);
		this.close();
	}

	private generateId(): string {
		return `author-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}
}
