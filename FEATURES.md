# Markdown Annotations Plugin - Features

## Current Features (v0.1.0)

### 1. Annotation Parsing ✅

**What it does**: Reads and validates Markdown Annotations from your files

**Capabilities**:
- Parses annotation blocks (between `---` and `...`)
- Extracts hash annotations for validation
- Identifies author annotations (@Human, &AI, *Reference)
- Handles character ranges with grapheme cluster accuracy
- Supports optional author identifiers (email, website, etc.)
- Validates annotation format against specification

**Technical details**:
- Full implementation of Markdown Annotations spec v0.2
- SHA-256 hash validation with truncation support
- Unicode-aware grapheme cluster counting using `graphemer` library
- Error handling for malformed annotations

### 2. Visual Highlighting ✅

**What it does**: Shows color-coded highlights for annotated text in the editor

**Visual styles** (inspired by iA Writer):

**Human contributions (@)**:
- Subtle green-to-blue gradient background
- Solid underline in semi-transparent green
- Light mode: Softer tones
- Dark mode: Brighter colors for better visibility

**AI-generated text (&)**:
- Soft violet → pink → sky gradient wash
- Rounded corners, no underline, no animation
- Higher opacity for visibility

**Reference material (*)**:
- Dimmed gray appearance
- Reduced opacity (70% light, 65% dark)
- Dotted underline for distinction
- Unobtrusive styling

**Technical details**:
- CodeMirror 6 extension with ViewPlugin
- Async document parsing with state effects
- Grapheme-to-byte position conversion
- Incremental updates on document change
- Configurable via settings toggle

### 3. Author Management ✅

**What it does**: Manage reusable author profiles in plugin settings

**Capabilities**:
- Create author profiles with name, type, and identifier
- Edit existing authors
- Delete authors
- Three author types:
  - Human (@): For human contributors
  - AI (&): For AI-generated content  
  - Reference (*): For quoted/referenced material
- Optional identifier field for email, website, DOI, etc.
- Unique ID system prevents conflicts

**UI Features**:
- Settings tab in Obsidian preferences
- Modal dialog for add/edit operations
- Native settings list: select to edit, delete with confirmation, drag to reorder
- Visual distinction between author types
- Clean, Obsidian-styled interface

**Technical details**:
- Persistent storage in plugin data.json
- Auto-generated unique IDs (timestamp + random)
- Form validation (name required)
- Settings sync on save

### 4. Validation Commands ✅

**What it does**: Commands to validate and inspect annotations

**Available commands**:

**"Toggle show authors"**:
- Instantly show/hide annotation highlighting
- Matches iA Writer's "Show Authors"/"Hide Authors" functionality
- Works immediately without reloading
- Can be bound to keyboard shortcut
- Displays status notice

**"Validate annotations in current file"**:
- Checks if annotation block exists
- Validates SHA-256 hash against content
- Shows success/warning notice
- Reports number of author annotations found

**"Show annotation information"**:
- Displays detailed annotation info
- Lists all authors with type and range count
- Logs full details to console
- Useful for debugging

**Technical details**:
- Editor callbacks for current file access
- Async parsing with error handling
- User-friendly notices
- Console logging for technical details

### 5. Settings Panel ✅

**What it does**: Configure plugin behavior

**General settings**:
- **Show authors**: Toggle annotation highlighting on/off
- **Warn on hash mismatch**: Control hash validation warnings

**Authors section**:
- List of configured authors
- Add/Edit/Delete operations
- Visual display of author type and identifier

**Technical details**:
- PluginSettingTab integration
- Settings persistence
- Real-time updates

## File Structure

```
obsidian-markdown-annotations/
├── src/
│   ├── main.ts                          # Plugin entry point
│   ├── settings.ts                      # Settings interface & defaults
│   ├── types.ts                         # TypeScript type definitions
│   ├── parser/
│   │   └── parser.ts                    # Annotation parser
│   ├── utils/
│   │   ├── hash.ts                      # SHA-256 utilities
│   │   └── grapheme.ts                  # Grapheme cluster utilities
│   ├── ui/
│   │   └── settings-tab.ts              # Settings UI
│   └── editor/
│       └── annotations-extension.ts     # Highlighting extension
├── styles.css                           # Plugin styles
├── manifest.json                        # Plugin metadata
├── package.json                         # Dependencies
└── main.js                              # Compiled bundle
```

## Documentation

- **README.md**: Quick start and feature overview
- **GETTING_STARTED.md**: Setup and development guide
- **SETTINGS_GUIDE.md**: Settings tab documentation
- **HIGHLIGHTING_GUIDE.md**: Visual highlighting details
- **SPEC.md**: Full Markdown Annotations specification
- **FEATURES.md**: This file - complete feature list

## Compatibility

- **Obsidian**: Requires v1.13.0 or later
- **Platform**: Desktop and mobile (isDesktopOnly: false)
- **Markdown**: Standard markdown files with annotation blocks
- **iA Writer**: Full compatibility with iA Writer's annotation format

## Performance

- **Large files**: Async parsing prevents UI blocking
- **Many annotations**: Efficient range-based decorations
- **Real-time updates**: Incremental parsing on changes only
- **Memory**: Lightweight state management

## Known Limitations

1. **Hash recalculation**: Must be done manually (feature coming soon)
2. **Annotation creation**: No UI to create new annotations yet
3. **Overlapping ranges**: Multiple annotations on same text will blend
4. **Read view**: Highlighting only works in edit mode
5. **Export**: Annotations not preserved in PDF/HTML export

## Upcoming Features

### High Priority

1. **Create annotations**: Select text and add annotations
2. **Hash recalculation**: Auto-update hashes when text changes
3. **Edit annotations**: Modify existing annotation ranges
4. **Hover tooltips**: Show author info on mouseover

### Medium Priority

5. **Annotation sidebar**: Panel showing all annotations in file
6. **Quick author select**: Dropdown to choose from configured authors
7. **Conflict detection**: Warn about overlapping annotations
8. **Export report**: Generate annotation summary

### Future Enhancements

9. **Custom colors**: User-configurable highlight colors
10. **Intensity slider**: Adjust highlight opacity
11. **Keyboard shortcuts**: Quick commands for common actions
12. **Batch operations**: Apply annotations to multiple files
13. **Statistics**: Track authorship across vault
14. **Git integration**: Show changes in annotation history

## Technical Stack

- **Language**: TypeScript with strict mode
- **Editor**: CodeMirror 6 extensions
- **Hashing**: Web Crypto API (SHA-256)
- **Unicode**: Graphemer library for grapheme clusters
- **Bundler**: esbuild
- **Testing**: Manual testing in Obsidian

## Contributing

When adding features, follow these guidelines:

1. Keep `src/main.ts` minimal (lifecycle only)
2. Split functionality into focused modules
3. Use TypeScript strict mode
4. Document public interfaces
5. Add CSS with theme support (light/dark)
6. Update relevant documentation files
7. Test with real annotation examples

## License

MIT
