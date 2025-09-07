/**
 * Schema Validation Service - Domain Layer
 * 스키마 검증 및 동기화를 위한 도메인 서비스
 */

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
}

export interface ValidationError {
  type: ValidationErrorType;
  field: string;
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ValidationWarning {
  type: string;
  field: string;
  message: string;
}

export interface ValidationSuggestion {
  action: RepairActionType;
  description: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export enum ValidationErrorType {
  STRUCTURE_ERROR = 'structure',
  TYPE_MISMATCH = 'type_mismatch',
  MISSING_REQUIRED = 'missing_required',
  NOTION_INCOMPATIBLE = 'notion_incompatible',
  BUSINESS_RULE_VIOLATION = 'business_rule'
}

export enum RepairActionType {
  ADD_MISSING_FIELD = 'add_missing_field',
  FIX_TYPE_MISMATCH = 'fix_type_mismatch',
  UPDATE_NOTION_PROPERTIES = 'update_notion_properties',
  RECREATE_DATABASE = 'recreate_database',
  MIGRATE_DATA = 'migrate_data'
}

export interface NotionValidationResult extends ValidationResult {
  databaseId: string;
  remoteSchema: any;
  lastUpdated: Date;
}

export interface SchemaDiff {
  addedProperties: string[];
  removedProperties: string[];
  modifiedProperties: Array<{
    name: string;
    localType: string;
    remoteType: string;
    conflictType: 'TYPE_MISMATCH' | 'OPTION_MISMATCH' | 'CONFIGURATION_MISMATCH';
  }>;
  structuralChanges: Array<{
    type: 'TITLE_CHANGE' | 'DESCRIPTION_CHANGE' | 'PROPERTY_ORDER_CHANGE';
    details: any;
  }>;
}

/**
 * Schema Validation Service
 * 스키마 검증 및 비교를 위한 도메인 서비스
 */
export class SchemaValidationService {
  private readonly SUPPORTED_PROPERTY_TYPES = [
    'title', 'rich_text', 'number', 'select', 'multi_select', 
    'date', 'checkbox', 'url', 'email', 'phone_number', 
    'relation', 'rollup', 'formula', 'created_time', 'last_edited_time'
  ];

  /**
   * 다단계 스키마 검증 파이프라인
   */
  async validateDatabaseSchema(schema: any): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // Level 1: Structure Validation
    const structureResult = this.validateStructure(schema);
    errors.push(...structureResult.errors);
    warnings.push(...structureResult.warnings);

    // Level 2: Semantic Validation
    if (structureResult.errors.length === 0) {
      const semanticResult = this.validateSemantics(schema);
      errors.push(...semanticResult.errors);
      warnings.push(...semanticResult.warnings);
    }

    // Level 3: Notion Compatibility
    if (errors.filter(e => e.severity === 'CRITICAL').length === 0) {
      const compatibilityResult = this.validateNotionCompatibility(schema);
      errors.push(...compatibilityResult.errors);
      warnings.push(...compatibilityResult.warnings);
    }

    // Level 4: Business Rules
    const businessResult = this.validateBusinessRules(schema);
    errors.push(...businessResult.errors);
    warnings.push(...businessResult.warnings);

    // Generate suggestions based on errors
    suggestions.push(...this.generateSuggestions(errors));

    return {
      isValid: errors.filter(e => e.severity === 'CRITICAL' || e.severity === 'HIGH').length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Level 1: 구조 검증
   */
  private validateStructure(schema: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!schema || typeof schema !== 'object') {
      errors.push({
        type: ValidationErrorType.STRUCTURE_ERROR,
        field: 'root',
        message: 'Schema must be a valid object',
        severity: 'CRITICAL'
      });
      return { isValid: false, errors, warnings, suggestions: [] };
    }

    // Check required title field
    if (!schema.title || typeof schema.title !== 'string') {
      errors.push({
        type: ValidationErrorType.MISSING_REQUIRED,
        field: 'title',
        message: 'Database title is required and must be a string',
        severity: 'HIGH'
      });
    }

    // Check properties structure
    const hasDirectProperties = schema.properties && typeof schema.properties === 'object';
    const hasNestedProperties = schema.initial_data_source && 
                               schema.initial_data_source.properties && 
                               typeof schema.initial_data_source.properties === 'object';

    if (!hasDirectProperties && !hasNestedProperties) {
      errors.push({
        type: ValidationErrorType.STRUCTURE_ERROR,
        field: 'properties',
        message: 'Schema must have properties either directly or in initial_data_source',
        severity: 'CRITICAL'
      });
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions: [] };
  }

  /**
   * Level 2: 의미적 검증
   */
  private validateSemantics(schema: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const properties = this.extractProperties(schema);
    
    // Check for at least one title property
    const titleProperties = Object.entries(properties).filter(
      ([_, prop]: [string, any]) => prop.type === 'title'
    );

    if (titleProperties.length === 0) {
      errors.push({
        type: ValidationErrorType.BUSINESS_RULE_VIOLATION,
        field: 'properties',
        message: 'Database must have at least one title property',
        severity: 'HIGH'
      });
    }

    if (titleProperties.length > 1) {
      warnings.push({
        type: 'multiple_titles',
        field: 'properties',
        message: 'Multiple title properties found, only one is recommended'
      });
    }

    // Validate each property
    for (const [propName, prop] of Object.entries(properties)) {
      const propResult = this.validateProperty(propName, prop as any);
      errors.push(...propResult.errors);
      warnings.push(...propResult.warnings);
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions: [] };
  }

  /**
   * Level 3: Notion 호환성 검증
   */
  private validateNotionCompatibility(schema: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const properties = this.extractProperties(schema);

    for (const [propName, prop] of Object.entries(properties)) {
      const typedProp = prop as any;
      
      // Check supported property types
      if (!this.SUPPORTED_PROPERTY_TYPES.includes(typedProp.type)) {
        errors.push({
          type: ValidationErrorType.NOTION_INCOMPATIBLE,
          field: propName,
          message: `Property type '${typedProp.type}' is not supported by Notion API`,
          severity: 'HIGH'
        });
      }

      // Validate select/multi_select options
      if (typedProp.type === 'select' || typedProp.type === 'multi_select') {
        const selectConfig = typedProp[typedProp.type];
        if (selectConfig && selectConfig.options && Array.isArray(selectConfig.options)) {
          if (selectConfig.options.length > 100) {
            errors.push({
              type: ValidationErrorType.NOTION_INCOMPATIBLE,
              field: propName,
              message: 'Select options cannot exceed 100 items',
              severity: 'MEDIUM'
            });
          }
        }
      }

      // Check property name length
      if (propName.length > 100) {
        errors.push({
          type: ValidationErrorType.NOTION_INCOMPATIBLE,
          field: propName,
          message: 'Property name cannot exceed 100 characters',
          severity: 'MEDIUM'
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions: [] };
  }

  /**
   * Level 4: 비즈니스 규칙 검증
   */
  private validateBusinessRules(schema: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Business rule: File Path property should be rich_text
    const properties = this.extractProperties(schema);
    const filePathProp = properties['File Path'];
    if (filePathProp && filePathProp.type !== 'rich_text') {
      warnings.push({
        type: 'business_rule',
        field: 'File Path',
        message: 'File Path property should be rich_text type for better readability'
      });
    }

    // Business rule: Size properties should be number
    const sizeProp = properties['Size (bytes)'];
    if (sizeProp && sizeProp.type !== 'number') {
      errors.push({
        type: ValidationErrorType.BUSINESS_RULE_VIOLATION,
        field: 'Size (bytes)',
        message: 'Size property must be number type',
        severity: 'MEDIUM'
      });
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions: [] };
  }

  /**
   * 개별 속성 검증
   */
  private validateProperty(propName: string, prop: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!prop || typeof prop !== 'object') {
      errors.push({
        type: ValidationErrorType.STRUCTURE_ERROR,
        field: propName,
        message: 'Property must be a valid object',
        severity: 'HIGH'
      });
      return { isValid: false, errors, warnings, suggestions: [] };
    }

    if (!prop.type || typeof prop.type !== 'string') {
      errors.push({
        type: ValidationErrorType.MISSING_REQUIRED,
        field: propName,
        message: 'Property type is required',
        severity: 'HIGH'
      });
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions: [] };
  }

  /**
   * 스키마 비교 (로컬 vs 원격)
   */
  compareDatabaseSchemas(local: any, remote: any): SchemaDiff {
    const localProps = this.extractProperties(local);
    const remoteProps = remote.properties || {};

    const localPropNames = new Set(Object.keys(localProps));
    const remotePropNames = new Set(Object.keys(remoteProps));

    const addedProperties = Array.from(localPropNames).filter(name => !remotePropNames.has(name));
    const removedProperties = Array.from(remotePropNames).filter(name => !localPropNames.has(name));
    
    const modifiedProperties = [];
    for (const propName of localPropNames) {
      if (remotePropNames.has(propName)) {
        const localProp = localProps[propName];
        const remoteProp = remoteProps[propName];
        
        if (localProp.type !== remoteProp.type) {
          modifiedProperties.push({
            name: propName,
            localType: localProp.type,
            remoteType: remoteProp.type,
            conflictType: 'TYPE_MISMATCH' as const
          });
        }
      }
    }

    const structuralChanges = [];
    if (local.title !== remote.title?.[0]?.text?.content) {
      structuralChanges.push({
        type: 'TITLE_CHANGE' as const,
        details: { local: local.title, remote: remote.title?.[0]?.text?.content }
      });
    }

    return {
      addedProperties,
      removedProperties,
      modifiedProperties,
      structuralChanges
    };
  }

  /**
   * 검증 오류 기반 수정 제안 생성
   */
  private generateSuggestions(errors: ValidationError[]): ValidationSuggestion[] {
    const suggestions: ValidationSuggestion[] = [];

    for (const error of errors) {
      switch (error.type) {
        case ValidationErrorType.MISSING_REQUIRED:
          if (error.field === 'title') {
            suggestions.push({
              action: RepairActionType.ADD_MISSING_FIELD,
              description: 'Add missing title field to database schema',
              riskLevel: 'LOW'
            });
          }
          break;

        case ValidationErrorType.TYPE_MISMATCH:
          suggestions.push({
            action: RepairActionType.FIX_TYPE_MISMATCH,
            description: `Fix type mismatch for field: ${error.field}`,
            riskLevel: 'MEDIUM'
          });
          break;

        case ValidationErrorType.NOTION_INCOMPATIBLE:
          if (error.severity === 'HIGH') {
            suggestions.push({
              action: RepairActionType.RECREATE_DATABASE,
              description: 'Recreate database with compatible schema',
              riskLevel: 'HIGH'
            });
          } else {
            suggestions.push({
              action: RepairActionType.UPDATE_NOTION_PROPERTIES,
              description: `Update Notion properties to fix: ${error.message}`,
              riskLevel: 'MEDIUM'
            });
          }
          break;
      }
    }

    return suggestions;
  }

  /**
   * 스키마에서 properties 추출 (중첩 구조 지원)
   */
  private extractProperties(schema: any): Record<string, any> {
    if (schema.properties && typeof schema.properties === 'object') {
      return schema.properties;
    }

    if (schema.initial_data_source && schema.initial_data_source.properties) {
      return schema.initial_data_source.properties;
    }

    return {};
  }
}