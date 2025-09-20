# Tech Stack and Dependencies

## Core Technologies
- **Language**: TypeScript 5.x
- **Runtime**: Node.js 18+ (Node.js 22+ recommended)
- **Build System**: TypeScript compiler (tsc)
- **Package Manager**: npm

## Main Dependencies
- **tree-sitter**: Core AST parsing engine (^0.21.0)
- **tree-sitter-typescript**: TypeScript parsing (^0.23.2)
- **tree-sitter-go**: Go language parsing (^0.21.2)
- **tree-sitter-java**: Java language parsing (^0.21.0)
- **commander**: CLI framework (^14.0.1)
- **glob**: File pattern matching (^11.0.3)

## Development Tools
- **Testing**: Jest (^29.0.0) with ts-jest
- **Code Quality**: Biome (^2.2.4) - replaces ESLint/Prettier
- **Type Checking**: TypeScript with strict mode
- **Coverage**: Jest coverage with specific thresholds

## TypeScript Configuration
- **Target**: ES2020
- **Module**: CommonJS
- **Strict Mode**: Enabled with all strict flags
- **Declaration**: Generated with source maps
- **Output**: dist/ directory

## File Structure
- **Source**: src/ (TypeScript)
- **Build Output**: dist/ (JavaScript + declarations)
- **Tests**: tests/ (Jest test suites)
- **Documentation**: docs/ (Comprehensive guides)
- **Examples**: examples/ (Integration examples)
- **Demo**: demo/ (Interactive examples)