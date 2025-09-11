/**
 * Output Formatter
 * Formats analysis results for JSON and text output
 */

import { AnalysisResult } from '../models/AnalysisResult';
import { DependencyInfo } from '../models/DependencyInfo';
import { ImportInfo } from '../models/ImportInfo';
import { ExportInfo } from '../models/ExportInfo';
import { SourceLocation } from '../models/SourceLocation';

export class OutputFormatter {
  /**
   * Formats analysis result as JSON
   * @param result Analysis result to format
   * @returns JSON string
   */
  formatAsJson(result: AnalysisResult): string {
    try {
      return JSON.stringify(result, null, 2);
    } catch (error) {
      return JSON.stringify({
        error: {
          code: 'SERIALIZATION_ERROR',
          message: `Failed to serialize result: ${error instanceof Error ? error.message : String(error)}`
        }
      }, null, 2);
    }
  }

  /**
   * Formats analysis result as human-readable text
   * @param result Analysis result to format
   * @returns Formatted text string
   */
  formatAsText(result: AnalysisResult): string {
    if (!result.success) {
      return this.formatErrorAsText(result);
    }

    let output = '';
    
    // Header
    output += `File: ${result.filePath}\n`;
    output += `Parse Time: ${result.parseTime}ms\n`;
    output += `Status: ${result.success ? 'Success' : 'Failed'}\n`;
    output += '\n';

    // Dependencies section
    if (result.dependencies.length > 0) {
      output += 'Dependencies:\n';
      output += this.formatDependenciesAsText(result.dependencies);
      output += '\n';
    } else {
      output += 'Dependencies: None\n\n';
    }

    // Imports section
    if (result.imports.length > 0) {
      output += 'Imports:\n';
      output += this.formatImportsAsText(result.imports);
      output += '\n';
    } else {
      output += 'Imports: None\n\n';
    }

    // Exports section
    if (result.exports.length > 0) {
      output += 'Exports:\n';
      output += this.formatExportsAsText(result.exports);
      output += '\n';
    } else {
      output += 'Exports: None\n\n';
    }

    // Summary
    output += 'Summary:\n';
    output += `  Total Dependencies: ${result.dependencies.length}\n`;
    output += `  Total Imports: ${result.imports.length}\n`;
    output += `  Total Exports: ${result.exports.length}\n`;

    // Dependency breakdown
    if (result.dependencies.length > 0) {
      const byType = this.groupDependenciesByType(result.dependencies);
      output += `  External: ${byType.external.length}\n`;
      output += `  Internal: ${byType.internal.length}\n`;
      output += `  Relative: ${byType.relative.length}\n`;
    }

    return output.trim();
  }

  /**
   * Formats error result as text
   * @param result Failed analysis result
   * @returns Error message text
   */
  private formatErrorAsText(result: AnalysisResult): string {
    let output = '';
    
    output += `File: ${result.filePath}\n`;
    output += `Status: Failed\n`;
    
    if (result.error) {
      output += `Error Code: ${result.error.code}\n`;
      output += `Error Message: ${result.error.message}\n`;
      
      if (result.error.details && typeof result.error.details === 'object') {
        const details = result.error.details;
        if (details.filePath) {
          output += `File Path: ${details.filePath}\n`;
        }
        if (details.timeout) {
          output += `Timeout: ${details.timeout}ms\n`;
        }
        if (details.errors && Array.isArray(details.errors)) {
          output += `Validation Errors:\n`;
          for (const error of details.errors) {
            output += `  - ${error}\n`;
          }
        }
      }
    }
    
    if (result.parseTime > 0) {
      output += `Parse Time: ${result.parseTime}ms\n`;
    }

    return output.trim();
  }

  /**
   * Formats dependencies as text
   * @param dependencies Array of dependencies
   * @returns Formatted text
   */
  private formatDependenciesAsText(dependencies: DependencyInfo[]): string {
    let output = '';
    
    const byType = this.groupDependenciesByType(dependencies);
    
    if (byType.external.length > 0) {
      output += '  External:\n';
      for (const dep of byType.external) {
        output += `    ${dep.source} ${this.formatLocation(dep.location)}\n`;
      }
    }
    
    if (byType.internal.length > 0) {
      output += '  Internal:\n';
      for (const dep of byType.internal) {
        output += `    ${dep.source} ${this.formatLocation(dep.location)}\n`;
      }
    }
    
    if (byType.relative.length > 0) {
      output += '  Relative:\n';
      for (const dep of byType.relative) {
        output += `    ${dep.source} ${this.formatLocation(dep.location)}\n`;
      }
    }
    
    return output;
  }

  /**
   * Formats imports as text
   * @param imports Array of imports
   * @returns Formatted text
   */
  private formatImportsAsText(imports: ImportInfo[]): string {
    let output = '';
    
    for (const imp of imports) {
      const typeFlag = imp.isTypeOnly ? ' (type-only)' : '';
      output += `  ${imp.source}${typeFlag} ${this.formatLocation(imp.location)}\n`;
      
      if (imp.specifiers.length > 0) {
        for (const spec of imp.specifiers) {
          const alias = spec.local !== spec.imported ? ` as ${spec.local}` : '';
          output += `    ${spec.type}: ${spec.imported}${alias}\n`;
        }
      } else {
        output += `    side-effect import\n`;
      }
    }
    
    return output;
  }

  /**
   * Formats exports as text
   * @param exports Array of exports
   * @returns Formatted text
   */
  private formatExportsAsText(exports: ExportInfo[]): string {
    let output = '';
    
    const byType = this.groupExportsByType(exports);
    
    if (byType.default.length > 0) {
      output += '  Default:\n';
      for (const exp of byType.default) {
        const typeFlag = exp.isTypeOnly ? ' (type-only)' : '';
        output += `    ${exp.name}${typeFlag} ${this.formatLocation(exp.location)}\n`;
      }
    }
    
    if (byType.named.length > 0) {
      output += '  Named:\n';
      for (const exp of byType.named) {
        const typeFlag = exp.isTypeOnly ? ' (type-only)' : '';
        output += `    ${exp.name}${typeFlag} ${this.formatLocation(exp.location)}\n`;
      }
    }
    
    if (byType.namespace.length > 0) {
      output += '  Namespace:\n';
      for (const exp of byType.namespace) {
        const typeFlag = exp.isTypeOnly ? ' (type-only)' : '';
        output += `    ${exp.name}${typeFlag} ${this.formatLocation(exp.location)}\n`;
      }
    }
    
    return output;
  }

  /**
   * Formats a source location for display
   * @param location Source location
   * @returns Formatted location string
   */
  private formatLocation(location: SourceLocation): string {
    return `(${location.line}:${location.column})`;
  }

  /**
   * Groups dependencies by type
   * @param dependencies Array of dependencies
   * @returns Dependencies grouped by type
   */
  private groupDependenciesByType(dependencies: DependencyInfo[]): {
    external: DependencyInfo[];
    internal: DependencyInfo[];
    relative: DependencyInfo[];
  } {
    return dependencies.reduce((groups, dep) => {
      groups[dep.type].push(dep);
      return groups;
    }, {
      external: [] as DependencyInfo[],
      internal: [] as DependencyInfo[],
      relative: [] as DependencyInfo[]
    });
  }

  /**
   * Groups exports by type
   * @param exports Array of exports
   * @returns Exports grouped by type
   */
  private groupExportsByType(exports: ExportInfo[]): {
    default: ExportInfo[];
    named: ExportInfo[];
    namespace: ExportInfo[];
    're-export': ExportInfo[];
  } {
    return exports.reduce((groups, exp) => {
      groups[exp.type].push(exp);
      return groups;
    }, {
      default: [] as ExportInfo[],
      named: [] as ExportInfo[],
      namespace: [] as ExportInfo[],
      're-export': [] as ExportInfo[]
    });
  }

  /**
   * Creates a compact JSON representation
   * @param result Analysis result
   * @returns Compact JSON string
   */
  formatAsCompactJson(result: AnalysisResult): string {
    try {
      return JSON.stringify(result);
    } catch (error) {
      return JSON.stringify({
        error: {
          code: 'SERIALIZATION_ERROR',
          message: `Failed to serialize result: ${error instanceof Error ? error.message : String(error)}`
        }
      });
    }
  }

  /**
   * Creates a summary-only text output
   * @param result Analysis result
   * @returns Summary text
   */
  formatAsSummary(result: AnalysisResult): string {
    if (!result.success) {
      return `❌ ${result.filePath}: ${result.error?.message || 'Analysis failed'}`;
    }

    const deps = result.dependencies.length;
    const imports = result.imports.length;
    const exports = result.exports.length;
    const time = result.parseTime;

    return `✅ ${result.filePath}: ${deps} deps, ${imports} imports, ${exports} exports (${time}ms)`;
  }

  /**
   * Formats result for CSV export
   * @param result Analysis result
   * @returns CSV line
   */
  formatAsCsvLine(result: AnalysisResult): string {
    const success = result.success ? 'success' : 'failed';
    const deps = result.dependencies.length;
    const imports = result.imports.length;
    const exports = result.exports.length;
    const time = result.parseTime;
    const error = result.error?.code || '';

    return `"${result.filePath}","${success}",${deps},${imports},${exports},${time},"${error}"`;
  }

  /**
   * Gets CSV header
   * @returns CSV header line
   */
  getCsvHeader(): string {
    return 'filepath,status,dependencies,imports,exports,parsetime,error';
  }
}