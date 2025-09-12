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

## Documentation

For more detailed documentation, please see the `docs/` directory.

## Next Steps

- See the `docs/` directory for more detailed documentation
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

## Development Commands

For development and contributing:

```bash
# Code quality check (Biome linter)
npm run lint

# Auto-fix linting issues
npm run lint:fix  

# Format code
npm run format

# Check formatting without changes
npm run format:check

# Build project
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Performance benchmarks
npm run benchmark
```

### Getting Help

Run `./analyze-file --help` for command-line help, or check the `docs/` directory for detailed documentation.
