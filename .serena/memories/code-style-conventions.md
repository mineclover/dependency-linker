# Code Style and Conventions

## TypeScript Style
- **Indentation**: Tabs (configured in Biome)
- **Quotes**: Double quotes for strings
- **Semicolons**: Required
- **Naming Conventions**:
  - Classes: PascalCase (e.g., `TypeScriptAnalyzer`)
  - Interfaces: PascalCase with 'I' prefix (e.g., `IDataExtractor`)
  - Methods/Functions: camelCase (e.g., `analyzeFile`)
  - Constants: UPPER_SNAKE_CASE
  - Files: kebab-case for utilities, PascalCase for classes

## File Organization
- **Interfaces**: Separate files with 'I' prefix
- **Implementations**: Same name as interface without 'I'
- **Index files**: Export public APIs
- **Types**: Dedicated types.ts files for complex type definitions

## Architecture Patterns
- **Dependency Injection**: Constructor injection preferred
- **Interface Segregation**: Small, focused interfaces
- **Single Responsibility**: Each class has one clear purpose
- **Plugin Architecture**: Extensible via registries

## Error Handling
- **Custom Errors**: Extend base Error class
- **Graceful Degradation**: Continue on non-critical errors
- **Validation**: Input validation at boundaries
- **Logging**: Structured logging with levels

## Testing Conventions
- **File Naming**: `*.test.ts` for unit tests
- **Structure**: Arrange-Act-Assert pattern
- **Mocking**: Jest mocks for external dependencies
- **Coverage**: Maintain >85% coverage for core APIs

## Documentation
- **JSDoc**: For public APIs
- **README**: Comprehensive with examples
- **Type Annotations**: Explicit types for public interfaces
- **Comments**: Only for complex business logic

## Import/Export Style
- **Named Exports**: Preferred over default exports
- **Index Files**: Re-export public APIs
- **Relative Imports**: For same module
- **Absolute Imports**: For cross-module dependencies

## Biome Configuration
- **Rules**: Recommended + custom rules
- **Console**: Allowed (noConsole: off)
- **Any Type**: Allowed sparingly (noExplicitAny: off)
- **Const**: Enforced where possible