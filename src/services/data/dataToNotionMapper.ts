/**
 * Data to Notion Format Mapper
 * 수집된 데이터를 Notion 데이터베이스 형식으로 변환하는 매퍼
 */

import { CollectedData } from './dataCollectionEngine';
import { DependencyInfo, FunctionInfo, TodoItem, ClassInfo, InterfaceInfo } from './specializeddDataCollectors';

export interface NotionPropertyValue {
  type: 'title' | 'rich_text' | 'select' | 'multi_select' | 'date' | 'number' | 'checkbox' | 'url' | 'email' | 'phone_number' | 'relation';
  value: any;
}

export interface NotionPageData {
  properties: { [key: string]: NotionPropertyValue };
  children?: any[]; // 페이지 내용 블록들
}

export interface MappingRule {
  sourceField: string;
  targetProperty: string;
  transformation?: (value: any) => any;
  validation?: (value: any) => boolean;
  defaultValue?: any;
}

export class DataToNotionMapper {
  private mappingRules: Map<string, MappingRule[]> = new Map();

  constructor() {
    this.initializeDefaultMappings();
  }

  /**
   * 기본 매핑 규칙 초기화
   */
  private initializeDefaultMappings(): void {
    // Files 데이터베이스 매핑 규칙
    this.mappingRules.set('files', [
      {
        sourceField: 'fileName',
        targetProperty: 'Name',
        transformation: (value: string) => ({ type: 'title', value: [{ text: { content: value } }] })
      },
      {
        sourceField: 'filePath',
        targetProperty: 'File Path',
        transformation: (value: string) => ({ type: 'rich_text', value: [{ text: { content: value } }] })
      },
      {
        sourceField: 'extension',
        targetProperty: 'Extension',
        transformation: (value: string) => ({ type: 'select', value: { name: value } }),
        defaultValue: 'Other'
      },
      {
        sourceField: 'size',
        targetProperty: 'Size (bytes)',
        transformation: (value: number) => ({ type: 'number', value })
      },
      {
        sourceField: 'lastModified',
        targetProperty: 'Last Modified',
        transformation: (value: string) => ({ type: 'date', value: { start: value } })
      },
      {
        sourceField: 'status',
        targetProperty: 'Status',
        transformation: (value: string) => ({ type: 'select', value: { name: value } }),
        defaultValue: 'Uploaded'
      },
      {
        sourceField: 'project',
        targetProperty: 'Project',
        transformation: (value: string) => ({ type: 'select', value: { name: value } }),
        defaultValue: 'dependency-linker'
      }
    ]);

    // Docs 데이터베이스 매핑 규칙
    this.mappingRules.set('docs', [
      {
        sourceField: 'title',
        targetProperty: 'Name',
        transformation: (value: string) => ({ type: 'title', value: [{ text: { content: value } }] })
      },
      {
        sourceField: 'documentType',
        targetProperty: 'Document Type',
        transformation: (value: string) => ({ type: 'select', value: { name: value } }),
        defaultValue: 'Other'
      },
      {
        sourceField: 'contentPreview',
        targetProperty: 'Content',
        transformation: (value: string) => ({ type: 'rich_text', value: [{ text: { content: value } }] })
      },
      {
        sourceField: 'lastUpdated',
        targetProperty: 'Last Updated',
        transformation: (value: string) => ({ type: 'date', value: { start: value } })
      },
      {
        sourceField: 'status',
        targetProperty: 'Status',
        transformation: (value: string) => ({ type: 'select', value: { name: value } }),
        defaultValue: 'Published'
      },
      {
        sourceField: 'priority',
        targetProperty: 'Priority',
        transformation: (value: string) => ({ type: 'select', value: { name: value } })
      },
      {
        sourceField: 'tags',
        targetProperty: 'Tags',
        transformation: (value: string[]) => ({
          type: 'multi_select',
          value: value.map(tag => ({ name: tag }))
        })
      }
    ]);

    // Functions 데이터베이스 매핑 규칙
    this.mappingRules.set('functions', [
      {
        sourceField: 'name',
        targetProperty: 'Name',
        transformation: (value: string) => ({ type: 'title', value: [{ text: { content: value } }] })
      },
      {
        sourceField: 'type',
        targetProperty: 'Type',
        transformation: (value: string) => ({ type: 'select', value: { name: this.capitalizeFunctionType(value) } })
      },
      {
        sourceField: 'parameters',
        targetProperty: 'Parameters',
        transformation: (value: string[]) => ({
          type: 'rich_text',
          value: [{ text: { content: value.join(', ') } }]
        })
      },
      {
        sourceField: 'returnType',
        targetProperty: 'Return Type',
        transformation: (value: string) => ({ type: 'rich_text', value: [{ text: { content: value } }] })
      },
      {
        sourceField: 'description',
        targetProperty: 'Description',
        transformation: (value: string) => ({ type: 'rich_text', value: [{ text: { content: value } }] })
      },
      {
        sourceField: 'complexity',
        targetProperty: 'Complexity',
        transformation: (value: string) => ({ type: 'select', value: { name: this.capitalizeComplexity(value) } })
      }
    ]);
  }

  /**
   * 수집된 데이터를 Notion 페이지 데이터로 변환
   */
  mapToNotionPage(data: CollectedData, databaseName: string): NotionPageData {
    const rules = this.mappingRules.get(databaseName);
    if (!rules) {
      throw new Error(`No mapping rules found for database: ${databaseName}`);
    }

    const properties: { [key: string]: NotionPropertyValue } = {};

    for (const rule of rules) {
      const sourceValue = data[rule.sourceField];
      
      if (sourceValue !== undefined && sourceValue !== null) {
        // 유효성 검사
        if (rule.validation && !rule.validation(sourceValue)) {
          console.warn(`Validation failed for ${rule.sourceField}: ${sourceValue}`);
          continue;
        }

        // 변환 적용
        if (rule.transformation) {
          properties[rule.targetProperty] = rule.transformation(sourceValue);
        } else {
          properties[rule.targetProperty] = { type: 'rich_text' as const, value: sourceValue };
        }
      } else if (rule.defaultValue) {
        // 기본값 적용
        if (rule.transformation) {
          properties[rule.targetProperty] = rule.transformation(rule.defaultValue);
        } else {
          properties[rule.targetProperty] = { type: 'rich_text' as const, value: rule.defaultValue };
        }
      }
    }

    return { properties };
  }

  /**
   * 종속성 정보를 Relations 형식으로 변환
   */
  mapDependenciesToRelations(dependencies: DependencyInfo[], allFiles: Map<string, string>): any[] {
    const relations: any[] = [];
    
    for (const dep of dependencies) {
      if (dep.type === 'relative') {
        // 상대 경로를 절대 경로로 변환하고 해당 파일의 Notion ID 찾기
        const resolvedPath = this.resolveRelativePath(dep.source);
        const notionId = allFiles.get(resolvedPath);
        
        if (notionId) {
          relations.push({ id: notionId });
        }
      }
    }
    
    return relations;
  }

  /**
   * 함수 정보를 Functions 데이터베이스 형식으로 변환
   */
  mapFunctionToNotionPage(func: FunctionInfo, filePath: string, fileNotionId?: string): NotionPageData {
    const data: CollectedData = {
      name: func.name,
      type: func.type,
      parameters: func.parameters,
      returnType: func.returnType || '',
      description: func.description || '',
      complexity: func.complexity
    };

    const notionPage = this.mapToNotionPage(data, 'functions');

    // File relation 추가
    if (fileNotionId) {
      notionPage.properties['File'] = {
        type: 'relation',
        value: [{ id: fileNotionId }]
      };
    }

    return notionPage;
  }

  /**
   * TODO 항목을 페이지 내용으로 변환
   */
  mapTodosToPageContent(todos: TodoItem[]): any[] {
    if (todos.length === 0) return [];

    const blocks: any[] = [
      {
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: 'TODO Items' } }]
        }
      }
    ];

    for (const todo of todos) {
      blocks.push({
        type: 'to_do',
        to_do: {
          rich_text: [
            {
              text: {
                content: `[${todo.type}${todo.priority ? ` - ${todo.priority}` : ''}] ${todo.content}`
              }
            }
          ],
          checked: false
        }
      });

      // 컨텍스트 정보 추가
      if (todo.context) {
        blocks.push({
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                text: {
                  content: `Line ${todo.line}${todo.author ? ` (@${todo.author})` : ''}`
                }
              }
            ]
          }
        });
      }
    }

    return blocks;
  }

  /**
   * 클래스 정보를 페이지 내용으로 변환
   */
  mapClassToPageContent(classInfo: ClassInfo): any[] {
    const blocks: any[] = [];

    // 클래스 정보 헤더
    blocks.push({
      type: 'heading_1',
      heading_1: {
        rich_text: [{ text: { content: `Class: ${classInfo.name}` } }]
      }
    });

    // 기본 정보
    const infoLines: string[] = [];
    if (classInfo.extends) infoLines.push(`Extends: ${classInfo.extends}`);
    if (classInfo.implements.length > 0) infoLines.push(`Implements: ${classInfo.implements.join(', ')}`);
    infoLines.push(`Exported: ${classInfo.isExported ? 'Yes' : 'No'}`);
    infoLines.push(`Line: ${classInfo.line}`);

    blocks.push({
      type: 'paragraph',
      paragraph: {
        rich_text: [{ text: { content: infoLines.join('\n') } }]
      }
    });

    // 설명
    if (classInfo.description) {
      blocks.push({
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: classInfo.description } }]
        }
      });
    }

    // 속성들
    if (classInfo.properties.length > 0) {
      blocks.push({
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: 'Properties' } }]
        }
      });

      for (const prop of classInfo.properties) {
        blocks.push({
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ text: { content: prop } }]
          }
        });
      }
    }

    // 메서드들
    if (classInfo.methods.length > 0) {
      blocks.push({
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: 'Methods' } }]
        }
      });

      for (const method of classInfo.methods) {
        blocks.push({
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              {
                text: {
                  content: `${method.name}(${method.parameters.join(', ')})${method.returnType ? `: ${method.returnType}` : ''}`
                }
              }
            ]
          }
        });
      }
    }

    return blocks;
  }

  /**
   * 여러 데이터 타입을 통합하여 하나의 페이지로 구성
   */
  mapCombinedDataToNotionPage(
    baseData: CollectedData,
    databaseName: string,
    options: {
      todos?: TodoItem[];
      functions?: FunctionInfo[];
      classes?: ClassInfo[];
      interfaces?: InterfaceInfo[];
      dependencies?: DependencyInfo[];
    } = {}
  ): NotionPageData {
    // 기본 속성 매핑
    const notionPage = this.mapToNotionPage(baseData, databaseName);
    
    // 페이지 내용 블록들 구성
    const children: any[] = [];
    
    // TODO 항목 추가
    if (options.todos && options.todos.length > 0) {
      children.push(...this.mapTodosToPageContent(options.todos));
    }
    
    // 함수 정보 추가
    if (options.functions && options.functions.length > 0) {
      children.push({
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: 'Functions' } }]
        }
      });
      
      for (const func of options.functions) {
        children.push({
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                text: {
                  content: `${func.name}(${func.parameters.join(', ')}) - ${func.complexity} complexity`
                }
              }
            ]
          }
        });
      }
    }
    
    // 클래스 정보 추가
    if (options.classes && options.classes.length > 0) {
      for (const classInfo of options.classes) {
        children.push(...this.mapClassToPageContent(classInfo));
      }
    }
    
    // 종속성 정보 추가
    if (options.dependencies && options.dependencies.length > 0) {
      children.push({
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: 'Dependencies' } }]
        }
      });
      
      const externalDeps = options.dependencies.filter(d => d.type === 'external');
      const internalDeps = options.dependencies.filter(d => d.type === 'internal');
      const relativeDeps = options.dependencies.filter(d => d.type === 'relative');
      
      if (externalDeps.length > 0) {
        children.push({
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content: `External: ${externalDeps.map(d => d.source).join(', ')}` } }]
          }
        });
      }
      
      if (internalDeps.length > 0) {
        children.push({
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content: `Internal: ${internalDeps.map(d => d.source).join(', ')}` } }]
          }
        });
      }
      
      if (relativeDeps.length > 0) {
        children.push({
          type: 'paragraph',
          paragraph: {
            rich_text: [{ text: { content: `Relative: ${relativeDeps.map(d => d.source).join(', ')}` } }]
          }
        });
      }
    }
    
    if (children.length > 0) {
      notionPage.children = children;
    }
    
    return notionPage;
  }

  /**
   * 커스텀 매핑 규칙 추가
   */
  addCustomMappingRule(databaseName: string, rule: MappingRule): void {
    const existing = this.mappingRules.get(databaseName) || [];
    existing.push(rule);
    this.mappingRules.set(databaseName, existing);
  }

  /**
   * 매핑 규칙 전체 교체
   */
  setMappingRules(databaseName: string, rules: MappingRule[]): void {
    this.mappingRules.set(databaseName, rules);
  }

  // === 유틸리티 메서드들 ===

  private capitalizeFunctionType(type: string): string {
    const mappings: { [key: string]: string } = {
      'function': 'Function',
      'method': 'Method',
      'arrow': 'Arrow Function',
      'class': 'Class',
      'component': 'Component',
      'hook': 'Hook'
    };
    return mappings[type] || 'Function';
  }

  private capitalizeComplexity(complexity: string): string {
    return complexity.charAt(0).toUpperCase() + complexity.slice(1);
  }

  private resolveRelativePath(relativePath: string): string {
    // 간단한 상대 경로 해결 로직 (실제로는 더 복잡할 수 있음)
    return relativePath.replace(/^\.\//, '').replace(/^\.\.\//, '../');
  }

  /**
   * 데이터 검증
   */
  validateMappedData(notionPage: NotionPageData, databaseName: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // 필수 속성 확인 (title 속성은 반드시 있어야 함)
    const hasTitleProperty = Object.values(notionPage.properties).some(prop => prop.type === 'title');
    if (!hasTitleProperty) {
      errors.push(`Database ${databaseName} requires a title property`);
    }
    
    // 속성 값 타입 검증
    for (const [propName, propValue] of Object.entries(notionPage.properties)) {
      if (!this.isValidPropertyValue(propValue)) {
        errors.push(`Invalid property value for ${propName}: ${JSON.stringify(propValue)}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidPropertyValue(propValue: NotionPropertyValue): boolean {
    const validTypes = ['title', 'rich_text', 'select', 'multi_select', 'date', 'number', 'checkbox', 'url', 'email', 'phone_number', 'relation'];
    
    if (!validTypes.includes(propValue.type)) {
      return false;
    }
    
    if (propValue.value === undefined || propValue.value === null) {
      return false;
    }
    
    return true;
  }
}