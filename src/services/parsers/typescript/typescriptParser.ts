/**
 * TypeScript/JavaScript Tree-sitter 파서
 * TypeScript/JavaScript Tree-sitter Parser
 */

import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';
import JavaScript from 'tree-sitter-javascript';
import {
  BaseLanguageParser,
  LanguageAnalysisResult,
  DependencyInfo,
  FunctionInfo,
  ClassInfo,
  VariableInfo,
  ExportInfo,
  CommentInfo,
  CodeLocation,
  ParameterInfo,
  PropertyInfo
} from '../common/parserInterfaces';
import { DependencyClassifier, ClassifiedDependency } from '../common/dependencyClassifier';

export class TypeScriptParser extends BaseLanguageParser {
  readonly language = 'typescript';
  readonly extensions = ['.ts', '.tsx'];
  readonly parserVersion = '0.21.2';
  
  constructor() {
    super(TypeScript.tsx);
  }
  
  protected processNode(node: Parser.SyntaxNode, content: string, result: LanguageAnalysisResult): void {
    switch (node.type) {
      case 'import_statement':
        result.dependencies.push(...this.extractImportStatement(node, content));
        break;
        
      case 'call_expression':
        // require() 또는 dynamic import() 처리
        const dynamicImports = this.extractDynamicImports(node, content);
        result.dependencies.push(...dynamicImports);
        break;
        
      case 'export_statement':
      case 'export_default_declaration':
        result.exports.push(...this.extractExportStatement(node, content));
        break;
        
      case 'function_declaration':
      case 'function_expression':
      case 'arrow_function':
      case 'method_definition':
        result.functions.push(...this.extractFunction(node, content));
        break;
        
      case 'class_declaration':
      case 'class_expression':
        result.classes.push(...this.extractClass(node, content));
        break;
        
      case 'variable_declaration':
      case 'lexical_declaration':
        result.variables.push(...this.extractVariable(node, content));
        break;
        
      case 'comment':
        const comments = this.extractComment(node, content);
        result.comments.push(...comments);
        // TODO 추출
        for (const comment of comments) {
          result.todos.push(...this.extractTodosFromComment(comment));
        }
        break;
    }
  }
  
  extractDependencies(node: Parser.SyntaxNode, content: string): DependencyInfo[] {
    const dependencies: DependencyInfo[] = [];
    
    // Import statements
    const importNodes = this.findNodesByType(node, 'import_statement');
    for (const importNode of importNodes) {
      dependencies.push(...this.extractImportStatement(importNode, content));
    }
    
    // Dynamic imports and requires
    const callNodes = this.findNodesByType(node, 'call_expression');
    for (const callNode of callNodes) {
      dependencies.push(...this.extractDynamicImports(callNode, content));
    }
    
    return dependencies;
  }
  
  extractFunctions(node: Parser.SyntaxNode, content: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    const functionTypes = [
      'function_declaration', 
      'function_expression', 
      'arrow_function', 
      'method_definition'
    ];
    
    for (const type of functionTypes) {
      const functionNodes = this.findNodesByType(node, type);
      for (const funcNode of functionNodes) {
        functions.push(...this.extractFunction(funcNode, content));
      }
    }
    
    return functions;
  }
  
  extractClasses(node: Parser.SyntaxNode, content: string): ClassInfo[] {
    const classes: ClassInfo[] = [];
    const classNodes = [
      ...this.findNodesByType(node, 'class_declaration'),
      ...this.findNodesByType(node, 'class_expression')
    ];
    
    for (const classNode of classNodes) {
      classes.push(...this.extractClass(classNode, content));
    }
    
    return classes;
  }
  
  extractVariables(node: Parser.SyntaxNode, content: string): VariableInfo[] {
    const variables: VariableInfo[] = [];
    const varNodes = [
      ...this.findNodesByType(node, 'variable_declaration'),
      ...this.findNodesByType(node, 'lexical_declaration')
    ];
    
    for (const varNode of varNodes) {
      variables.push(...this.extractVariable(varNode, content));
    }
    
    return variables;
  }
  
  extractExports(node: Parser.SyntaxNode, content: string): ExportInfo[] {
    const exports: ExportInfo[] = [];
    const exportNodes = [
      ...this.findNodesByType(node, 'export_statement'),
      ...this.findNodesByType(node, 'export_default_declaration')
    ];
    
    for (const exportNode of exportNodes) {
      exports.push(...this.extractExportStatement(exportNode, content));
    }
    
    return exports;
  }
  
  extractComments(node: Parser.SyntaxNode, content: string): CommentInfo[] {
    const comments: CommentInfo[] = [];
    const commentNodes = this.findNodesByType(node, 'comment');
    
    for (const commentNode of commentNodes) {
      comments.push(...this.extractComment(commentNode, content));
    }
    
    return comments;
  }
  
  /**
   * Import statement 추출
   */
  private extractImportStatement(node: Parser.SyntaxNode, content: string): DependencyInfo[] {
    const sourceNode = node.childForFieldName('source');
    if (!sourceNode) return [];

    const source = sourceNode.text.replace(/['"]/g, '');
    const isLocal = source.startsWith('.') || source.startsWith('/');

    const dependency: DependencyInfo = {
      source,
      type: 'import',
      location: this.nodeToLocation(node),
      isLocal,
      isDynamic: false,
      metadata: {}
    };

    // Import clause 분석
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
   * Dynamic import/require 추출
   */
  private extractDynamicImports(node: Parser.SyntaxNode, content: string): DependencyInfo[] {
    const dependencies: DependencyInfo[] = [];
    
    const function_node = node.childForFieldName('function');
    if (!function_node) return dependencies;
    
    const functionName = function_node.text;
    
    if (functionName === 'require') {
      // CommonJS require
      const args = node.childForFieldName('arguments');
      if (args) {
        const stringNodes = this.findNodesByType(args, 'string');
        for (const stringNode of stringNodes) {
          const source = stringNode.text.replace(/['"]/g, '');
          const isLocal = source.startsWith('.') || source.startsWith('/');
          
          dependencies.push({
            source,
            type: 'require',
            location: this.nodeToLocation(node),
            isLocal,
            isDynamic: false
          });
        }
      }
    } else if (functionName === 'import') {
      // Dynamic import
      const args = node.childForFieldName('arguments');
      if (args) {
        const stringNodes = this.findNodesByType(args, 'string');
        for (const stringNode of stringNodes) {
          const source = stringNode.text.replace(/['"]/g, '');
          const isLocal = source.startsWith('.') || source.startsWith('/');
          
          dependencies.push({
            source,
            type: 'dynamic_import',
            location: this.nodeToLocation(node),
            isLocal,
            isDynamic: true
          });
        }
      }
    }
    
    return dependencies;
  }
  
  /**
   * Export statement 추출
   */
  private extractExportStatement(node: Parser.SyntaxNode, content: string): ExportInfo[] {
    const exports: ExportInfo[] = [];
    
    if (node.type === 'export_default_declaration') {
      // Default export
      const declaration = node.childForFieldName('declaration');
      let name = 'default';
      
      if (declaration) {
        const nameNode = declaration.childForFieldName('name');
        if (nameNode) {
          name = nameNode.text;
        }
      }
      
      exports.push({
        name,
        type: 'default',
        location: this.nodeToLocation(node)
      });
      
    } else if (node.type === 'export_statement') {
      // Named exports
      const declaration = node.childForFieldName('declaration');
      const source = node.childForFieldName('source');
      
      if (declaration) {
        // export const/let/var/function/class
        const nameNode = declaration.childForFieldName('name');
        if (nameNode) {
          exports.push({
            name: nameNode.text,
            type: 'named',
            location: this.nodeToLocation(node)
          });
        }
      } else {
        // export { ... } [from ...]
        const exportClause = node.childForFieldName('export_clause');
        if (exportClause) {
          const specifiers = this.findNodesByType(exportClause, 'export_specifier');
          for (const spec of specifiers) {
            const name = spec.childForFieldName('name');
            const alias = spec.childForFieldName('alias');
            
            if (name) {
              exports.push({
                name: alias ? alias.text : name.text,
                type: source ? 're-export' : 'named',
                source: source?.text.replace(/['"]/g, ''),
                location: this.nodeToLocation(spec),
                alias: alias ? name.text : undefined
              });
            }
          }
        }
      }
    }
    
    return exports;
  }
  
  /**
   * Function 추출
   */
  private extractFunction(node: Parser.SyntaxNode, content: string): FunctionInfo[] {
    const nameNode = node.childForFieldName('name');
    if (!nameNode && node.type !== 'arrow_function') return [];

    const name = nameNode ? nameNode.text : 'anonymous';
    const params = this.extractParameters(node);
    
    const funcInfo: FunctionInfo = {
      name,
      type: this.getFunctionType(node),
      params,
      location: this.nodeToLocation(node),
      isAsync: node.text.includes('async'),
      isGenerator: node.text.includes('function*'),
      isExported: this.isExported(node)
    };

    // Return type (TypeScript)
    const returnType = node.childForFieldName('return_type');
    if (returnType) {
      funcInfo.returnType = returnType.text;
    }

    // Decorators
    const decorators = this.findNodesByType(node.parent || node, 'decorator');
    if (decorators.length > 0) {
      funcInfo.decorators = decorators.map(d => d.text);
    }

    // Visibility (for methods)
    if (node.type === 'method_definition') {
      funcInfo.visibility = this.getVisibility(node);
    }

    return [funcInfo];
  }
  
  /**
   * Class 추출
   */
  private extractClass(node: Parser.SyntaxNode, content: string): ClassInfo[] {
    const nameNode = node.childForFieldName('name');
    if (!nameNode) return [];

    const classInfo: ClassInfo = {
      name: nameNode.text,
      location: this.nodeToLocation(node),
      isExported: this.isExported(node),
      isAbstract: node.text.includes('abstract'),
      methods: [],
      properties: []
    };

    // Heritage (extends/implements)
    const heritage = node.childForFieldName('heritage');
    if (heritage) {
      const extendsClause = this.findNodesByType(heritage, 'extends_clause')[0];
      if (extendsClause) {
        const superClass = extendsClause.childForFieldName('value');
        if (superClass) {
          classInfo.extends = superClass.text;
        }
      }

      const implementsClauses = this.findNodesByType(heritage, 'implements_clause');
      if (implementsClauses.length > 0) {
        classInfo.implements = implementsClauses.map(clause => {
          const types = this.findNodesByType(clause, 'type_identifier');
          return types.map(t => t.text).join(', ');
        }).filter(s => s.length > 0);
      }
    }

    // Class body
    const body = node.childForFieldName('body');
    if (body) {
      // Methods
      const methodNodes = this.findNodesByType(body, 'method_definition');
      for (const methodNode of methodNodes) {
        classInfo.methods.push(...this.extractFunction(methodNode, content));
      }

      // Properties
      const propertyNodes = [
        ...this.findNodesByType(body, 'public_field_definition'),
        ...this.findNodesByType(body, 'private_field_definition')
      ];
      
      for (const propNode of propertyNodes) {
        const property = this.extractProperty(propNode);
        if (property) {
          classInfo.properties.push(property);
        }
      }
    }

    // Decorators
    const decorators = this.findNodesByType(node.parent || node, 'decorator');
    if (decorators.length > 0) {
      classInfo.decorators = decorators.map(d => d.text);
    }

    return [classInfo];
  }
  
  /**
   * Variable 추출
   */
  private extractVariable(node: Parser.SyntaxNode, content: string): VariableInfo[] {
    const variables: VariableInfo[] = [];
    const declarations = this.findNodesByType(node, 'variable_declarator');
    
    const kind = this.getVariableKind(node);
    const isExported = this.isExported(node);
    
    for (const decl of declarations) {
      const nameNode = decl.childForFieldName('name');
      if (!nameNode) continue;

      const variable: VariableInfo = {
        name: nameNode.text,
        kind,
        isExported,
        location: this.nodeToLocation(decl)
      };

      // Type annotation (TypeScript)
      const typeNode = decl.childForFieldName('type');
      if (typeNode) {
        variable.type = typeNode.text;
      }

      // Default value
      const value = decl.childForFieldName('value');
      if (value) {
        variable.defaultValue = value.text;
      }

      variables.push(variable);
    }
    
    return variables;
  }
  
  /**
   * Comment 추출
   */
  private extractComment(node: Parser.SyntaxNode, content: string): CommentInfo[] {
    const text = node.text;
    let type: CommentInfo['type'] = 'line';
    let cleanContent = text;

    if (text.startsWith('//')) {
      type = 'line';
      cleanContent = text.substring(2).trim();
    } else if (text.startsWith('/*')) {
      type = text.startsWith('/**') ? 'jsdoc' : 'block';
      cleanContent = text.substring(2, text.length - 2).trim();
    }

    const comment: CommentInfo = {
      type,
      content: cleanContent,
      location: this.nodeToLocation(node)
    };

    // JSDoc tags 추출
    if (type === 'jsdoc') {
      const tags: { [key: string]: string } = {};
      const tagPattern = /@(\w+)\s*(.*)$/gm;
      let match;
      
      while ((match = tagPattern.exec(cleanContent)) !== null) {
        tags[match[1]] = match[2].trim();
      }
      
      if (Object.keys(tags).length > 0) {
        comment.tags = tags;
      }
    }

    return [comment];
  }
  
  /**
   * Property 추출
   */
  private extractProperty(node: Parser.SyntaxNode): PropertyInfo | null {
    const nameNode = node.childForFieldName('property');
    if (!nameNode) return null;

    const property: PropertyInfo = {
      name: nameNode.text,
      isStatic: node.text.includes('static'),
      isReadonly: node.text.includes('readonly'),
      visibility: this.getVisibility(node)
    };

    // Type annotation
    const typeNode = node.childForFieldName('type');
    if (typeNode) {
      property.type = typeNode.text;
    }

    // Default value
    const value = node.childForFieldName('value');
    if (value) {
      property.defaultValue = value.text;
    }

    // Decorators
    const decorators = this.findNodesByType(node.parent || node, 'decorator');
    if (decorators.length > 0) {
      property.decorators = decorators.map(d => d.text);
    }

    return property;
  }
  
  /**
   * Parameters 추출
   */
  private extractParameters(node: Parser.SyntaxNode): ParameterInfo[] {
    const params: ParameterInfo[] = [];
    const parametersNode = node.childForFieldName('parameters');
    if (!parametersNode) return params;

    const paramNodes = [
      ...this.findNodesByType(parametersNode, 'required_parameter'),
      ...this.findNodesByType(parametersNode, 'optional_parameter'),
      ...this.findNodesByType(parametersNode, 'rest_parameter')
    ];

    for (const paramNode of paramNodes) {
      const nameNode = paramNode.childForFieldName('pattern') || paramNode.childForFieldName('name');
      if (!nameNode) continue;

      const param: ParameterInfo = {
        name: nameNode.text,
        isOptional: paramNode.type === 'optional_parameter',
        isRest: paramNode.type === 'rest_parameter',
        defaultValue: undefined
      };

      // Type annotation
      const typeNode = paramNode.childForFieldName('type');
      if (typeNode) {
        param.type = typeNode.text;
      }

      // Default value
      const valueNode = paramNode.childForFieldName('value');
      if (valueNode) {
        param.defaultValue = valueNode.text;
      }

      params.push(param);
    }

    return params;
  }
  
  /**
   * 헬퍼 메서드들
   */
  private getFunctionType(node: Parser.SyntaxNode): FunctionInfo['type'] {
    if (node.type === 'arrow_function') return 'arrow';
    if (node.type === 'method_definition') {
      const kind = node.childForFieldName('kind');
      if (kind) {
        switch (kind.text) {
          case 'constructor': return 'constructor';
          case 'get': return 'getter';
          case 'set': return 'setter';
          default: return 'method';
        }
      }
      return 'method';
    }
    return 'function';
  }
  
  private getVariableKind(node: Parser.SyntaxNode): VariableInfo['kind'] {
    if (node.type === 'lexical_declaration') {
      return node.text.startsWith('const') ? 'const' : 'let';
    }
    if (node.type === 'variable_declaration') {
      return 'var';
    }
    return 'global';
  }
  
  private isExported(node: Parser.SyntaxNode): boolean {
    let current: Parser.SyntaxNode | null = node;
    while (current && current.parent) {
      if (current.parent.type.includes('export')) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }
  
  private getVisibility(node: Parser.SyntaxNode): 'public' | 'private' | 'protected' | undefined {
    if (node.text.includes('private')) return 'private';
    if (node.text.includes('protected')) return 'protected';
    if (node.text.includes('public')) return 'public';
    return undefined;
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

export class JavaScriptParser extends TypeScriptParser {
  readonly language = 'javascript';
  readonly extensions = ['.js', '.jsx', '.mjs', '.cjs'];
  readonly parserVersion = '0.21.4';
  
  constructor() {
    super();
    // JavaScript 파서로 재설정
    this.parser.setLanguage(JavaScript);
  }
}