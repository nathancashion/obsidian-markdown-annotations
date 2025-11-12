# Obsidian Markdown Annotations Plugin

An Obsidian plugin for viewing, creating, and editing [Markdown Annotations](https://github.com/nately/Markdown-Annotations) - a format for embedding authorship metadata in Markdown files. Compatible with iA Writer.

## Features

- **View Annotations**: Display authorship metadata embedded in your Markdown files
- **Create Annotations**: Add annotations to track contributions from humans, AI, and reference materials
- **Edit Annotations**: Update existing annotations with automatic hash recalculation
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
2. Select **Add Author** to create a new author profile
3. Fill in:
   - **Name**: The author's display name
   - **Type**: Choose Human (@), AI (&), or Reference (*)
   - **Identifier**: Optional (email, website, etc.)
4. Authors can be edited or deleted from the settings panel

### Commands

- **Validate annotations in current file**: Check if hash validation passes
- **Show annotation information**: Display annotation details in console

### Coming Soon

- Visual indicators for annotated text
- Create annotations from selected text
- Automatic hash recalculation

## Specification

This plugin implements the [Markdown Annotations specification](https://github.com/nately/Markdown-Annotations), which defines a standard format for embedding authorship metadata while preserving readability and portability.

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
