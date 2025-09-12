// Core service interfaces for dependency injection and modular architecture
export { IFileAnalyzer } from './IFileAnalyzer';
export { ITypeScriptParser } from './ITypeScriptParser';  
export { IOutputFormatter } from './IOutputFormatter';

// Core types for API layer
export { ParseOptions, ParseResult, ValidationResult } from '../types/ParseTypes';