# Configuration Guide

This guide covers the comprehensive configuration system for the TypeScript Dependency Linker, including presets, custom configurations, and advanced options.

## Overview

The TypeScript Dependency Linker supports two analysis modes:

1. **Standard Mode**: Basic analysis with traditional output formats
2. **Integrated Mode** (`--use-integrated`): Enhanced analysis with optimized configurations, multiple views, and performance optimizations

## Configuration Presets

### Built-in Presets

The tool provides five built-in presets optimized for different use cases:

#### 🚀 Fast Preset
**Best for**: Rapid development, CI/CD pipelines, quick checks

```bash
./analyze-file src/app.tsx --use-integrated --preset fast
```

**Configuration:**
- Views: `summary`, `minimal`
- Detail Level: `minimal`
- Optimization Mode: `speed`
- String Length Limit: 500 characters
- Array Length Limit: 50 items
- Depth Limit: 5 levels
- Performance: ~5ms analysis time

**Optimization Strategy:**
- Lazy loading enabled
- View caching enabled
- High concurrency (8 workers)
- Large batch size (20 items)
- Memory pooling disabled for speed

#### ⚖️ Balanced Preset (Default)
**Best for**: Regular development workflow, general-purpose analysis

```bash
./analyze-file src/app.tsx --use-integrated --preset balanced
# or simply
./analyze-file src/app.tsx --use-integrated
```

**Configuration:**
- Views: `summary`, `table`, `tree`, `csv`, `minimal`
- Detail Level: `standard`
- Optimization Mode: `balanced`
- String Length Limit: 1000 characters
- Array Length Limit: 100 items
- Depth Limit: 10 levels
- Performance: ~15ms analysis time

**Optimization Strategy:**
- Lazy loading enabled
- View caching enabled
- Moderate concurrency (4 workers)
- Standard batch size (10 items)
- Memory pooling enabled

#### 🔍 Comprehensive Preset
**Best for**: Code audits, detailed analysis, documentation generation

```bash
./analyze-file src/app.tsx --use-integrated --preset comprehensive
```

**Configuration:**
- Views: `summary`, `table`, `tree`, `csv`, `minimal`
- Detail Level: `comprehensive`
- Optimization Mode: `accuracy`
- String Length Limit: 2000 characters
- Array Length Limit: 200 items
- Depth Limit: 15 levels
- Performance: ~25ms analysis time

**Optimization Strategy:**
- Lazy loading disabled (load everything)
- View caching disabled (always fresh)
- Low concurrency (2 workers)
- Small batch size (5 items)
- Memory pooling enabled

#### 🪶 Lightweight Preset
**Best for**: Resource-constrained environments, embedded systems, memory-limited CI

```bash
./analyze-file src/app.tsx --use-integrated --preset lightweight
```

**Configuration:**
- Views: `summary` only
- Detail Level: `minimal`
- Optimization Mode: `speed`
- String Length Limit: 200 characters
- Array Length Limit: 20 items
- Depth Limit: 3 levels
- Performance: ~3ms analysis time, <10MB memory

**Optimization Strategy:**
- Lazy loading enabled
- View caching disabled (save memory)
- Data compression enabled
- Low concurrency (2 workers)
- Small batch size (5 items)
- Memory pooling enabled

#### 🐛 Debug Preset
**Best for**: Development, troubleshooting, debugging analysis issues

```bash
./analyze-file src/app.tsx --use-integrated --preset debug
```

**Configuration:**
- Views: `summary`, `table`, `tree`, `csv`, `minimal`
- Detail Level: `comprehensive`
- Optimization Mode: `accuracy`
- String Length Limit: 5000 characters
- Array Length Limit: 500 items
- Depth Limit: 20 levels
- Performance: ~50ms analysis time (detailed output)

**Optimization Strategy:**
- All optimizations disabled
- Single-threaded processing (1 worker)
- Batch size of 1 (no batching)
- No caching or pooling
- Maximum detail for debugging

## Custom Configuration

### Override Preset Options

You can start with any preset and override specific options:

```bash
./analyze-file src/app.tsx --use-integrated \
  --preset balanced \
  --detail-level comprehensive \
  --enabled-views summary,table \
  --max-string-length 1500 \
  --optimization-mode accuracy
```

### Full Custom Configuration

Configure every aspect without using a preset:

```bash
./analyze-file src/app.tsx --use-integrated \
  --detail-level standard \
  --optimization-mode balanced \
  --enabled-views summary,table,tree,csv \
  --max-string-length 1200 \
  --max-array-length 150 \
  --max-depth 12
```

### Configuration Options Reference

#### Detail Level (`--detail-level`)
Controls the depth of analysis and information included:

- **`minimal`**: Basic information only
  - Core dependencies and imports
  - Simple metrics
  - Fastest processing

- **`standard`**: Balanced detail (default)
  - Full dependency analysis
  - Source locations
  - Performance metrics
  - Reasonable processing time

- **`comprehensive`**: Maximum detail
  - All available information
  - Extended metadata
  - Complexity analysis
  - Slower but thorough

#### Optimization Mode (`--optimization-mode`)
Controls performance vs accuracy trade-offs:

- **`speed`**: Prioritize fast processing
  - Aggressive caching
  - Simplified analysis
  - Reduced precision for speed

- **`balanced`**: Balance speed and accuracy (default)
  - Moderate caching
  - Standard analysis depth
  - Good compromise

- **`accuracy`**: Prioritize thoroughness
  - Minimal caching
  - Deep analysis
  - Maximum precision

#### Enabled Views (`--enabled-views`)
Comma-separated list of output views to generate:

- **`summary`**: Key metrics and overview
- **`table`**: Tabular dependency listing
- **`tree`**: Hierarchical visualization
- **`csv`**: Spreadsheet-friendly format
- **`minimal`**: Compact one-line output

Examples:
```bash
--enabled-views summary              # Summary only
--enabled-views summary,table        # Summary and table
--enabled-views summary,table,tree   # Three views
--enabled-views all                  # All available views
```

#### Size Limits
Control output size and memory usage:

- **`--max-string-length`**: Maximum characters in string fields (default: 1000)
- **`--max-array-length`**: Maximum items in arrays (default: 100)
- **`--max-depth`**: Maximum nesting depth (default: 10)

Examples:
```bash
--max-string-length 2000    # Longer strings
--max-array-length 200      # Larger arrays
--max-depth 15              # Deeper nesting
```

## Configuration Management CLI

### List All Presets

```bash
# Text format (default)
./analyze-file config list

# JSON format
./analyze-file config list --format json
```

### Show Preset Details

```bash
# Show specific preset
./analyze-file config show --preset fast

# JSON output
./analyze-file config show --preset comprehensive --format json
```

### Validate Configuration

```bash
# Validate a preset
./analyze-file config validate --preset balanced

# JSON validation result
./analyze-file config validate --preset debug --format json
```

## Environment Variables

Set default options using environment variables:

```bash
# Set default format
export ANALYZE_FORMAT=json

# Enable source inclusion by default
export ANALYZE_INCLUDE_SOURCES=true

# Set default timeout
export ANALYZE_TIMEOUT=10000
```

The CLI will merge environment variables with command-line options, with CLI options taking precedence.

## Performance Considerations

### Choosing the Right Preset

| Use Case | Recommended Preset | Why |
|----------|-------------------|-----|
| CI/CD Pipeline | `fast` | Quick validation, minimal resource usage |
| Development | `balanced` | Good detail with reasonable performance |
| Code Review | `comprehensive` | Maximum insight for thorough review |
| Production Monitoring | `lightweight` | Minimal overhead for continuous monitoring |
| Debugging Issues | `debug` | Maximum detail for troubleshooting |

### Performance Tuning

#### For Speed
- Use `fast` or `lightweight` preset
- Limit views to essential ones only
- Reduce string/array limits
- Use `speed` optimization mode

```bash
./analyze-file src/app.tsx --use-integrated \
  --preset fast \
  --enabled-views summary \
  --max-string-length 500 \
  --optimization-mode speed
```

#### For Detail
- Use `comprehensive` or `debug` preset
- Enable all views
- Increase limits
- Use `accuracy` optimization mode

```bash
./analyze-file src/app.tsx --use-integrated \
  --preset comprehensive \
  --enabled-views summary,table,tree,csv,minimal \
  --max-string-length 3000 \
  --optimization-mode accuracy
```

#### For Memory Efficiency
- Use `lightweight` preset
- Minimize views and limits
- Enable compression

```bash
./analyze-file src/app.tsx --use-integrated \
  --preset lightweight \
  --enabled-views summary \
  --max-depth 5
```

## API Integration

### Using Presets in API

```javascript
const { analyzeTypeScriptFile } = require('@context-action/dependency-linker');

// Use preset
const result = await analyzeTypeScriptFile('./src/app.tsx', {
  useIntegrated: true,
  preset: 'fast'
});

// Custom configuration
const customResult = await analyzeTypeScriptFile('./src/app.tsx', {
  useIntegrated: true,
  detailLevel: 'comprehensive',
  optimizationMode: 'accuracy',
  enabledViews: ['summary', 'table'],
  maxStringLength: 2000
});
```

### Configuration Manager API

```javascript
const { IntegrationConfigManager } = require('@context-action/dependency-linker');

const configManager = new IntegrationConfigManager();

// Get preset configuration
const config = configManager.getPresetConfig('balanced');

// Create custom preset
configManager.createCustomPreset('my-preset', 'Custom configuration', {
  enabledViews: ['summary', 'table'],
  detailLevel: 'standard',
  optimizationMode: 'speed',
  sizeLimits: {
    maxStringLength: 1500,
    maxArrayLength: 150,
    maxDepth: 12
  }
});

// Validate configuration
const validation = configManager.validateConfig(config);
if (!validation.isValid) {
  console.error('Configuration errors:', validation.errors);
}

if (validation.warnings.length > 0) {
  console.warn('Configuration warnings:', validation.warnings);
}
```

## Advanced Configuration

### Custom Optimization Strategies

When creating custom presets programmatically, you can define custom optimization strategies:

```javascript
const customOptimization = {
  enableLazyLoading: true,
  enableViewCaching: false,
  enableDataCompression: true,
  enableMemoryPooling: true,
  maxConcurrency: 6,
  batchSize: 15
};

configManager.createCustomPreset('custom-fast', 'Custom fast preset', config, customOptimization);
```

### Validation Rules

The configuration system validates:

- **Required fields**: At least one view must be enabled
- **Valid values**: All enum values are checked
- **Positive numbers**: All numeric limits must be positive
- **Performance warnings**: Large limits that may impact performance

### Configuration Files

You can save and load configurations from files:

```javascript
// Save current configuration
await configManager.saveToFile('./my-config.json');

// Load configuration from file
const loadedManager = await IntegrationConfigManager.loadFromFile('./my-config.json');
```

## Troubleshooting

### Common Issues

#### Configuration Validation Errors
- **"At least one view must be enabled"**: Add at least one view to `enabledViews`
- **"Invalid view: xyz"**: Use only supported view names
- **"maxStringLength must be positive"**: Ensure all numeric values are positive

#### Performance Issues
- **Slow analysis**: Try `fast` preset or reduce limits
- **High memory usage**: Use `lightweight` preset or reduce array/depth limits
- **Out of memory**: Reduce `maxArrayLength` and `maxDepth`

#### Output Issues
- **Truncated strings**: Increase `maxStringLength`
- **Missing dependencies**: Increase `maxArrayLength`
- **Shallow analysis**: Increase `maxDepth`

### Debug Configuration

Use the debug preset to troubleshoot configuration issues:

```bash
./analyze-file src/app.tsx --use-integrated --preset debug --format json > debug-output.json
```

This will generate the most detailed output possible for analysis.

## Examples

### Development Workflow

```bash
# Quick check during development
./analyze-file src/component.tsx --use-integrated --preset fast

# Detailed review before commit
./analyze-file src/component.tsx --use-integrated --preset comprehensive

# Lightweight check in CI
./analyze-file src/component.tsx --use-integrated --preset lightweight --format minimal
```

### Batch Analysis with Different Configs

```bash
# Fast analysis of multiple files
find src -name "*.tsx" | head -10 | while read file; do
  ./analyze-file "$file" --use-integrated --preset fast --format minimal
done

# Comprehensive analysis with full output
find src -name "*.tsx" | head -5 | while read file; do
  ./analyze-file "$file" --use-integrated --preset comprehensive --format report > "analysis-$(basename "$file").json"
done
```

This configuration system provides maximum flexibility while maintaining ease of use through sensible presets and comprehensive validation.