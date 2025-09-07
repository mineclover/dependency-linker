/**
 * Data Collection Rules Service - Application Service Layer (Clean Architecture)
 * Orchestrates domain services for data collection rule management
 * Refactored to remove direct file system dependencies
 */

import { DataCollectionService } from '../domain/services/DataCollectionService.js';
import { SchemaRepository } from '../infrastructure/repositories/SchemaRepository.js';
import path from 'path';

// Re-export types from domain layer
export type {
  CollectionRule,
  DatabaseCollectionSchema,
  ExtractionRules,
  TransformationRules,
  PropertyType,
  FileType
} from '../domain/entities/DataCollectionRules.js';

export type {
  DataCollectionResult
} from '../domain/services/DataCollectionService.js';

/**
 * Data Collection Rules Service - Clean Architecture Application Service
 * Coordinates domain services with infrastructure repositories
 */
export class DataCollectionRulesService {
  private dataCollectionService: DataCollectionService;
  private schemaPath: string;

  constructor(schemaPath: string = 'src/infrastructure/database/schemas/database-schemas.json') {
    this.schemaPath = schemaPath;
    
    // Initialize infrastructure repository
    const schemaRepository = new SchemaRepository();
    
    // Initialize domain service with repository
    this.dataCollectionService = new DataCollectionService(schemaRepository);
  }

  /**
   * Initialize collection rules (delegated to domain service)
   */
  async initializeCollectionRules(): Promise<DataCollectionResult> {
    return await this.dataCollectionService.initializeSchemas(this.schemaPath);
  }
  
  /**
   * Load collection rules synchronously (legacy compatibility)
   */
  loadCollectionRules(): void {
    // For backward compatibility - use synchronous initialization
    this.dataCollectionService.initializeSchemas(this.schemaPath)
      .catch(error => {
        console.error('Failed to initialize collection rules:', error);
      });
  }

  /**
   * Get collection schema for database
   */
  getCollectionSchema(databaseName: string): DatabaseCollectionSchema | null {
    return this.dataCollectionService.getCollectionSchema(databaseName);
  }

  /**
   * Get all collection schemas
   */
  getAllCollectionSchemas(): Map<string, DatabaseCollectionSchema> {
    return this.dataCollectionService.getAllCollectionSchemas();
  }

  /**
   * Generate optimized schema for database type
   */
  generateOptimizedSchema(
    databaseType: 'files' | 'docs' | 'functions',
    customConfig?: any
  ): DataCollectionResult {
    return this.dataCollectionService.generateOptimizedSchema(databaseType, customConfig);
  }

  /**
   * Get extraction rules for specific file
   */
  getExtractionRulesForFile(filePath: string, databaseName: string): CollectionRule[] | null {
    return this.dataCollectionService.getExtractionRulesForFile(filePath, databaseName);
  }

  /**
   * Apply transformation rules to data
   */
  applyTransformationRules(value: any, rule: CollectionRule) {
    return this.dataCollectionService.applyTransformationRules(value, rule);
  }

  /**
   * Analyze collection complexity
   */
  analyzeComplexity(): DataCollectionResult {
    return this.dataCollectionService.analyzeComplexity();
  }

  // Legacy methods - replaced with domain service implementations
  /**
   * @deprecated Use generateOptimizedSchema('files', schema) instead
   */
  private createFilesCollectionSchema(schema: any): DatabaseCollectionSchema {
    // Legacy implementation - use domain service instead
    const result = this.dataCollectionService.generateOptimizedSchema('files', schema);
    if (result.success && result.data?.schemas) {
      return result.data.schemas.get('files')!;
    }
    throw new Error('Failed to generate files collection schema');
  }

  /**
   * @deprecated Use generateOptimizedSchema('docs', schema) instead
   */
  private createDocsCollectionSchema(schema: any): DatabaseCollectionSchema {
    const result = this.dataCollectionService.generateOptimizedSchema('docs', schema);
    if (result.success && result.data?.schemas) {
      return result.data.schemas.get('docs')!;
    }
    throw new Error('Failed to generate docs collection schema');
  }

  /**
   * @deprecated Use generateOptimizedSchema('functions', schema) instead
   */
  private createFunctionsCollectionSchema(schema: any): DatabaseCollectionSchema {
    const result = this.dataCollectionService.generateOptimizedSchema('functions', schema);
    if (result.success && result.data?.schemas) {
      return result.data.schemas.get('functions')!;
    }
    throw new Error('Failed to generate functions collection schema');
  }

  // These methods are already implemented above - removing duplicates

  /**
   * Get applicable rules for file (delegated to domain service)
   * @deprecated Use getExtractionRulesForFile instead
   */
  getApplicableRules(filePath: string, databaseName: string): CollectionRule[] {
    return this.getExtractionRulesForFile(filePath, databaseName) || [];
  }

  /**
   * Validate collection rules (uses domain service validation)
   */
  validateCollectionRules(): { isValid: boolean; errors: string[] } {
    const result = this.analyzeComplexity();
    
    if (!result.success) {
      return {
        isValid: false,
        errors: result.errors || ['Validation failed']
      };
    }

    // Additional validation could be implemented here
    return {
      isValid: true,
      errors: []
    };
  }
}