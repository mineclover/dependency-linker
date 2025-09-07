/**
 * Data Collection Domain Service
 * Implements business logic for managing data collection rules
 */

import type { DatabaseCollectionSchema, CollectionRule } from '../entities/DataCollectionRules.js';
import { DataCollectionRules } from '../entities/DataCollectionRules.js';
import { logger } from '../../shared/utils/index.js';

export interface ISchemaRepository {
  loadSchema(schemaPath: string): Promise<any>;
  saveSchema(schemaPath: string, schema: any): Promise<void>;
  validateSchemaAccess(schemaPath: string): Promise<boolean>;
}

export interface DataCollectionResult {
  success: boolean;
  message: string;
  data?: {
    schemas?: Map<string, DatabaseCollectionSchema>;
    validationResults?: Array<{
      databaseName: string;
      isValid: boolean;
      errors: string[];
    }>;
    complexityAnalysis?: {
      totalComplexity: number;
      schemaComplexity: Record<string, any>;
    };
  };
  errors?: string[];
}

/**
 * Data Collection Domain Service
 * Contains business logic for data collection rule management
 */
export class DataCollectionService {
  private collectionSchemas: Map<string, DatabaseCollectionSchema> = new Map();

  constructor(
    private schemaRepository: ISchemaRepository
  ) {}

  /**
   * Initialize collection schemas from configuration
   */
  async initializeSchemas(schemaPath: string): Promise<DataCollectionResult> {
    try {
      logger.info('Initializing data collection schemas', '📋');

      // Business rule: Validate schema access
      const hasAccess = await this.schemaRepository.validateSchemaAccess(schemaPath);
      if (!hasAccess) {
        return {
          success: false,
          message: `Schema file not accessible: ${schemaPath}`,
          errors: [`Cannot access schema file at ${schemaPath}`]
        };
      }

      const schema = await this.schemaRepository.loadSchema(schemaPath);
      
      // Business rule: Validate schema structure
      if (!schema.databases) {
        return {
          success: false,
          message: 'Invalid schema format: missing databases configuration',
          errors: ['Schema must contain databases configuration']
        };
      }

      // Generate collection schemas using business rules
      this.generateCollectionSchemas(schema);

      // Apply business rule: Validate all schemas
      const validationResults = this.validateAllSchemas();
      
      const hasErrors = validationResults.some(result => !result.isValid);
      if (hasErrors) {
        return {
          success: false,
          message: 'Schema validation failed',
          data: { validationResults },
          errors: validationResults.flatMap(r => r.errors)
        };
      }

      logger.success(`✅ Initialized ${this.collectionSchemas.size} collection schemas`);

      return {
        success: true,
        message: `Successfully initialized ${this.collectionSchemas.size} collection schemas`,
        data: { 
          schemas: this.collectionSchemas,
          validationResults 
        }
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Schema initialization failed: ${errorMsg}`);
      
      return {
        success: false,
        message: `Schema initialization failed: ${errorMsg}`,
        errors: [errorMsg]
      };
    }
  }

  /**
   * Get collection schema for database
   */
  getCollectionSchema(databaseName: string): DatabaseCollectionSchema | null {
    return this.collectionSchemas.get(databaseName) || null;
  }

  /**
   * Get all collection schemas
   */
  getAllCollectionSchemas(): Map<string, DatabaseCollectionSchema> {
    return new Map(this.collectionSchemas);
  }

  /**
   * Add or update collection schema
   */
  setCollectionSchema(schema: DatabaseCollectionSchema): DataCollectionResult {
    // Apply business rule: Validate schema before adding
    const validation = this.validateSchema(schema);
    if (!validation.isValid) {
      return {
        success: false,
        message: `Schema validation failed for ${schema.databaseName}`,
        errors: validation.errors
      };
    }

    this.collectionSchemas.set(schema.databaseName, schema);
    
    return {
      success: true,
      message: `Successfully set collection schema for ${schema.databaseName}`,
      data: { schemas: this.collectionSchemas }
    };
  }

  /**
   * Remove collection schema
   */
  removeCollectionSchema(databaseName: string): DataCollectionResult {
    const existed = this.collectionSchemas.has(databaseName);
    this.collectionSchemas.delete(databaseName);

    return {
      success: true,
      message: existed 
        ? `Removed collection schema for ${databaseName}` 
        : `No schema found for ${databaseName}`,
      data: { schemas: this.collectionSchemas }
    };
  }

  /**
   * Analyze collection complexity
   */
  analyzeComplexity(): DataCollectionResult {
    const schemaComplexity: Record<string, any> = {};
    let totalComplexity = 0;

    for (const [databaseName, schema] of this.collectionSchemas) {
      const complexity = DataCollectionRules.calculateComplexityScore(schema);
      schemaComplexity[databaseName] = complexity;
      totalComplexity += complexity.score;
    }

    return {
      success: true,
      message: 'Complexity analysis completed',
      data: {
        complexityAnalysis: {
          totalComplexity,
          schemaComplexity
        }
      }
    };
  }

  /**
   * Generate optimized collection schema
   */
  generateOptimizedSchema(
    databaseType: 'files' | 'docs' | 'functions',
    customConfig?: any
  ): DataCollectionResult {
    try {
      // Apply business rules to generate optimized schema
      const schema = DataCollectionRules.generateCollectionSchema(
        databaseType, 
        customConfig || {}
      );

      // Business rule: Validate generated schema
      const validation = this.validateSchema(schema);
      if (!validation.isValid) {
        return {
          success: false,
          message: `Generated schema validation failed for ${databaseType}`,
          errors: validation.errors
        };
      }

      this.collectionSchemas.set(schema.databaseName, schema);

      return {
        success: true,
        message: `Successfully generated optimized schema for ${databaseType}`,
        data: { schemas: this.collectionSchemas }
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Schema generation failed: ${errorMsg}`,
        errors: [errorMsg]
      };
    }
  }

  /**
   * Get extraction rules for file type
   */
  getExtractionRulesForFile(
    filePath: string,
    databaseName: string
  ): CollectionRule[] | null {
    const schema = this.collectionSchemas.get(databaseName);
    if (!schema) {
      return null;
    }

    const fileExtension = this.extractFileExtension(filePath);
    
    // Apply business rule: Filter rules by file type compatibility
    return schema.rules.filter(rule => 
      rule.extractionRules.fileTypes.includes(fileExtension as any)
    );
  }

  /**
   * Apply transformation rules to extracted data
   */
  applyTransformationRules(
    value: any,
    rule: CollectionRule
  ): { value: any; isValid: boolean; errors: string[] } {
    const result = { value, isValid: true, errors: [] };

    // Business rule: Apply default value if value is empty/null
    if ((value === null || value === undefined || value === '') && rule.transformationRules.defaultValue) {
      result.value = rule.transformationRules.defaultValue;
    }

    // Business rule: Apply value mappings
    if (rule.transformationRules.mappings && result.value) {
      const mappedValue = rule.transformationRules.mappings[String(result.value)];
      if (mappedValue !== undefined) {
        result.value = mappedValue;
      }
    }

    // Business rule: Apply validation
    if (rule.transformationRules.validation && result.value) {
      const isValid = rule.transformationRules.validation.test(String(result.value));
      if (!isValid) {
        result.isValid = false;
        result.errors.push(`Value "${result.value}" does not match validation pattern`);
      }
    }

    // Business rule: Check required fields
    if (rule.required && (result.value === null || result.value === undefined || result.value === '')) {
      result.isValid = false;
      result.errors.push(`Required property "${rule.propertyName}" is missing or empty`);
    }

    return result;
  }

  /**
   * Generate collection schemas using business rules
   */
  private generateCollectionSchemas(schema: any): void {
    this.collectionSchemas.clear();

    // Apply business rule: Generate schemas for each database type
    const databaseTypes: Array<'files' | 'docs' | 'functions'> = ['files', 'docs', 'functions'];
    
    for (const dbType of databaseTypes) {
      if (schema.databases[dbType]) {
        try {
          const collectionSchema = DataCollectionRules.generateCollectionSchema(
            dbType,
            schema.databases[dbType]
          );
          this.collectionSchemas.set(dbType, collectionSchema);
        } catch (error) {
          logger.warning(`Failed to generate schema for ${dbType}: ${error}`);
        }
      }
    }
  }

  /**
   * Validate all collection schemas
   */
  private validateAllSchemas(): Array<{
    databaseName: string;
    isValid: boolean;
    errors: string[];
  }> {
    const results: Array<{ databaseName: string; isValid: boolean; errors: string[] }> = [];

    for (const [databaseName, schema] of this.collectionSchemas) {
      const validation = this.validateSchema(schema);
      results.push({
        databaseName,
        isValid: validation.isValid,
        errors: validation.errors
      });
    }

    return results;
  }

  /**
   * Validate individual schema using business rules
   */
  private validateSchema(schema: DatabaseCollectionSchema): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!schema.databaseName || schema.databaseName.trim().length === 0) {
      errors.push('Database name is required');
    }

    if (!schema.title || schema.title.trim().length === 0) {
      errors.push('Database title is required');
    }

    if (!schema.rules || schema.rules.length === 0) {
      errors.push('At least one collection rule is required');
    }

    // Business rule: Validate each rule
    for (const rule of schema.rules || []) {
      const ruleValidation = DataCollectionRules.validateRule(rule);
      if (!ruleValidation.isValid) {
        errors.push(...ruleValidation.errors.map(e => `Rule "${rule.propertyName}": ${e}`));
      }
    }

    // Business rule: Must have at least one title property
    const titleRules = schema.rules?.filter(rule => rule.propertyType === 'title') || [];
    if (titleRules.length === 0) {
      errors.push('Database must have at least one title property');
    }

    // Business rule: Title properties must be required
    const optionalTitleRules = titleRules.filter(rule => !rule.required);
    if (optionalTitleRules.length > 0) {
      errors.push('Title properties must be required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Extract file extension from path
   */
  private extractFileExtension(filePath: string): string {
    const match = filePath.match(/\.[^.]+$/);
    return match ? match[0] : '';
  }
}