/**
 * Rust Tree-sitter 파서
 * Rust Tree-sitter Parser
 */

import Parser from 'tree-sitter';
import Rust from 'tree-sitter-rust';
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

export class RustParser extends BaseLanguageParser {
  readonly language = 'rust';
  readonly extensions = ['.rs'];
  readonly parserVersion = '0.21.0';
  
  constructor() {
    super(Rust);
  }
  
  protected processNode(node: Parser.SyntaxNode, content: string, result: LanguageAnalysisResult): void {
    switch (node.type) {
      case 'use_declaration':
        result.dependencies.push(...this.extractUseStatement(node, content));
        break;
        
      case 'function_item':
        result.functions.push(...this.extractFunction(node, content));
        break;
        
      case 'struct_item':
      case 'enum_item':
      case 'trait_item':
      case 'impl_item':
        result.classes.push(...this.extractStruct(node, content));
        break;
        
      case 'let_declaration':
      case 'const_item':
      case 'static_item':
        result.variables.push(...this.extractVariable(node, content));
        break;
        
      case 'line_comment':
      case 'block_comment':
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
    
    // Use declarations
    const useNodes = this.findNodesByType(node, 'use_declaration');
    for (const useNode of useNodes) {
      dependencies.push(...this.extractUseStatement(useNode, content));
    }
    
    return dependencies;
  }
  
  extractFunctions(node: Parser.SyntaxNode, content: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    const functionNodes = this.findNodesByType(node, 'function_item');
    
    for (const funcNode of functionNodes) {
      functions.push(...this.extractFunction(funcNode, content));
    }
    
    return functions;
  }
  
  extractClasses(node: Parser.SyntaxNode, content: string): ClassInfo[] {
    const classes: ClassInfo[] = [];
    const typeNodes = [
      ...this.findNodesByType(node, 'struct_item'),
      ...this.findNodesByType(node, 'enum_item'),
      ...this.findNodesByType(node, 'trait_item'),
      ...this.findNodesByType(node, 'impl_item')
    ];
    
    for (const typeNode of typeNodes) {
      classes.push(...this.extractStruct(typeNode, content));
    }
    
    return classes;
  }
  
  extractVariables(node: Parser.SyntaxNode, content: string): VariableInfo[] {
    const variables: VariableInfo[] = [];
    const varNodes = [
      ...this.findNodesByType(node, 'let_declaration'),
      ...this.findNodesByType(node, 'const_item'),
      ...this.findNodesByType(node, 'static_item')
    ];
    
    for (const varNode of varNodes) {
      variables.push(...this.extractVariable(varNode, content));
    }
    
    return variables;
  }
  
  extractExports(node: Parser.SyntaxNode, content: string): ExportInfo[] {
    // Rust에서는 pub 키워드로 export 정의
    const exports: ExportInfo[] = [];
    
    // Public functions
    const functions = this.extractFunctions(node, content);
    for (const func of functions) {
      if (func.visibility === 'public') {
        exports.push({
          name: func.name,
          type: 'named',
          location: func.location
        });
      }
    }
    
    // Public types
    const classes = this.extractClasses(node, content);
    for (const cls of classes) {
      if (cls.visibility === 'public') {
        exports.push({
          name: cls.name,
          type: 'named',
          location: cls.location
        });
      }
    }
    
    // Public variables
    const variables = this.extractVariables(node, content);
    for (const variable of variables) {
      if (variable.isExported) {
        exports.push({
          name: variable.name,
          type: 'named',
          location: variable.location
        });
      }
    }
    
    return exports;
  }
  
  extractComments(node: Parser.SyntaxNode, content: string): CommentInfo[] {
    const comments: CommentInfo[] = [];
    const commentNodes = [
      ...this.findNodesByType(node, 'line_comment'),
      ...this.findNodesByType(node, 'block_comment')
    ];
    
    for (const commentNode of commentNodes) {
      comments.push(...this.extractComment(commentNode, content));
    }
    
    return comments;
  }
  
  /**
   * Use statement 추출
   */
  private extractUseStatement(node: Parser.SyntaxNode, content: string): DependencyInfo[] {
    const dependencies: DependencyInfo[] = [];
    const argument = node.childForFieldName('argument');
    if (!argument) return dependencies;
    
    const dependency: DependencyInfo = {
      source: this.extractUsePath(argument),
      type: 'use',
      location: this.nodeToLocation(node),
      isLocal: this.isLocalCrate(argument.text),
      isDynamic: false,
      metadata: {
        importType: 'namespace'
      }
    };
    
    // Use tree analysis
    if (argument.type === 'use_list') {
      // use std::{io, fs};
      const items = this.findNodesByType(argument, 'identifier');
      dependency.metadata!.members = items.map(item => item.text);
      dependency.metadata!.importType = 'named';
    } else if (argument.type === 'use_as_clause') {
      // use std::io as stdio;
      const alias = argument.childForFieldName('alias');
      if (alias) {
        dependency.metadata!.alias = alias.text;
      }
    } else if (argument.type === 'use_wildcard') {
      // use std::prelude::*;
      dependency.metadata!.isNamespace = true;
      dependency.metadata!.importType = 'namespace';
    }
    
    dependencies.push(dependency);
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
      type: 'function',
      params,
      location: this.nodeToLocation(node),
      isAsync: node.text.includes('async'),
      isGenerator: false, // Rust doesn't have generators like JS/Python
      isExported: this.hasPublicVisibility(node),
      visibility: this.getVisibility(node)
    };
    
    // Return type
    const returnType = node.childForFieldName('return_type');
    if (returnType) {
      funcInfo.returnType = returnType.text;
    }
    
    // Attributes (like decorators)
    const attributes = this.extractAttributes(node);
    if (attributes.length > 0) {
      funcInfo.decorators = attributes;
    }
    
    return [funcInfo];
  }
  
  /**
   * Struct/Enum/Trait/Impl 추출
   */
  private extractStruct(node: Parser.SyntaxNode, content: string): ClassInfo[] {
    const nameNode = node.childForFieldName('name');
    if (!nameNode) return [];
    
    const structInfo: ClassInfo = {
      name: nameNode.text,
      location: this.nodeToLocation(node),
      isExported: this.hasPublicVisibility(node),
      isAbstract: node.type === 'trait_item',
      methods: [],
      properties: [],
      visibility: this.getVisibility(node)
    };
    
    // Struct fields or enum variants
    if (node.type === 'struct_item') {
      const body = node.childForFieldName('body');
      if (body && body.type === 'field_declaration_list') {
        const fields = this.findNodesByType(body, 'field_declaration');
        for (const field of fields) {
          const property = this.extractStructField(field);
          if (property) {
            structInfo.properties.push(property);
          }
        }
      }
    } else if (node.type === 'impl_item') {
      // Implementation methods
      const body = node.childForFieldName('body');
      if (body) {
        const functions = this.findNodesByType(body, 'function_item');
        for (const func of functions) {
          const methods = this.extractFunction(func, content);
          for (const method of methods) {
            method.type = 'method';
          }
          structInfo.methods.push(...methods);
        }
      }
      
      // Get the type being implemented
      const type = node.childForFieldName('type');
      if (type) {
        structInfo.name = type.text;
      }
    }
    
    // Traits (implements)
    if (node.type === 'trait_item') {
      // Trait methods
      const body = node.childForFieldName('body');
      if (body) {
        const functions = this.findNodesByType(body, 'function_item');
        for (const func of functions) {
          const methods = this.extractFunction(func, content);
          for (const method of methods) {
            method.type = 'method';
          }
          structInfo.methods.push(...methods);
        }
      }
    }
    
    // Attributes
    const attributes = this.extractAttributes(node);
    if (attributes.length > 0) {
      structInfo.decorators = attributes;
    }
    
    return [structInfo];
  }
  
  /**
   * Variable/Constant 추출
   */
  private extractVariable(node: Parser.SyntaxNode, content: string): VariableInfo[] {
    const variables: VariableInfo[] = [];
    
    if (node.type === 'let_declaration') {
      const pattern = node.childForFieldName('pattern');
      if (pattern && pattern.type === 'identifier') {
        const variable: VariableInfo = {
          name: pattern.text,
          kind: node.text.includes('mut') ? 'let' : 'const',
          isExported: false, // let declarations are always local
          location: this.nodeToLocation(node)
        };
        
        const type = node.childForFieldName('type');
        if (type) {
          variable.type = type.text;
        }
        
        const value = node.childForFieldName('value');
        if (value) {
          variable.defaultValue = value.text;
        }
        
        variables.push(variable);
      }
    } else if (node.type === 'const_item' || node.type === 'static_item') {
      const nameNode = node.childForFieldName('name');
      if (nameNode) {
        const variable: VariableInfo = {
          name: nameNode.text,
          kind: node.type === 'const_item' ? 'const' : 'static',
          isExported: this.hasPublicVisibility(node),
          location: this.nodeToLocation(node)
        };
        
        const type = node.childForFieldName('type');
        if (type) {
          variable.type = type.text;
        }
        
        const value = node.childForFieldName('value');
        if (value) {
          variable.defaultValue = value.text;
        }
        
        variables.push(variable);
      }
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
      type = text.startsWith('///') ? 'docstring' : 'line';
      cleanContent = text.substring(text.startsWith('///') ? 3 : 2).trim();
    } else if (text.startsWith('/*')) {
      type = 'block';
      cleanContent = text.substring(2, text.length - 2).trim();
    }
    
    return [{
      type,
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
    
    const paramNodes = this.findNodesByType(parametersNode, 'parameter');
    
    for (const paramNode of paramNodes) {
      const pattern = paramNode.childForFieldName('pattern');
      const typeNode = paramNode.childForFieldName('type');
      
      if (pattern && pattern.type === 'identifier') {
        const param: ParameterInfo = {
          name: pattern.text,
          type: typeNode?.text,
          isOptional: false, // Rust doesn't have optional parameters
          isRest: false
        };
        
        params.push(param);
      }
    }
    
    return params;
  }
  
  /**
   * Struct field 추출
   */
  private extractStructField(node: Parser.SyntaxNode): PropertyInfo | null {
    const nameNode = node.childForFieldName('name');
    const typeNode = node.childForFieldName('type');
    
    if (!nameNode || !typeNode) return null;
    
    return {
      name: nameNode.text,
      type: typeNode.text,
      visibility: this.getVisibility(node),
      isStatic: false,
      isReadonly: false
    };
  }
  
  /**
   * Attributes 추출
   */
  private extractAttributes(node: Parser.SyntaxNode): string[] {
    const attributes: string[] = [];
    let current = node.previousSibling;
    
    while (current && current.type === 'attribute_item') {
      attributes.unshift(current.text);
      current = current.previousSibling;
    }
    
    return attributes;
  }
  
  /**
   * Use path 추출
   */
  private extractUsePath(node: Parser.SyntaxNode): string {
    if (node.type === 'scoped_identifier') {
      const path = node.childForFieldName('path');
      const name = node.childForFieldName('name');
      return path && name ? `${path.text}::${name.text}` : node.text;
    }
    return node.text;
  }
  
  /**
   * 헬퍼 메서드들
   */
  private hasPublicVisibility(node: Parser.SyntaxNode): boolean {
    const visibility = node.childForFieldName('visibility_modifier');
    return visibility?.text === 'pub' || false;
  }
  
  private getVisibility(node: Parser.SyntaxNode): 'public' | 'private' | 'protected' | undefined {
    const visibility = node.childForFieldName('visibility_modifier');
    if (visibility?.text === 'pub') return 'public';
    return 'private';
  }
  
  private isLocalCrate(usePath: string): boolean {
    return usePath.startsWith('crate::') || usePath.startsWith('super::') || usePath.startsWith('self::');
  }
  
  protected getComplexityKeywords(): string[] {
    return ['if', 'else', 'match', 'for', 'while', 'loop', 'if let', 'while let', 'catch'];
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