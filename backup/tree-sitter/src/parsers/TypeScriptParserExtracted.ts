/**
 * Extracted TypeScript Parser (Original Implementation)
 * This is the extracted TypeScript parser from the main project
 * Used as reference for the simplified backup implementation
 */

import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';

export interface CodeLocation {
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
}

export interface DependencyInfoOriginal {
  source: string;
  type: string;
  location: CodeLocation;
  isLocal: boolean;
  isDynamic: boolean;
  metadata?: Record<string, any>;
}

/**
 * Original TypeScript Parser (Extracted for Reference)
 * This preserves the original implementation for comparison and migration
 */
export class TypeScriptParserExtracted {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
    try {
      this.parser.setLanguage(TypeScript.tsx);
    } catch (error: any) {
      throw new Error(`Parser initialization failed: ${error.message}`);
    }
  }

  /**
   * Extract import statement from original parser
   */
  extractImportStatement(node: Parser.SyntaxNode, content: string): DependencyInfoOriginal[] {
    const sourceNode = node.childForFieldName('source');
    if (!sourceNode) return [];

    const source = sourceNode.text.replace(/['"]/g, '');
    const isLocal = source.startsWith('.') || source.startsWith('/');

    const dependency: DependencyInfoOriginal = {
      source,
      type: 'import',
      location: this.nodeToLocation(node),
      isLocal,
      isDynamic: false,
      metadata: {}
    };

    // Import clause analysis (preserve original logic)
    const importClause = node.childForFieldName('import');
    if (importClause) {
      // Named imports
      const namedImports = this.findNodesByType(importClause, 'import_specifier');
      if (namedImports.length > 0) {
        dependency.metadata!.members = namedImports.map(spec => {
          const name = spec.childForFieldName('name');
          const alias = spec.childForFieldName('alias');
          return alias ? `${name?.text} as ${alias.text}` : name?.text || '';
        });
        dependency.metadata!.importType = 'named';
      }

      // Default import
      const defaultImport = importClause.descendantsOfType('identifier')[0];
      if (defaultImport && !namedImports.length) {
        dependency.metadata!.isDefault = true;
        dependency.metadata!.importType = 'default';
      }

      // Namespace import
      const namespaceImport = this.findNodesByType(importClause, 'namespace_import')[0];
      if (namespaceImport) {
        dependency.metadata!.isNamespace = true;
        dependency.metadata!.importType = 'namespace';
        const alias = namespaceImport.childForFieldName('name');
        if (alias) {
          dependency.metadata!.alias = alias.text;
        }
      }
    } else {
      // Side-effect import
      dependency.metadata!.importType = 'side-effect';
    }

    return [dependency];
  }

  /**
   * Helper methods from original parser
   */
  private nodeToLocation(node: Parser.SyntaxNode): CodeLocation {
    return {
      line: node.startPosition.row + 1,
      column: node.startPosition.column + 1,
      endLine: node.endPosition.row + 1,
      endColumn: node.endPosition.column + 1
    };
  }

  private findNodesByType(node: Parser.SyntaxNode, type: string): Parser.SyntaxNode[] {
    const nodes: Parser.SyntaxNode[] = [];
    
    const visit = (current: Parser.SyntaxNode) => {
      if (current.type === type) {
        nodes.push(current);
      }
      
      for (let i = 0; i < current.childCount; i++) {
        const child = current.child(i);
        if (child) {
          visit(child);
        }
      }
    };
    
    visit(node);
    return nodes;
  }
}