# Settings Tab Guide

## Overview

The Markdown Annotations settings tab allows you to manage authors that can be used when creating annotations in your documents.

## Accessing Settings

1. Open Obsidian
2. Go to **Settings** (gear icon)
3. Scroll to **Community plugins** section
4. Select **Markdown Annotations**

## Settings Options

### General Settings

#### Show visual indicators
- **Type**: Toggle
- **Description**: Display visual indicators for annotated text in the editor
- **Default**: Enabled
- **Status**: Feature coming soon

#### Warn on hash mismatch
- **Type**: Toggle  
- **Description**: Show warning when annotation hash validation fails
- **Default**: Enabled
- **Current**: Enabled in validation commands

### Authors Section

The Authors section lets you create and manage author profiles that will be available when creating new annotations.

#### Adding an Author

1. Select the **Add Author** button at the bottom of the Authors section
2. A modal will appear with the following fields:
   - **Name** (required): Display name for the author
     - Example: "John Doe", "Claude AI", "Research Paper"
   - **Type** (required): Select author type from dropdown:
     - **Human (@)**: For human contributors
     - **AI (&)**: For AI-generated content
     - **Reference (*)**: For referenced/quoted material
   - **Identifier** (optional): Email, website, or other identifier
     - Example: "john@example.com", "https://claude.ai", "DOI:10.1234/paper"
3. Select **Save** to create the author

#### Editing an Author

1. Find the author in the list
2. Select the **Edit** button
3. Modify any fields
4. Select **Save** to update

#### Deleting an Author

1. Find the author in the list
2. Select the **Delete** button (warning style)
3. The author will be immediately removed

## Author Display Format

Authors are displayed in the settings list with the following format:

```
Type: Name
<identifier>
```

Examples:
- `Human: John Doe`  
  `<john@example.com>`
  
- `AI: Claude`  
  `<https://claude.ai>`
  
- `Reference: Smith et al. 2023`  
  `<DOI:10.1234/example>`

## Using Configured Authors

Once you've configured authors in settings, they will be available:

1. When creating new annotations (feature coming soon)
2. In annotation UI tools (feature coming soon)
3. For quick selection instead of manual typing

## Tips

- **Create a profile for yourself**: Set up your own author profile with your name and email
- **Add AI assistants you use**: Create profiles for ChatGPT, Claude, etc.
- **Reference sources**: Add frequently cited sources as Reference type authors
- **Use identifiers consistently**: Keep email/website formats consistent for better tracking

## Technical Details

### Storage

Authors are stored in the plugin's settings file at:
```
<vault>/.obsidian/plugins/markdown-annotations/data.json
```

### Author ID

Each author is assigned a unique ID when created:
- Format: `author-{timestamp}-{random}`
- Example: `author-1699123456789-x7k2p9m1q`
- Used internally to track edits and prevent duplicates

### Data Structure

```json
{
  "authors": [
    {
      "id": "author-1699123456789-x7k2p9m1q",
      "name": "John Doe",
      "type": "@",
      "identifier": "john@example.com"
    }
  ]
}
```

## Troubleshooting

### Author not appearing in list
- Ensure you selected **Save** in the modal
- Check that the Name field was filled in
- Try refreshing the settings tab

### Settings not persisting
- Check file permissions on the vault's `.obsidian` folder
- Ensure Obsidian has write access
- Try restarting Obsidian

### Duplicate authors
- Each author has a unique ID even if names match
- You can safely have multiple authors with the same name but different identifiers
