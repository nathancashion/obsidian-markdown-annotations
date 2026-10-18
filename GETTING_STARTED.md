# Getting Started with Obsidian Markdown Annotations

## Project Setup Complete ✓

The Obsidian plugin for Markdown Annotations has been initialized with:

- **Parser**: Full implementation of the Markdown Annotations specification
- **Hash validation**: SHA-256 verification of annotated content
- **Grapheme support**: Proper Unicode grapheme cluster handling
- **Commands**: Two initial commands for validating and viewing annotations

## Project Structure

```
obsidian-markdown-annotations/
├── src/
│   ├── main.ts                 # Plugin entry point
│   ├── settings.ts             # Plugin settings
│   ├── types.ts                # TypeScript interfaces
│   ├── parser/
│   │   └── parser.ts           # Annotation parser
│   ├── utils/
│   │   ├── hash.ts             # SHA-256 utilities
│   │   └── grapheme.ts         # Grapheme cluster utilities
│   ├── ui/                     # (Future) UI components
│   └── commands/               # (Future) Command implementations
├── main.js                     # Compiled bundle (generated)
├── manifest.json               # Plugin metadata
├── package.json                # Dependencies
└── example.md                  # Example annotated file
```

## Testing the Plugin

### 1. Manual Installation in Obsidian

Copy the plugin to your vault's plugins directory:

```bash
# Replace <vault-path> with your vault location
mkdir -p <vault-path>/.obsidian/plugins/markdown-annotations
cp main.js manifest.json <vault-path>/.obsidian/plugins/markdown-annotations/
```

Then:
1. Open Obsidian
2. Go to **Settings → Community plugins**
3. Enable "Markdown Annotations"

### 2. Development Setup

For active development with hot reload:

```bash
# In the plugin directory
npm run dev
```

Then symlink or copy to your vault's plugin directory.

### 3. Configure Authors

1. Go to **Settings → Markdown Annotations**
2. Select **+** in the Authors header
3. Enter author details:
   - **Name**: Display name (e.g., "John Doe")
   - **Type**: Human (@), AI (&), or Reference (*)
   - **Identifier**: Optional email, website, etc.
4. Select **Save**

### 4. Try the Commands

Open the example.md file (or create your own annotated file) and:

1. Open Command Palette (Cmd/Ctrl+P)
2. Type "Toggle show authors" - instantly show/hide highlighting
3. Type "Validate annotations" - checks if hash is valid
4. Type "Show annotation information" - displays annotation details in console

**Tip**: Bind "Toggle show authors" to a keyboard shortcut for quick access (Settings → Hotkeys)

## Current Features

### ✅ Implemented

- **Parse annotation blocks**: Read and validate the format
- **Hash validation**: Verify SHA-256 hashes against content
- **Author annotations**: Parse @Human, &AI, and *Reference annotations
- **Character ranges**: Handle grapheme cluster-based ranges
- **Visual highlighting**: Real-time color-coded display of annotations
  - Human: Subtle green/blue gradient
  - AI: Soft violet → pink → sky gradient wash
  - Reference: Dimmed gray with opacity
- **Basic commands**: Validate and display annotation info
- **Settings tab**: Configure authors with name, type, and optional identifier

### 🚧 To Be Implemented

- **Annotation editing**: UI for adding/updating annotations
- **Hash recalculation**: Auto-update hashes when text changes
- **Annotation creation**: Commands to annotate selected text
- **Hover tooltips**: Show author info on mouseover
- **Annotation sidebar**: View all annotations in current file

## Next Steps

1. **Test the parser** with various annotated files
2. **Add visual indicators** in the editor (EditorExtension)
3. **Create annotation UI** for adding/editing annotations
4. **Implement hash recalculation** on document changes
5. **Add settings panel** for user configuration

## Development Commands

```bash
# Install dependencies
npm install

# Development mode (watch)
npm run dev

# Production build
npm run build

# Type checking
npx tsc --noEmit

# Linting
eslint src/
```

## Specification

See `SPEC.md` for the complete Markdown Annotations specification.

## Contributing

When adding features, follow the modular structure:
- Keep `src/main.ts` minimal (lifecycle only)
- Add feature logic in separate modules
- Use TypeScript with strict mode
- Document public interfaces
