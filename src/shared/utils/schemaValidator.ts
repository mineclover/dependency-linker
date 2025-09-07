/**
 * Enhanced Schema Validation System - Clean Architecture Shared Layer
 * JSON schema-based database definitions with comprehensive validation
 */

import { logger } from './index.js';
import { ValidationError } from '../types/index.js';

export interface SchemaProperty {
  type: 'title' | 'rich_text' | 'number' | 'select' | 'multi_select' | 'date' | 'people' | 'checkbox' | 'url' | 'email' | 'phone_number' | 'formula' | 'relation' | 'rollup' | 'files';
  required?: boolean;
  description?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
    enum?: string[];
  };
  options?: Array<{
    name: string;
    color: 'default' | 'gray' | 'brown' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'red';
    description?: string;
  }>;
  relation?: {
    database: string;
    bidirectional?: boolean;
    syncProperty?: string;
  };
  formula?: {
    expression: string;
  };
  rollup?: {
    relationProperty: string;
    property: string;
    function: 'count' | 'count_values' | 'empty' | 'not_empty' | 'unique' | 'show_unique' | 'percent_empty' | 'percent_not_empty' | 'sum' | 'average' | 'median' | 'min' | 'max' | 'range';
  };
}

export interface SchemaDatabase {
  title: string;
  description: string;
  icon?: string;
  properties: Record<string, SchemaProperty>;
  indexes?: Array<{
    columns: string[];
    unique?: boolean;
    name?: string;
  }>;
  constraints?: Array<{
    type: 'foreign_key' | 'check' | 'unique';
    columns: string[];
    reference?: {
      database: string;
      columns: string[];
    };
    expression?: string;
  }>;
}

export interface SchemaValidationConfig {
  $schema?: string;
  version: string;
  title: string;
  description: string;
  author?: string;
  created?: string;
  modified?: string;
  databases: Record<string, SchemaDatabase>;
  relationships?: Array<{
    from: { database: string; property: string };
    to: { database: string; property: string };
    type: 'one_to_one' | 'one_to_many' | 'many_to_many';
    description?: string;
  }>;
  globalConstraints?: Array<{
    name: string;
    description: string;
    expression: string;
  }>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
  suggestions: string[];
  metadata: {
    totalDatabases: number;
    totalProperties: number;
    totalRelationships: number;
    complexity: 'simple' | 'moderate' | 'complex';
  };
}

export class SchemaValidator {
  private static readonly RESERVED_NAMES = [
    'id', 'created_time', 'created_by', 'last_edited_time', 'last_edited_by'
  ];

  private static readonly PROPERTY_TYPE_VALIDATIONS: Record<string, (property: SchemaProperty) => string[]> = {
    title: (prop) => {
      const errors: string[] = [];
      if (prop.validation?.minLength && prop.validation.minLength < 1) {
        errors.push('Title minLength must be at least 1');
      }
      if (prop.validation?.maxLength && prop.validation.maxLength > 2000) {
        errors.push('Title maxLength cannot exceed 2000 characters');
      }
      return errors;
    },
    rich_text: (prop) => {
      const errors: string[] = [];
      if (prop.validation?.maxLength && prop.validation.maxLength > 100000) {
        errors.push('Rich text maxLength cannot exceed 100,000 characters');
      }
      return errors;
    },
    number: (prop) => {
      const errors: string[] = [];
      if (prop.validation?.min !== undefined && prop.validation?.max !== undefined) {
        if (prop.validation.min > prop.validation.max) {
          errors.push('Number min value cannot be greater than max value');
        }
      }
      return errors;
    },
    select: (prop) => {
      const errors: string[] = [];
      if (!prop.options || prop.options.length === 0) {
        errors.push('Select property must have at least one option');
      }
      if (prop.options && prop.options.length > 100) {
        errors.push('Select property cannot have more than 100 options');
      }
      return errors;
    },
    multi_select: (prop) => {
      const errors: string[] = [];
      if (!prop.options || prop.options.length === 0) {
        errors.push('Multi-select property must have at least one option');
      }
      if (prop.options && prop.options.length > 100) {
        errors.push('Multi-select property cannot have more than 100 options');
      }
      return errors;
    },
    relation: (prop) => {
      const errors: string[] = [];
      if (!prop.relation?.database) {
        errors.push('Relation property must specify target database');
      }
      return errors;
    },
    rollup: (prop) => {
      const errors: string[] = [];
      if (!prop.rollup?.relationProperty) {
        errors.push('Rollup property must specify relation property');
      }
      if (!prop.rollup?.property) {
        errors.push('Rollup property must specify target property');
      }
      if (!prop.rollup?.function) {
        errors.push('Rollup property must specify aggregation function');
      }
      return errors;
    },
    formula: (prop) => {
      const errors: string[] = [];
      if (!prop.formula?.expression) {
        errors.push('Formula property must have an expression');
      }
      return errors;
    }
  };

  /**
   * Validate complete database schemas
   */
  static validateSchemas(schemas: SchemaValidationConfig): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      // Validate schema metadata
      this.validateSchemaMetadata(schemas, errors, warnings);

      // Validate databases
      const databaseNames = Object.keys(schemas.databases);
      for (const [dbName, database] of Object.entries(schemas.databases)) {
        this.validateDatabase(dbName, database, databaseNames, errors, warnings, suggestions);
      }

      // Validate relationships
      if (schemas.relationships) {
        this.validateRelationships(schemas.relationships, schemas.databases, errors, warnings);
      }

      // Calculate complexity
      const complexity = this.calculateComplexity(schemas);

      // Generate suggestions
      this.generateSuggestions(schemas, suggestions);

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        suggestions,
        metadata: {
          totalDatabases: Object.keys(schemas.databases).length,
          totalProperties: Object.values(schemas.databases).reduce((acc, db) => acc + Object.keys(db.properties).length, 0),
          totalRelationships: schemas.relationships?.length || 0,
          complexity
        }
      };

    } catch (error) {
      errors.push(new ValidationError(
        `Schema validation failed: ${error}`,
        { error: error instanceof Error ? error.message : String(error) }
      ));

      return {
        valid: false,
        errors,
        warnings,
        suggestions,
        metadata: {
          totalDatabases: 0,
          totalProperties: 0,
          totalRelationships: 0,
          complexity: 'simple'
        }
      };
    }
  }

  private static validateSchemaMetadata(schemas: SchemaValidationConfig, errors: ValidationError[], warnings: string[]): void {
    if (!schemas.version) {
      errors.push(new ValidationError('Schema version is required'));
    }

    if (!schemas.title) {
      warnings.push('Schema title is recommended for documentation');
    }

    if (!schemas.description) {
      warnings.push('Schema description is recommended for documentation');
    }

    if (schemas.$schema && !schemas.$schema.startsWith('http')) {
      warnings.push('Schema URI should be a valid HTTP URL');
    }
  }

  private static validateDatabase(
    dbName: string,
    database: SchemaDatabase,
    allDatabaseNames: string[],
    errors: ValidationError[],
    warnings: string[],
    suggestions: string[]
  ): void {
    // Validate database name
    if (!this.isValidIdentifier(dbName)) {
      errors.push(new ValidationError(
        `Invalid database name: ${dbName}`,
        { database: dbName, reason: 'Database names must be valid identifiers' }
      ));
    }

    if (this.RESERVED_NAMES.includes(dbName.toLowerCase())) {
      errors.push(new ValidationError(
        `Database name '${dbName}' is reserved`,
        { database: dbName }
      ));
    }

    // Validate database structure
    if (!database.title) {
      errors.push(new ValidationError(
        `Database '${dbName}' must have a title`,
        { database: dbName }
      ));
    }

    if (!database.description) {
      warnings.push(`Database '${dbName}' should have a description`);
    }

    // Validate properties
    if (!database.properties || Object.keys(database.properties).length === 0) {
      errors.push(new ValidationError(
        `Database '${dbName}' must have at least one property`,
        { database: dbName }
      ));
      return;
    }

    // Check for title property
    const hasTitle = Object.values(database.properties).some(prop => prop.type === 'title');
    if (!hasTitle) {
      suggestions.push(`Database '${dbName}' should have a title property for better organization`);
    }

    // Validate each property
    for (const [propName, property] of Object.entries(database.properties)) {
      this.validateProperty(dbName, propName, property, allDatabaseNames, errors, warnings, suggestions);
    }

    // Validate indexes
    if (database.indexes) {
      this.validateIndexes(dbName, database.indexes, database.properties, errors, warnings, suggestions);
    }

    // Validate constraints
    if (database.constraints) {
      this.validateConstraints(dbName, database.constraints, database.properties, allDatabaseNames, errors, warnings);
    }
  }

  private static validateProperty(
    dbName: string,
    propName: string,
    property: SchemaProperty,
    allDatabaseNames: string[],
    errors: ValidationError[],
    warnings: string[],
    suggestions: string[]
  ): void {
    // Validate property name
    if (!this.isValidIdentifier(propName)) {
      errors.push(new ValidationError(
        `Invalid property name: ${propName} in database ${dbName}`,
        { database: dbName, property: propName }
      ));
    }

    if (this.RESERVED_NAMES.includes(propName.toLowerCase())) {
      errors.push(new ValidationError(
        `Property name '${propName}' is reserved in database ${dbName}`,
        { database: dbName, property: propName }
      ));
    }

    // Validate property type
    if (!property.type) {
      errors.push(new ValidationError(
        `Property '${propName}' in database '${dbName}' must have a type`,
        { database: dbName, property: propName }
      ));
      return;
    }

    // Type-specific validation
    const validator = this.PROPERTY_TYPE_VALIDATIONS[property.type];
    if (validator) {
      const typeErrors = validator(property);
      typeErrors.forEach(error => {
        errors.push(new ValidationError(
          `Property '${propName}' in database '${dbName}': ${error}`,
          { database: dbName, property: propName, type: property.type }
        ));
      });
    }

    // Validate relations
    if (property.type === 'relation' && property.relation) {
      if (!allDatabaseNames.includes(property.relation.database)) {
        errors.push(new ValidationError(
          `Relation property '${propName}' references unknown database '${property.relation.database}'`,
          { database: dbName, property: propName, targetDatabase: property.relation.database }
        ));
      }
    }

    // Property recommendations
    if (!property.description && ['relation', 'formula', 'rollup'].includes(property.type)) {
      suggestions.push(`Complex property '${propName}' in '${dbName}' should have a description`);
    }
  }

  private static validateIndexes(
    dbName: string,
    indexes: NonNullable<SchemaDatabase['indexes']>,
    properties: Record<string, SchemaProperty>,
    errors: ValidationError[],
    warnings: string[],
    suggestions: string[]
  ): void {
    const propertyNames = Object.keys(properties);

    for (const index of indexes) {
      if (!index.columns || index.columns.length === 0) {
        errors.push(new ValidationError(
          `Index in database '${dbName}' must specify columns`,
          { database: dbName }
        ));
        continue;
      }

      // Validate column names
      for (const column of index.columns) {
        if (!propertyNames.includes(column)) {
          errors.push(new ValidationError(
            `Index references unknown property '${column}' in database '${dbName}'`,
            { database: dbName, property: column }
          ));
        }
      }

      // Single column indexes recommendation
      if (index.columns.length === 1) {
        const property = properties[index.columns[0]];
        if (property && ['title', 'select', 'checkbox'].includes(property.type)) {
          suggestions.push(`Single column index on '${index.columns[0]}' in '${dbName}' may not improve performance significantly`);
        }
      }
    }
  }

  private static validateConstraints(
    dbName: string,
    constraints: NonNullable<SchemaDatabase['constraints']>,
    properties: Record<string, SchemaProperty>,
    allDatabaseNames: string[],
    errors: ValidationError[],
    warnings: string[]
  ): void {
    const propertyNames = Object.keys(properties);

    for (const constraint of constraints) {
      // Validate column references
      for (const column of constraint.columns) {
        if (!propertyNames.includes(column)) {
          errors.push(new ValidationError(
            `Constraint references unknown property '${column}' in database '${dbName}'`,
            { database: dbName, property: column }
          ));
        }
      }

      // Type-specific validation
      if (constraint.type === 'foreign_key') {
        if (!constraint.reference) {
          errors.push(new ValidationError(
            `Foreign key constraint in database '${dbName}' must specify reference`,
            { database: dbName }
          ));
        } else if (!allDatabaseNames.includes(constraint.reference.database)) {
          errors.push(new ValidationError(
            `Foreign key references unknown database '${constraint.reference.database}'`,
            { database: dbName, targetDatabase: constraint.reference.database }
          ));
        }
      }

      if (constraint.type === 'check' && !constraint.expression) {
        errors.push(new ValidationError(
          `Check constraint in database '${dbName}' must have an expression`,
          { database: dbName }
        ));
      }
    }
  }

  private static validateRelationships(
    relationships: NonNullable<SchemaValidationConfig['relationships']>,
    databases: Record<string, SchemaDatabase>,
    errors: ValidationError[],
    warnings: string[]
  ): void {
    const databaseNames = Object.keys(databases);

    for (const relationship of relationships) {
      // Validate database references
      if (!databaseNames.includes(relationship.from.database)) {
        errors.push(new ValidationError(
          `Relationship references unknown database '${relationship.from.database}'`,
          { database: relationship.from.database }
        ));
      }

      if (!databaseNames.includes(relationship.to.database)) {
        errors.push(new ValidationError(
          `Relationship references unknown database '${relationship.to.database}'`,
          { database: relationship.to.database }
        ));
      }

      // Validate property references
      const fromDb = databases[relationship.from.database];
      if (fromDb && !fromDb.properties[relationship.from.property]) {
        errors.push(new ValidationError(
          `Relationship references unknown property '${relationship.from.property}' in database '${relationship.from.database}'`,
          { database: relationship.from.database, property: relationship.from.property }
        ));
      }

      const toDb = databases[relationship.to.database];
      if (toDb && !toDb.properties[relationship.to.property]) {
        errors.push(new ValidationError(
          `Relationship references unknown property '${relationship.to.property}' in database '${relationship.to.database}'`,
          { database: relationship.to.database, property: relationship.to.property }
        ));
      }
    }
  }

  private static calculateComplexity(schemas: SchemaValidationConfig): 'simple' | 'moderate' | 'complex' {
    const dbCount = Object.keys(schemas.databases).length;
    const totalProperties = Object.values(schemas.databases).reduce((acc, db) => acc + Object.keys(db.properties).length, 0);
    const relationshipCount = schemas.relationships?.length || 0;
    
    const complexProperties = Object.values(schemas.databases).reduce((acc, db) => {
      return acc + Object.values(db.properties).filter(prop => 
        ['formula', 'rollup', 'relation'].includes(prop.type)
      ).length;
    }, 0);

    if (dbCount <= 3 && totalProperties <= 20 && relationshipCount <= 5 && complexProperties <= 3) {
      return 'simple';
    }

    if (dbCount <= 10 && totalProperties <= 100 && relationshipCount <= 20 && complexProperties <= 15) {
      return 'moderate';
    }

    return 'complex';
  }

  private static generateSuggestions(schemas: SchemaValidationConfig, suggestions: string[]): void {
    const dbCount = Object.keys(schemas.databases).length;
    
    if (dbCount > 10) {
      suggestions.push('Consider breaking down large schema into multiple smaller schemas for better maintainability');
    }

    const hasDocumentationDb = Object.keys(schemas.databases).some(name => 
      name.toLowerCase().includes('doc') || name.toLowerCase().includes('note')
    );
    
    if (!hasDocumentationDb && dbCount > 3) {
      suggestions.push('Consider adding a documentation database to track project documentation');
    }

    if (!schemas.relationships || schemas.relationships.length === 0) {
      suggestions.push('Consider adding explicit relationships to improve data integrity');
    }
  }

  private static isValidIdentifier(name: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) && name.length <= 100;
  }

  /**
   * Validate individual property configuration
   */
  static validateSingleProperty(property: SchemaProperty): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      const validator = this.PROPERTY_TYPE_VALIDATIONS[property.type];
      if (validator) {
        const typeErrors = validator(property);
        typeErrors.forEach(error => {
          errors.push(new ValidationError(`Property validation: ${error}`));
        });
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        suggestions,
        metadata: {
          totalDatabases: 0,
          totalProperties: 1,
          totalRelationships: 0,
          complexity: 'simple'
        }
      };
    } catch (error) {
      errors.push(new ValidationError(
        `Property validation failed: ${error}`,
        { error: error instanceof Error ? error.message : String(error) }
      ));

      return {
        valid: false,
        errors,
        warnings,
        suggestions,
        metadata: {
          totalDatabases: 0,
          totalProperties: 1,
          totalRelationships: 0,
          complexity: 'simple'
        }
      };
    }
  }

  /**
   * Create schema template
   */
  static createSchemaTemplate(projectName: string = 'My Project'): SchemaValidationConfig {
    return {
      $schema: 'https://schemas.deplink.dev/v1/database-schema.json',
      version: '1.0.0',
      title: `${projectName} Schema`,
      description: `Database schema for ${projectName}`,
      author: 'Dependency Linker',
      created: new Date().toISOString(),
      databases: {
        files: {
          title: 'Project Files',
          description: 'Track project files and their metadata',
          icon: '📁',
          properties: {
            name: {
              type: 'title',
              required: true,
              description: 'File name and path'
            },
            path: {
              type: 'rich_text',
              required: true,
              description: 'Full file path'
            },
            extension: {
              type: 'select',
              options: [
                { name: '.ts', color: 'blue' },
                { name: '.js', color: 'yellow' },
                { name: '.tsx', color: 'blue' },
                { name: '.jsx', color: 'yellow' },
                { name: '.md', color: 'gray' }
              ],
              description: 'File extension'
            },
            size: {
              type: 'number',
              description: 'File size in bytes'
            },
            modified: {
              type: 'date',
              description: 'Last modification date'
            },
            dependencies: {
              type: 'relation',
              relation: {
                database: 'dependencies'
              },
              description: 'File dependencies'
            }
          }
        },
        dependencies: {
          title: 'Dependencies',
          description: 'Track dependencies between files',
          icon: '🔗',
          properties: {
            name: {
              type: 'title',
              required: true,
              description: 'Dependency relationship name'
            },
            source: {
              type: 'relation',
              relation: {
                database: 'files'
              },
              description: 'Source file'
            },
            target: {
              type: 'relation',
              relation: {
                database: 'files'
              },
              description: 'Target file'
            },
            type: {
              type: 'select',
              options: [
                { name: 'import', color: 'green' },
                { name: 'require', color: 'blue' },
                { name: 'reference', color: 'orange' }
              ],
              description: 'Dependency type'
            }
          }
        }
      },
      relationships: [
        {
          from: { database: 'files', property: 'dependencies' },
          to: { database: 'dependencies', property: 'source' },
          type: 'one_to_many',
          description: 'Files can have multiple dependencies'
        }
      ]
    };
  }
}