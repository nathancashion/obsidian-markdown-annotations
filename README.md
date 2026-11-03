# Obsidian Markdown Annotations Plugin

An Obsidian plugin for viewing, creating, and editing [Markdown Annotations](https://github.com/iainc/Markdown-Annotations/) - a format for embedding authorship metadata in Markdown files. Compatible with [iA Writer](https://ia.net/writer).

## Features

- **Visual Highlighting**: Authorship colors the text itself, as in iA Writer
  - Human contributions: Subtle green → blue text
  - AI-generated text: Orange → pink → violet → blue gradient text
  - Reference material: Dimmed text
  - Prefer highlights? Set **Highlight style** to *Background highlight* for a soft wash behind the text instead
  - Colors are CSS variables (`--md-annotation-ai-1` … `-4`, `--md-annotation-human-from`/`-to`, `--md-annotation-reference`) you can override in a snippet
- **View Annotations**: Display authorship metadata embedded in your Markdown files
- **Author Management**: Configure reusable author profiles in settings
- **Validate Annotations**: Check hash integrity to ensure annotations are correctly positioned
- **iA Writer Compatible**: Full compatibility with the Markdown Annotations specification

## Annotation Types

The plugin supports three types of annotations:

- `@` - Human contributions
- `&` - AI-generated text
- `*` - Reference material

## Installation

### Manual Installation

1. Download the latest release
2. Extract the files to your vault's `.obsidian/plugins/markdown-annotations/` directory
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins

### Development Installation

1. Clone this repository into your vault's `.obsidian/plugins/` directory
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start compilation in watch mode
4. Reload Obsidian and enable the plugin

## Usage

### Configure Authors

1. Open Obsidian **Settings → Markdown Annotations**
2. Select **+** in the Authors header to create a new author profile
3. Fill in:
   - **Name**: The author's display name
   - **Type**: Choose Human (@), AI (&), or Reference (*)
   - **Identifier**: Optional (email, website, etc.)
4. Select an author to edit it; delete or drag to reorder from the list

### Mark Authorship in the Editor

Right-click in the editor:

- **Mark as ›** (with a selection) or **Change author to ›** (cursor inside an annotated passage): pick an author; the current one is checked
- **Clear authorship** / **Clear authorship of passage**
- **Paste as ›**: paste the clipboard's text, attributed to the chosen author. One undo removes the paste and its authorship together

Each submenu ends with **New author…**, which creates the author and applies it in one go. The **Paste as…** command does the same from the keyboard (assign it a hotkey in Settings → Hotkeys).

Paste as inserts plain text; use regular Paste for rich content that Obsidian converts to Markdown. The annotation block is rewritten with a fresh hash each time, and kept in sync as you type in notes that already have one. If a note's annotations no longer match its text, you're asked to keep or discard them first, as the spec requires.

### Automatic Attribution

- **Typing**: text you type inside someone else's passage (AI or reference text, say), or over annotated text, is attributed to the **Default author**, and stays yours as you keep typing. Typing in unannotated text leaves it unannotated.
- **Pasting** (desktop): when you paste text copied from a web page whose address matches an author's **Identifier**, it's attributed to that author, as in iA Writer. Give Claude the identifier `claude.ai` and text copied from claude.ai is marked as Claude's. Subdomains match too, an identifier with a path (`x.com/i/grok`) only matches pages under it, and `chatgpt.com` and `chat.openai.com` are treated as the same site. This works with text copied from Chrome, Edge, Arc, Brave and Safari; desktop apps such as the ChatGPT or Claude apps don't record where text came from. Turn it off with **Recognize pasted text**.

A **Self** (Human) author is created on first run and set as the **Default author** (Obsidian has no API for your name, so rename it in settings). The *Mark selection as default author* command applies it from the keyboard.

### Reading View and Export

The annotation block is hidden in Reading view and left out of PDF export.

### Commands

- **Toggle show authors**: Quickly show/hide annotation highlighting (like iA Writer)
- **Validate annotations in current file**: Check if hash validation passes
- **Show annotation information**: Display annotation details in console

### Coming Soon

- Create annotations from selected text
- Automatic hash recalculation when editing
- Annotation info on hover
- Export annotations report

## Specification

This plugin implements the [Markdown Annotations specification from iA, Inc.](https://github.com/iainc/Markdown-Annotations/), which defines a standard format for embedding authorship metadata while preserving readability and portability.

## Development

```bash
# Install dependencies
npm install

# Build for development (watch mode)
npm run dev

# Build for production
npm run build
```

## License

MIT
