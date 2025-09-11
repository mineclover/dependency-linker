# Quick Start Guide

This guide will help you get started with the TypeScript File Analyzer tool.

## Installation

The tool is already built and ready to use. No additional installation required.

## Basic Usage

### Analyzing a TypeScript File

The simplest way to use the tool:

```bash
./analyze-file path/to/file.ts
```

Or:

```bash
./analyze-file path/to/file.tsx
```

### Command Line Options

```bash
./analyze-file --help
```

Available options:
- `--format <format>`: Output format (`json` or `text`, default: `json`)
- `--include-sources`: Include source location information in output
- `--parse-timeout <ms>`: Maximum parsing time in milliseconds (default: 5000)

## Examples

### Example 1: Basic Analysis (JSON Output)

Analyze a TypeScript React component with JSON output:

```bash
./analyze-file example.tsx
```

**Output:**
```json
{
  "filePath": "example.tsx",
  "success": true,
  "dependencies": [
    {
      "source": "react",
      "type": "external",
      "location": { "line": 1, "column": 0, "offset": 0 },
      "isNodeBuiltin": false,
      "isScopedPackage": false,
      "packageName": "react"
    },
    {
      "source": "@mui/material",
      "type": "external", 
      "location": { "line": 2, "column": 0, "offset": 52 },
      "isNodeBuiltin": false,
      "isScopedPackage": true,
      "packageName": "@mui/material"
    }
  ],
  "imports": [...],
  "exports": [...],
  "parseTime": 5
}
```

### Example 2: Human-Readable Output

For easier reading, use text format:

```bash
./analyze-file example.tsx --format text
```

**Output:**
```
File: example.tsx
Parse Time: 3ms
Status: Success

Dependencies:
  External:
    react (1:0)
    @mui/material (2:0)
    lodash (3:0)
  Relative:
    ./utils/helpers (4:0)
    ../types/user (5:0)

Imports:
  react (1:0)
    named: useState
    named: useEffect
    default: default as React
  @mui/material (2:0)
    named: Button
    named: TextField

Exports:
  Default:
    default (35:0)
  Named:
    ComponentProps (type-only) (7:0)
    ExampleComponent (13:0)

Summary:
  Total Dependencies: 5
  Total Imports: 5
  Total Exports: 3
  External: 3
  Internal: 0
  Relative: 2
```

### Example 3: Include Source Locations

To get detailed source location information:

```bash
./analyze-file example.tsx --include-sources --format text
```

### Example 4: Custom Parse Timeout

For large files that may need more time to parse:

```bash
./analyze-file large-file.ts --parse-timeout 10000
```

## Understanding the Output

### Dependency Types
- **External**: npm packages (e.g., `react`, `lodash`, `@mui/material`)
- **Internal**: Files within your project (e.g., `@/components/Button`)
- **Relative**: Relative imports (e.g., `./utils`, `../types`)

### Import Types
- **Default**: `import React from 'react'`
- **Named**: `import { useState } from 'react'`
- **Namespace**: `import * as utils from 'utils'`
- **Type-only**: `import type { User } from './types'`

### Export Types
- **Default**: `export default Component`
- **Named**: `export const Component = ...`
- **Type-only**: `export interface Props {...}`

### Location Information
When present, location information shows:
- `line`: Line number (1-based)
- `column`: Column number (0-based)
- `offset`: Character offset from start of file

## Common Use Cases

### 1. Dependency Auditing
```bash
# Find all external dependencies
./analyze-file src/**/*.ts --format json | jq '.dependencies[] | select(.type == "external")'
```

### 2. Import Analysis
```bash
# Analyze imports in human-readable format
./analyze-file src/components/Button.tsx --format text
```

### 3. Build Tool Integration
```bash
# Use JSON output for build scripts
./analyze-file src/index.ts --format json > dependencies.json
```

### 4. Large File Analysis
```bash
# Handle large files with increased timeout
./analyze-file src/generated/large-api.ts --parse-timeout 15000
```

## Error Handling

The tool handles various error conditions gracefully:

- **File not found**: Returns error with appropriate message
- **Parse errors**: May return partial results when possible
- **Timeout**: Returns timeout error if parsing takes too long
- **Invalid file type**: Only accepts `.ts` and `.tsx` files

## Performance

- **Target**: < 1 second per file for typical TypeScript files
- **Timeout**: Default 5 seconds, configurable via `--parse-timeout`
- **Memory**: Efficient tree-sitter parsing with minimal memory usage

## Next Steps

- See `README.md` for more detailed documentation
- Check `tests/` directory for more examples
- Explore the source code in `src/` for advanced usage patterns

## Troubleshooting

### Common Issues

1. **Permission denied**: Make sure the script is executable:
   ```bash
   chmod +x analyze-file
   ```

2. **Parse timeout**: Increase timeout for large files:
   ```bash
   ./analyze-file large-file.ts --parse-timeout 10000
   ```

3. **Native build errors**: If you see "No native build was found" errors:
   ```bash
   npm rebuild tree-sitter
   ```

4. **Partial results**: The tool may return partial results for files with syntax errors. This is expected behavior for development workflows.

### Getting Help

Run `./analyze-file --help` for command-line help, or check the README.md for detailed documentation.