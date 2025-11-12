/**
 * Main plugin entry point
 */

import { Plugin, Notice } from 'obsidian';
import { MarkdownAnnotationsSettings, DEFAULT_SETTINGS } from './settings';
import { parseDocument } from './parser/parser';

export default class MarkdownAnnotationsPlugin extends Plugin {
	settings: MarkdownAnnotationsSettings;

	async onload() {
		console.log('Loading Markdown Annotations plugin');
		
		// Load settings
		await this.loadSettings();
		
		// Add command to validate annotations in current file
		this.addCommand({
			id: 'validate-annotations',
			name: 'Validate annotations in current file',
			editorCallback: async (editor) => {
				const content = editor.getValue();
				const parsed = await parseDocument(content);
				
				if (!parsed.annotations) {
					new Notice('No annotations found in this document');
					return;
				}
				
				if (parsed.hashValid) {
					new Notice('✓ Annotations are valid');
				} else {
					new Notice('⚠ Warning: Annotations may be misplaced (hash mismatch)');
				}
				
				// Show annotation summary
				const authorCount = parsed.annotations.authorAnnotations.length;
				new Notice(`Found ${authorCount} author annotation(s)`);
			}
		});
		
		// Add command to show annotation info
		this.addCommand({
			id: 'show-annotation-info',
			name: 'Show annotation information',
			editorCallback: async (editor) => {
				const content = editor.getValue();
				const parsed = await parseDocument(content);
				
				if (!parsed.annotations) {
					new Notice('No annotations found in this document');
					return;
				}
				
				// Build info message
				let info = `Annotations:\n`;
				info += `Hash: ${parsed.hashValid ? '✓ Valid' : '✗ Invalid'}\n`;
				info += `\nAuthors:\n`;
				
				for (const author of parsed.annotations.authorAnnotations) {
					const type = author.type === '@' ? 'Human' : 
					           author.type === '&' ? 'AI' : 'Reference';
					const name = author.name || 'Unnamed';
					const rangeCount = author.ranges.length;
					info += `  ${type}: ${name} (${rangeCount} range(s))\n`;
				}
				
				console.log(info);
				new Notice('Annotation info logged to console');
			}
		});
	}

	onunload() {
		console.log('Unloading Markdown Annotations plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
