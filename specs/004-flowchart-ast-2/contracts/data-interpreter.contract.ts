/**
 * Data Interpreter Plugin Contract
 * Interface for processing and analyzing extracted AST data
 */

export interface IDataInterpreter<TInput, TOutput> {
  /**
   * Unique identifier for this interpreter
   */
  readonly name: string;

  /**
   * Version of this interpreter for compatibility tracking
   */
  readonly version: string;

  /**
   * Data type this interpreter expects as input
   */
  readonly inputType: string;

  /**
   * Data type this interpreter produces as output
   */
  readonly outputType: string;

  /**
   * Dependencies on other interpreters (execution order)
   */
  readonly dependencies: string[];

  /**
   * Process extracted data and produce analysis results
   * @param data Array of extracted data items
   * @param context Analysis context information
   * @returns Processed analysis result
   */
  interpret(data: TInput[], context: AnalysisContext): Promise<TOutput>;

  /**
   * Validate if this interpreter can process the given input type
   * @param inputType Data type identifier
   */
  supportsInputType(inputType: string): boolean;

  /**
   * Get configuration schema for this interpreter
   */
  getConfigSchema(): InterpreterConfigSchema;

  /**
   * Validate interpreter configuration
   * @param config Configuration object to validate
   */
  validateConfig(config: any): ConfigValidationResult;
}

export interface AnalysisContext {
  filePath: string;
  language: string;
  projectRoot?: string;
  workspaceFiles?: string[];
  previousResults?: Record<string, any>;
  config: Record<string, any>;
}

export interface InterpreterConfigSchema {
  properties: Record<string, ConfigProperty>;
  required: string[];
}

export interface ConfigProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  default?: any;
  enum?: any[];
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Built-in interpreter types for common analysis patterns
 */

export interface DependencyAnalysisInterpreter extends IDataInterpreter<DependencyData, DependencyAnalysisResult> {
  readonly inputType: 'dependency';
  readonly outputType: 'dependency-analysis';
}

export interface DependencyData {
  source: string;
  type: 'external' | 'internal' | 'relative';
  importType: 'import' | 'require' | 'dynamic';
  specifiers: ImportSpecifier[];
  location: SourceLocation;
}

export interface DependencyAnalysisResult {
  dependencies: ClassifiedDependency[];
  externalPackages: ExternalPackageInfo[];
  internalModules: InternalModuleInfo[];
  circularDependencies: CircularDependencyInfo[];
  unusedImports: UnusedImportInfo[];
  metrics: DependencyMetrics;
}

export interface ClassifiedDependency {
  source: string;
  resolvedPath?: string;
  classification: 'external' | 'internal' | 'relative' | 'builtin';
  packageName?: string;
  version?: string;
  isDevDependency?: boolean;
}

export interface ExternalPackageInfo {
  name: string;
  version?: string;
  type: 'dependency' | 'devDependency' | 'peerDependency';
  usageCount: number;
  firstSeen: SourceLocation;
}

export interface InternalModuleInfo {
  path: string;
  exports: string[];
  importedBy: string[];
  usageCount: number;
}

export interface CircularDependencyInfo {
  cycle: string[];
  severity: 'warning' | 'error';
}

export interface UnusedImportInfo {
  source: string;
  specifier: string;
  location: SourceLocation;
}

export interface DependencyMetrics {
  totalDependencies: number;
  externalDependencies: number;
  internalDependencies: number;
  circularDependencyCount: number;
  unusedImportCount: number;
  dependencyDepth: number;
}

export interface IdentifierAnalysisInterpreter extends IDataInterpreter<IdentifierData, IdentifierAnalysisResult> {
  readonly inputType: 'identifier';
  readonly outputType: 'identifier-analysis';
}

export interface IdentifierData {
  name: string;
  type: 'function' | 'class' | 'variable' | 'interface' | 'type';
  scope: 'global' | 'module' | 'local';
  visibility: 'public' | 'private' | 'protected';
  location: SourceLocation;
  references: SourceLocation[];
}

export interface IdentifierAnalysisResult {
  symbols: SymbolInfo[];
  exports: ExportInfo[];
  unusedSymbols: UnusedSymbolInfo[];
  namingPatterns: NamingPatternInfo[];
  metrics: IdentifierMetrics;
}

export interface SymbolInfo {
  name: string;
  type: string;
  scope: string;
  visibility: string;
  usageCount: number;
  definition: SourceLocation;
  references: SourceLocation[];
}

export interface ExportInfo {
  name: string;
  type: 'default' | 'named' | 're-export';
  source?: string;
  usedExternally: boolean;
}

export interface UnusedSymbolInfo {
  name: string;
  type: string;
  location: SourceLocation;
  reason: 'never-used' | 'only-defined' | 'dead-code';
}

export interface NamingPatternInfo {
  pattern: string;
  convention: 'camelCase' | 'PascalCase' | 'snake_case' | 'SCREAMING_SNAKE_CASE' | 'kebab-case' | 'mixed';
  violations: NamingViolation[];
}

export interface NamingViolation {
  identifier: string;
  expected: string;
  location: SourceLocation;
}

export interface IdentifierMetrics {
  totalSymbols: number;
  exportedSymbols: number;
  unusedSymbols: number;
  averageNameLength: number;
  namingCompliance: number;
}

export interface SourceLocation {
  line: number;
  column: number;
  offset: number;
}

export interface ImportSpecifier {
  type: 'default' | 'named' | 'namespace';
  imported: string;
  local: string;
}