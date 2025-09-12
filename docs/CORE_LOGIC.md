# Core Logic and Architecture

This document describes the core logic, architecture, and API/CLI integration of the TypeScript Dependency Linker.

## 1. Test Architecture Analysis

The `tests/` directory is structured as follows:

- **`contract/`**: Contains tests that verify the CLI contract.
- **`integration/`**: Contains tests that verify the integration between different parts of the application, such as dependency extraction, error handling, and file analysis.
- **`mocks/`**: Contains mock objects for testing purposes.
- **`performance/`**: Contains performance tests.
- **`unit/`**: Contains unit tests for individual components, organized by `api`, `core`, `models`, and `services`.

This structure suggests a well-organized and layered architecture, with a clear separation of concerns. The documentation should reflect this structure.

## 2. API and CLI Integration Analysis

- **`src/api/`**: This directory contains the core API of the application. `TypeScriptAnalyzer.ts` and `BatchAnalyzer.ts` seem to be the main entry points for the analysis. The `factory-functions.ts` file likely provides an easy way to create instances of the analyzers.
- **`src/cli/`**: This directory contains the command-line interface. `analyze-file.ts` is the entry point for the `analyze-file` command. `CommandParser.ts` is responsible for parsing the command-line arguments, and `CLIAdapter.ts` likely adapts the CLI to the core API.

The integration between the CLI and the API is straightforward: the CLI parses the command-line arguments and then calls the core API to perform the analysis. The documentation should explain this flow.
