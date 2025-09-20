#!/usr/bin/env node

/**
 * Configuration Examples for TypeScript Dependency Linker
 *
 * This script demonstrates various configuration options and presets
 * for the integrated analysis mode.
 */

const { execSync } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runCommand(description, command) {
  log(`\n${colors.bright}=== ${description} ===${colors.reset}`);
  log(`${colors.cyan}Command: ${command}${colors.reset}`);
  log(`${colors.yellow}Output:${colors.reset}`);

  try {
    const output = execSync(command, {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..'),
      timeout: 30000
    });
    console.log(output);
  } catch (error) {
    log(`${colors.red}Error: ${error.message}${colors.reset}`);
  }
}

function main() {
  log(`${colors.bright}${colors.blue}TypeScript Dependency Linker - Configuration Examples${colors.reset}`);
  log(`${colors.bright}======================================================${colors.reset}`);

  // Test file path
  const testFile = 'tests/fixtures/typescript/simple-component.tsx';

  // 1. Configuration Management
  log(`\n${colors.bright}${colors.magenta}1. Configuration Management${colors.reset}`);

  runCommand(
    'List All Available Presets',
    './analyze-file config list'
  );

  runCommand(
    'Show Fast Preset Details',
    './analyze-file config show --preset fast'
  );

  runCommand(
    'Show Comprehensive Preset in JSON',
    './analyze-file config show --preset comprehensive --format json'
  );

  runCommand(
    'Validate Balanced Preset',
    './analyze-file config validate --preset balanced'
  );

  // 2. Preset Usage Examples
  log(`\n${colors.bright}${colors.magenta}2. Using Built-in Presets${colors.reset}`);

  runCommand(
    'Fast Preset - Quick Analysis',
    `./analyze-file ${testFile} --use-integrated --preset fast --format summary`
  );

  runCommand(
    'Balanced Preset - General Purpose',
    `./analyze-file ${testFile} --use-integrated --preset balanced --format table`
  );

  runCommand(
    'Comprehensive Preset - Maximum Detail',
    `./analyze-file ${testFile} --use-integrated --preset comprehensive --format report | head -20`
  );

  runCommand(
    'Lightweight Preset - Minimal Memory',
    `./analyze-file ${testFile} --use-integrated --preset lightweight --format minimal`
  );

  runCommand(
    'Debug Preset - Development/Troubleshooting',
    `./analyze-file ${testFile} --use-integrated --preset debug --format json | jq '.metadata'`
  );

  // 3. Custom Configuration
  log(`\n${colors.bright}${colors.magenta}3. Custom Configuration Options${colors.reset}`);

  runCommand(
    'Custom Detail Level Override',
    `./analyze-file ${testFile} --use-integrated --preset fast --detail-level comprehensive --format summary`
  );

  runCommand(
    'Custom Views Selection',
    `./analyze-file ${testFile} --use-integrated --enabled-views summary,table --format json | jq '.views | keys'`
  );

  runCommand(
    'Custom Size Limits',
    `./analyze-file ${testFile} --use-integrated --max-string-length 500 --max-array-length 50 --format summary`
  );

  runCommand(
    'Custom Optimization Mode',
    `./analyze-file ${testFile} --use-integrated --preset balanced --optimization-mode speed --format summary`
  );

  runCommand(
    'Full Custom Configuration',
    `./analyze-file ${testFile} --use-integrated \\
      --detail-level standard \\
      --optimization-mode accuracy \\
      --enabled-views summary,tree \\
      --max-string-length 1500 \\
      --max-depth 12 \\
      --format tree`
  );

  // 4. Performance Comparison
  log(`\n${colors.bright}${colors.magenta}4. Performance Comparison${colors.reset}`);

  runCommand(
    'Performance Test - Fast Preset',
    `time ./analyze-file ${testFile} --use-integrated --preset fast --format minimal`
  );

  runCommand(
    'Performance Test - Lightweight Preset',
    `time ./analyze-file ${testFile} --use-integrated --preset lightweight --format minimal`
  );

  runCommand(
    'Performance Test - Comprehensive Preset',
    `time ./analyze-file ${testFile} --use-integrated --preset comprehensive --format summary`
  );

  // 5. Output Format Examples
  log(`\n${colors.bright}${colors.magenta}5. Different Output Formats${colors.reset}`);

  runCommand(
    'Summary View with Fast Preset',
    `./analyze-file ${testFile} --use-integrated --preset fast --format summary`
  );

  runCommand(
    'Table View with Balanced Preset',
    `./analyze-file ${testFile} --use-integrated --preset balanced --format table`
  );

  runCommand(
    'Tree View with Standard Options',
    `./analyze-file ${testFile} --use-integrated --preset balanced --format tree`
  );

  runCommand(
    'Minimal Format for Scripting',
    `./analyze-file ${testFile} --use-integrated --preset fast --format minimal`
  );

  runCommand(
    'Report Format for Documentation',
    `./analyze-file ${testFile} --use-integrated --preset comprehensive --format report | head -15`
  );

  // 6. Error Handling and Validation
  log(`\n${colors.bright}${colors.magenta}6. Configuration Validation Examples${colors.reset}`);

  runCommand(
    'Invalid Preset Name (Expected Error)',
    './analyze-file config show --preset invalid-preset-name'
  );

  runCommand(
    'Invalid Detail Level (Expected Error)',
    `./analyze-file ${testFile} --use-integrated --detail-level invalid`
  );

  runCommand(
    'Invalid View Name (Expected Error)',
    `./analyze-file ${testFile} --use-integrated --enabled-views invalid-view`
  );

  runCommand(
    'Configuration Warnings Example',
    `./analyze-file ${testFile} --use-integrated --detail-level comprehensive --enabled-views summary,table,tree,csv,minimal --max-string-length 15000 --format summary`
  );

  // 7. Advanced Usage Patterns
  log(`\n${colors.bright}${colors.magenta}7. Advanced Usage Patterns${colors.reset}`);

  runCommand(
    'CI/CD Pipeline Usage',
    `./analyze-file ${testFile} --use-integrated --preset fast --format minimal | wc -l`
  );

  runCommand(
    'Development Workflow',
    `./analyze-file ${testFile} --use-integrated --preset balanced --enabled-views summary,table --format json | jq '.views.summary'`
  );

  runCommand(
    'Code Review Usage',
    `./analyze-file ${testFile} --use-integrated --preset comprehensive --format report | grep -A5 -B5 "Dependencies"`
  );

  runCommand(
    'Memory-Constrained Environment',
    `./analyze-file ${testFile} --use-integrated --preset lightweight --enabled-views summary --max-depth 3 --format summary`
  );

  // 8. Batch Processing Examples
  log(`\n${colors.bright}${colors.magenta}8. Batch Processing Patterns${colors.reset}`);

  runCommand(
    'Quick Batch Check',
    `find tests/fixtures -name "*.tsx" | head -3 | while read file; do echo "=== $file ==="; ./analyze-file "$file" --use-integrated --preset fast --format minimal; done`
  );

  runCommand(
    'Comprehensive Batch Analysis',
    `find tests/fixtures -name "*.tsx" | head -2 | while read file; do echo "=== Analysis of $file ==="; ./analyze-file "$file" --use-integrated --preset balanced --format summary; echo; done`
  );

  log(`\n${colors.bright}${colors.green}Configuration examples completed!${colors.reset}`);
  log(`${colors.bright}For more information, see:${colors.reset}`);
  log(`  - docs/CONFIGURATION.md - Comprehensive configuration guide`);
  log(`  - ./analyze-file --help - CLI help`);
  log(`  - ./analyze-file config list - Available presets`);
}

if (require.main === module) {
  main();
}

module.exports = { main };