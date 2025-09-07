/**
 * Python Tree-sitter 파서
 * Python Tree-sitter Parser
 */

import Parser from 'tree-sitter';
import Python from 'tree-sitter-python';
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

export class PythonParser extends BaseLanguageParser {
  readonly language = 'python';
  readonly extensions = ['.py', '.pyw', '.pyi'];
  readonly parserVersion = '0.21.0';
  
  constructor() {
    super(Python);
  }
  
  protected processNode(node: Parser.SyntaxNode, content: string, result: LanguageAnalysisResult): void {
    switch (node.type) {
      case 'import_statement':
      case 'import_from_statement':
        result.dependencies.push(...this.extractImportStatement(node, content));
        break;
        
      case 'function_definition':
        result.functions.push(...this.extractFunction(node, content));
        break;
        
      case 'class_definition':
        result.classes.push(...this.extractClass(node, content));
        break;
        
      case 'assignment':
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
    const importNodes = [
      ...this.findNodesByType(node, 'import_statement'),
      ...this.findNodesByType(node, 'import_from_statement')
    ];
    
    for (const importNode of importNodes) {
      dependencies.push(...this.extractImportStatement(importNode, content));
    }
    
    return dependencies;
  }
  
  extractFunctions(node: Parser.SyntaxNode, content: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    const functionNodes = this.findNodesByType(node, 'function_definition');
    
    for (const funcNode of functionNodes) {
      functions.push(...this.extractFunction(funcNode, content));
    }
    
    return functions;
  }
  
  extractClasses(node: Parser.SyntaxNode, content: string): ClassInfo[] {
    const classes: ClassInfo[] = [];
    const classNodes = this.findNodesByType(node, 'class_definition');
    
    for (const classNode of classNodes) {
      classes.push(...this.extractClass(classNode, content));
    }
    
    return classes;
  }
  
  extractVariables(node: Parser.SyntaxNode, content: string): VariableInfo[] {
    const variables: VariableInfo[] = [];
    const assignmentNodes = this.findNodesByType(node, 'assignment');
    
    for (const assignNode of assignmentNodes) {
      variables.push(...this.extractVariable(assignNode, content));
    }
    
    return variables;
  }
  
  extractExports(node: Parser.SyntaxNode, content: string): ExportInfo[] {
    // Python은 __all__ 변수를 통해 export를 정의
    const exports: ExportInfo[] = [];
    const assignments = this.findNodesByType(node, 'assignment');
    
    for (const assignment of assignments) {
      const target = assignment.childForFieldName('left');
      if (target && target.text === '__all__') {
        const value = assignment.childForFieldName('right');
        if (value && value.type === 'list') {
          const listElements = this.findNodesByType(value, 'string');
          for (const element of listElements) {
            const name = element.text.replace(/['"]/g, '');
            exports.push({
              name,
              type: 'named',
              location: this.nodeToLocation(element)
            });
          }
        }
      }
    }
    
    // 모든 top-level 함수와 클래스는 기본적으로 export됨
    const topLevelFunctions = this.findNodesByType(node, 'function_definition')
      .filter(func => this.isTopLevel(func));
    const topLevelClasses = this.findNodesByType(node, 'class_definition')
      .filter(cls => this.isTopLevel(cls));
    
    for (const func of topLevelFunctions) {
      const nameNode = func.childForFieldName('name');
      if (nameNode && !nameNode.text.startsWith('_')) {
        exports.push({
          name: nameNode.text,
          type: 'named',
          location: this.nodeToLocation(func)
        });
      }
    }
    
    for (const cls of topLevelClasses) {
      const nameNode = cls.childForFieldName('name');
      if (nameNode && !nameNode.text.startsWith('_')) {
        exports.push({
          name: nameNode.text,
          type: 'named',
          location: this.nodeToLocation(cls)
        });
      }
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
    const dependencies: DependencyInfo[] = [];
    
    if (node.type === 'import_statement') {
      // import module1, module2
      const names = this.findNodesByType(node, 'dotted_name');
      for (const nameNode of names) {
        dependencies.push({
          source: nameNode.text,
          type: 'import',
          location: this.nodeToLocation(node),
          isLocal: this.isLocalImport(nameNode.text),
          isDynamic: false,
          metadata: {
            importType: 'namespace'
          }
        });
      }
      
      // import module as alias
      const aliasedImports = this.findNodesByType(node, 'aliased_import');
      for (const aliasNode of aliasedImports) {
        const name = aliasNode.childForFieldName('name');
        const alias = aliasNode.childForFieldName('alias');
        if (name) {
          dependencies.push({
            source: name.text,
            type: 'import',
            location: this.nodeToLocation(node),
            isLocal: this.isLocalImport(name.text),
            isDynamic: false,
            metadata: {
              importType: 'namespace',
              alias: alias?.text
            }
          });
        }
      }
      
    } else if (node.type === 'import_from_statement') {
      // from module import name1, name2
      const moduleNode = node.childForFieldName('module_name');
      if (!moduleNode) return dependencies;
      
      const moduleName = moduleNode.text;
      const names = node.childForFieldName('name');
      
      if (names) {
        if (names.type === 'wildcard_import') {
          // from module import *
          dependencies.push({
            source: moduleName,
            type: 'from_import',
            location: this.nodeToLocation(node),
            isLocal: this.isLocalImport(moduleName),
            isDynamic: false,
            metadata: {
              importType: 'namespace',
              isNamespace: true
            }
          });
        } else {
          // from module import name1, name2
          const importSpecifiers = [
            ...this.findNodesByType(names, 'identifier'),
            ...this.findNodesByType(names, 'aliased_import')
          ];
          
          const members: string[] = [];
          
          for (const spec of importSpecifiers) {
            if (spec.type === 'identifier') {
              members.push(spec.text);
            } else if (spec.type === 'aliased_import') {
              const name = spec.childForFieldName('name');
              const alias = spec.childForFieldName('alias');
              members.push(alias ? `${name?.text} as ${alias.text}` : name?.text || '');
            }
          }
          
          dependencies.push({
            source: moduleName,
            type: 'from_import',
            location: this.nodeToLocation(node),
            isLocal: this.isLocalImport(moduleName),
            isDynamic: false,
            metadata: {
              importType: 'named',
              members
            }
          });
        }
      }
    }
    
    return dependencies;
  }
  
  /**
   * Function 추출
   */
  private extractFunction(node: Parser.SyntaxNode, content: string): FunctionInfo[] {
    const nameNode = node.childForFieldName('name');
    if (!nameNode) return [];
    
    const name = nameNode.text;
    const params = this.extractParameters(node);
    
    const funcInfo: FunctionInfo = {
      name,
      type: this.getFunctionType(node),
      params,
      location: this.nodeToLocation(node),
      isAsync: node.text.includes('async'),
      isGenerator: false, // Python uses yield, not generator syntax
      isExported: this.isTopLevel(node) && !name.startsWith('_')
    };
    
    // Return type annotation
    const returnType = node.childForFieldName('return_type');
    if (returnType) {
      funcInfo.returnType = returnType.text;
    }
    
    // Decorators
    const decorators = this.extractDecorators(node);
    if (decorators.length > 0) {
      funcInfo.decorators = decorators;
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
      isExported: this.isTopLevel(node) && !nameNode.text.startsWith('_'),
      isAbstract: false, // Python doesn't have native abstract classes
      methods: [],
      properties: []
    };
    
    // Superclasses (inheritance)
    const superclasses = node.childForFieldName('superclasses');
    if (superclasses) {
      const baseClasses = this.findNodesByType(superclasses, 'identifier');
      if (baseClasses.length > 0) {
        classInfo.extends = baseClasses[0].text;
        if (baseClasses.length > 1) {
          classInfo.implements = baseClasses.slice(1).map(c => c.text);
        }
      }
    }
    
    // Class body
    const body = node.childForFieldName('body');
    if (body) {
      // Methods
      const methodNodes = this.findNodesByType(body, 'function_definition');
      for (const methodNode of methodNodes) {
        const methods = this.extractFunction(methodNode, content);
        for (const method of methods) {
          method.type = this.getMethodType(method.name);
        }
        classInfo.methods.push(...methods);
      }
      
      // Properties (assignments in class body)
      const assignmentNodes = this.findNodesByType(body, 'assignment');
      for (const assignment of assignmentNodes) {
        const property = this.extractClassProperty(assignment);
        if (property) {
          classInfo.properties.push(property);
        }
      }
    }
    
    // Decorators
    const decorators = this.extractDecorators(node);
    if (decorators.length > 0) {
      classInfo.decorators = decorators;
    }
    
    return [classInfo];
  }
  
  /**
   * Variable 추출
   */
  private extractVariable(node: Parser.SyntaxNode, content: string): VariableInfo[] {
    const variables: VariableInfo[] = [];
    const leftNode = node.childForFieldName('left');
    const rightNode = node.childForFieldName('right');
    
    if (!leftNode) return variables;
    
    // Simple assignment: name = value
    if (leftNode.type === 'identifier') {
      const variable: VariableInfo = {
        name: leftNode.text,
        kind: 'global',
        isExported: this.isTopLevel(node) && !leftNode.text.startsWith('_'),
        location: this.nodeToLocation(node)
      };
      
      if (rightNode) {
        variable.defaultValue = rightNode.text;
      }
      
      // Type annotation
      const typeNode = node.childForFieldName('type');
      if (typeNode) {
        variable.type = typeNode.text;
      }
      
      variables.push(variable);
    }
    // Multiple assignment: a, b = values
    else if (leftNode.type === 'pattern_list') {
      const identifiers = this.findNodesByType(leftNode, 'identifier');
      for (const identifier of identifiers) {
        variables.push({
          name: identifier.text,
          kind: 'global',
          isExported: this.isTopLevel(node) && !identifier.text.startsWith('_'),
          location: this.nodeToLocation(identifier)
        });
      }
    }
    
    return variables;
  }
  
  /**
   * Comment 추출
   */
  private extractComment(node: Parser.SyntaxNode, content: string): CommentInfo[] {
    const text = node.text;
    const cleanContent = text.startsWith('#') ? text.substring(1).trim() : text.trim();
    
    return [{
      type: 'line',
      content: cleanContent,
      location: this.nodeToLocation(node)
    }];
  }
  
  /**
   * Parameters 추출
   */
  private extractParameters(node: Parser.SyntaxNode): ParameterInfo[] {
    const params: ParameterInfo[] = [];
    const parametersNode = node.childForFieldName('parameters');
    if (!parametersNode) return params;
    
    const paramNodes = [
      ...this.findNodesByType(parametersNode, 'identifier'),
      ...this.findNodesByType(parametersNode, 'default_parameter'),
      ...this.findNodesByType(parametersNode, 'typed_parameter'),
      ...this.findNodesByType(parametersNode, 'typed_default_parameter')
    ];
    
    for (const paramNode of paramNodes) {
      let name: string;
      let type: string | undefined;
      let defaultValue: string | undefined;
      let isOptional = false;
      
      if (paramNode.type === 'identifier') {
        name = paramNode.text;
      } else if (paramNode.type === 'default_parameter') {
        const nameNode = paramNode.childForFieldName('name');
        const valueNode = paramNode.childForFieldName('value');
        name = nameNode?.text || '';
        defaultValue = valueNode?.text;
        isOptional = true;
      } else if (paramNode.type === 'typed_parameter') {
        const nameNode = paramNode.childForFieldName('name');
        const typeNode = paramNode.childForFieldName('type');
        name = nameNode?.text || '';
        type = typeNode?.text;
      } else if (paramNode.type === 'typed_default_parameter') {
        const nameNode = paramNode.childForFieldName('name');
        const typeNode = paramNode.childForFieldName('type');
        const valueNode = paramNode.childForFieldName('value');
        name = nameNode?.text || '';
        type = typeNode?.text;
        defaultValue = valueNode?.text;
        isOptional = true;
      } else {
        continue;
      }
      
      params.push({
        name,
        type,
        isOptional,
        defaultValue,
        isRest: name.startsWith('*')
      });
    }
    
    return params;
  }
  
  /**
   * Class property 추출
   */
  private extractClassProperty(node: Parser.SyntaxNode): PropertyInfo | null {
    const leftNode = node.childForFieldName('left');
    if (!leftNode || leftNode.type !== 'identifier') return null;
    
    const property: PropertyInfo = {
      name: leftNode.text,
      isStatic: false, // Python doesn't have explicit static keyword
      isReadonly: false,
      visibility: leftNode.text.startsWith('_') ? 'private' : 'public'
    };
    
    const rightNode = node.childForFieldName('right');
    if (rightNode) {
      property.defaultValue = rightNode.text;
    }
    
    return property;
  }
  
  /**
   * Decorators 추출
   */
  private extractDecorators(node: Parser.SyntaxNode): string[] {
    const decorators: string[] = [];
    let current = node.previousSibling;
    
    while (current && current.type === 'decorator') {
      decorators.unshift(current.text);
      current = current.previousSibling;
    }
    
    return decorators;
  }
  
  /**
   * 헬퍼 메서드들
   */
  private getFunctionType(node: Parser.SyntaxNode): FunctionInfo['type'] {
    return 'function';
  }
  
  private getMethodType(name: string): FunctionInfo['type'] {
    if (name === '__init__') return 'constructor';
    if (name.startsWith('__') && name.endsWith('__')) return 'method';
    return 'method';
  }
  
  private isLocalImport(moduleName: string): boolean {
    return moduleName.startsWith('.') || moduleName.includes('/');
  }
  
  private isTopLevel(node: Parser.SyntaxNode): boolean {
    let current: Parser.SyntaxNode | null = node.parent;
    while (current) {
      if (current.type === 'function_definition' || current.type === 'class_definition') {
        return false;
      }
      current = current.parent;
    }
    return true;
  }
  
  protected getComplexityKeywords(): string[] {
    return ['if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'with', 'match', 'case'];
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