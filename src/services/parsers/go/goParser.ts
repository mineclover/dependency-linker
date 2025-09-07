/**
 * Go Tree-sitter 파서
 * Go Tree-sitter Parser
 */

import Parser from 'tree-sitter';
import Go from 'tree-sitter-go';
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

export class GoParser extends BaseLanguageParser {
  readonly language = 'go';
  readonly extensions = ['.go'];
  readonly parserVersion = '0.21.0';
  
  constructor() {
    super(Go);
  }
  
  protected processNode(node: Parser.SyntaxNode, content: string, result: LanguageAnalysisResult): void {
    switch (node.type) {
      case 'import_spec':
      case 'import_declaration':
        result.dependencies.push(...this.extractImportStatement(node, content));
        break;
        
      case 'function_declaration':
      case 'method_declaration':
        result.functions.push(...this.extractFunction(node, content));
        break;
        
      case 'type_declaration':
        // Go의 struct는 class와 유사
        const structs = this.extractStruct(node, content);
        result.classes.push(...structs);
        break;
        
      case 'var_declaration':
      case 'const_declaration':
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
    
    // Import declarations
    const importNodes = [
      ...this.findNodesByType(node, 'import_declaration'),
      ...this.findNodesByType(node, 'import_spec')
    ];
    
    for (const importNode of importNodes) {
      dependencies.push(...this.extractImportStatement(importNode, content));
    }
    
    return dependencies;
  }
  
  extractFunctions(node: Parser.SyntaxNode, content: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    const functionNodes = [
      ...this.findNodesByType(node, 'function_declaration'),
      ...this.findNodesByType(node, 'method_declaration')
    ];
    
    for (const funcNode of functionNodes) {
      functions.push(...this.extractFunction(funcNode, content));
    }
    
    return functions;
  }
  
  extractClasses(node: Parser.SyntaxNode, content: string): ClassInfo[] {
    const classes: ClassInfo[] = [];
    const typeNodes = this.findNodesByType(node, 'type_declaration');
    
    for (const typeNode of typeNodes) {
      classes.push(...this.extractStruct(typeNode, content));
    }
    
    return classes;
  }
  
  extractVariables(node: Parser.SyntaxNode, content: string): VariableInfo[] {
    const variables: VariableInfo[] = [];
    const varNodes = [
      ...this.findNodesByType(node, 'var_declaration'),
      ...this.findNodesByType(node, 'const_declaration')
    ];
    
    for (const varNode of varNodes) {
      variables.push(...this.extractVariable(varNode, content));
    }
    
    return variables;
  }
  
  extractExports(node: Parser.SyntaxNode, content: string): ExportInfo[] {
    // Go에서는 대문자로 시작하는 식별자가 exported
    const exports: ExportInfo[] = [];
    
    // Exported functions
    const functions = this.extractFunctions(node, content);
    for (const func of functions) {
      if (this.isExportedName(func.name)) {
        exports.push({
          name: func.name,
          type: 'named',
          location: func.location
        });
      }
    }
    
    // Exported types
    const classes = this.extractClasses(node, content);
    for (const cls of classes) {
      if (this.isExportedName(cls.name)) {
        exports.push({
          name: cls.name,
          type: 'named',
          location: cls.location
        });
      }
    }
    
    // Exported variables
    const variables = this.extractVariables(node, content);
    for (const variable of variables) {
      if (this.isExportedName(variable.name)) {
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
    
    if (node.type === 'import_declaration') {
      // import ("package1" "package2")
      const importSpecs = this.findNodesByType(node, 'import_spec');
      for (const spec of importSpecs) {
        dependencies.push(...this.extractImportSpec(spec, content));
      }
    } else if (node.type === 'import_spec') {
      // import "package"
      dependencies.push(...this.extractImportSpec(node, content));
    }
    
    return dependencies;
  }
  
  private extractImportSpec(node: Parser.SyntaxNode, content: string): DependencyInfo[] {
    const pathNode = node.childForFieldName('path');
    if (!pathNode) return [];
    
    const source = pathNode.text.replace(/"/g, '');
    const dependency: DependencyInfo = {
      source,
      type: 'import_package',
      location: this.nodeToLocation(node),
      isLocal: this.isLocalPackage(source),
      isDynamic: false,
      metadata: {
        importType: 'namespace'
      }
    };
    
    // Alias (import alias "package")
    const nameNode = node.childForFieldName('name');
    if (nameNode) {
      dependency.metadata!.alias = nameNode.text;
    }
    
    return [dependency];
  }
  
  /**
   * Function/Method 추출
   */
  private extractFunction(node: Parser.SyntaxNode, content: string): FunctionInfo[] {
    const nameNode = node.childForFieldName('name');
    if (!nameNode) return [];
    
    const name = nameNode.text;
    const params = this.extractParameters(node);
    
    const funcInfo: FunctionInfo = {
      name,
      type: node.type === 'method_declaration' ? 'method' : 'function',
      params,
      location: this.nodeToLocation(node),
      isAsync: false, // Go doesn't have async/await
      isGenerator: false,
      isExported: this.isExportedName(name),
      visibility: this.isExportedName(name) ? 'public' : 'private'
    };
    
    // Return type
    const result = node.childForFieldName('result');
    if (result) {
      funcInfo.returnType = result.text;
    }
    
    // Receiver (for methods)
    if (node.type === 'method_declaration') {
      const receiver = node.childForFieldName('receiver');
      if (receiver) {
        funcInfo.type = 'method';
        // Add receiver info to metadata if needed
      }
    }
    
    return [funcInfo];
  }
  
  /**
   * Struct 추출 (Go의 class 개념)
   */
  private extractStruct(node: Parser.SyntaxNode, content: string): ClassInfo[] {
    const structs: ClassInfo[] = [];
    const typeSpecs = this.findNodesByType(node, 'type_spec');
    
    for (const typeSpec of typeSpecs) {
      const nameNode = typeSpec.childForFieldName('name');
      const typeNode = typeSpec.childForFieldName('type');
      
      if (!nameNode || !typeNode || typeNode.type !== 'struct_type') continue;
      
      const structInfo: ClassInfo = {
        name: nameNode.text,
        location: this.nodeToLocation(typeSpec),
        isExported: this.isExportedName(nameNode.text),
        isAbstract: false,
        methods: [],
        properties: []
      };
      
      // Struct fields
      const fieldList = typeNode.childForFieldName('fields');
      if (fieldList) {
        const fields = this.findNodesByType(fieldList, 'field_declaration');
        for (const field of fields) {
          const property = this.extractStructField(field);
          if (property) {
            structInfo.properties.push(property);
          }
        }
      }
      
      structs.push(structInfo);
    }
    
    return structs;
  }
  
  /**
   * Variable/Constant 추출
   */
  private extractVariable(node: Parser.SyntaxNode, content: string): VariableInfo[] {
    const variables: VariableInfo[] = [];
    const kind = node.type === 'const_declaration' ? 'const' : 'var';
    
    const varSpecs = this.findNodesByType(node, 'var_spec');
    const constSpecs = this.findNodesByType(node, 'const_spec');
    const specs = [...varSpecs, ...constSpecs];
    
    for (const spec of specs) {
      const nameNodes = this.findNodesByType(spec, 'identifier');
      const typeNode = spec.childForFieldName('type');
      const valueNodes = this.findNodesByType(spec, 'expression');
      
      for (let i = 0; i < nameNodes.length; i++) {
        const nameNode = nameNodes[i];
        const variable: VariableInfo = {
          name: nameNode.text,
          kind,
          isExported: this.isExportedName(nameNode.text),
          location: this.nodeToLocation(nameNode)
        };
        
        if (typeNode) {
          variable.type = typeNode.text;
        }
        
        if (valueNodes[i]) {
          variable.defaultValue = valueNodes[i].text;
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
      type = 'line';
      cleanContent = text.substring(2).trim();
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
    
    const paramDecls = this.findNodesByType(parametersNode, 'parameter_declaration');
    
    for (const paramDecl of paramDecls) {
      const names = this.findNodesByType(paramDecl, 'identifier');
      const typeNode = paramDecl.childForFieldName('type');
      
      for (const nameNode of names) {
        const param: ParameterInfo = {
          name: nameNode.text,
          type: typeNode?.text,
          isOptional: false, // Go doesn't have optional parameters
          isRest: typeNode?.text.startsWith('...') || false
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
    const nameNodes = this.findNodesByType(node, 'field_identifier');
    const typeNode = node.childForFieldName('type');
    
    if (nameNodes.length === 0 || !typeNode) return null;
    
    // Go structs can have multiple fields with the same type
    // For simplicity, we'll take the first one
    const nameNode = nameNodes[0];
    
    return {
      name: nameNode.text,
      type: typeNode.text,
      visibility: this.isExportedName(nameNode.text) ? 'public' : 'private',
      isStatic: false,
      isReadonly: false
    };
  }
  
  /**
   * 헬퍼 메서드들
   */
  private isExportedName(name: string): boolean {
    return name.length > 0 && name[0] >= 'A' && name[0] <= 'Z';
  }
  
  private isLocalPackage(packagePath: string): boolean {
    // Go module paths starting with local domain or relative paths
    return !packagePath.includes('.') || packagePath.startsWith('./') || packagePath.startsWith('../');
  }
  
  protected getComplexityKeywords(): string[] {
    return ['if', 'else', 'for', 'switch', 'case', 'default', 'select', 'defer', 'go'];
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