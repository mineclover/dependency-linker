/**
 * Enhanced Export Analysis Example
 *
 * This example demonstrates the enhanced export extraction capabilities
 * showing how different types of exports are classified and collected.
 */

import { EnhancedExportExtractor } from '../src/extractors/EnhancedExportExtractor';
import { TypeScriptParser } from '../src/parsers/TypeScriptParser';

async function demonstrateExportAnalysis() {
  // Sample TypeScript code with various export types
  const sampleCode = `
// 1. Function exports
export function getUserData(id: string): Promise<User> {
  return fetch(\`/api/users/\${id}\`);
}

export async function saveUserData(user: User): Promise<void> {
  await fetch('/api/users', { method: 'POST', body: JSON.stringify(user) });
}

// 2. Variable exports
export const API_BASE_URL = 'https://api.example.com';
export let currentUser: User | null = null;
export var debugMode = false;

// 3. Type exports
export interface User {
  id: string;
  name: string;
  email: string;
}

export type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};

// 4. Class export with methods and properties
export class UserService {
  private apiUrl: string = API_BASE_URL;
  public static instance: UserService;

  constructor(baseUrl?: string) {
    if (baseUrl) {
      this.apiUrl = baseUrl;
    }
  }

  public async getUser(id: string): Promise<User> {
    const response = await fetch(\`\${this.apiUrl}/users/\${id}\`);
    return response.json();
  }

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  private validateUser(user: User): boolean {
    return user.id !== '' && user.email.includes('@');
  }

  protected logActivity(action: string): void {
    console.log(`User action: ${action}`);
  }
}

// 5. Default export
export default class DefaultUserService extends UserService {
  constructor() {
    super();
  }

  public getDefaultUser(): User {
    return { id: 'default', name: 'Default User', email: 'default@example.com' };
  }
}

// 6. Re-exports
export { ValidationError, ApiError } from './errors';
export * from './types';
`;

  console.log('🔍 Enhanced Export Analysis Demo');
  console.log('================================\n');

  try {
    // Initialize parser and extractor
    const parser = new TypeScriptParser();
    const extractor = new EnhancedExportExtractor();

    // Parse the sample code
    const parseResult = await parser.parse('/example.ts', sampleCode);

    if (!parseResult.success) {
      console.error('❌ Failed to parse code:', parseResult.error);
      return;
    }

    // Extract enhanced export information
    const exportResult = extractor.extractExports(parseResult.ast, '/example.ts');

    // Display results
    console.log('📊 **Export Statistics:**');
    console.log(`  Total Exports: ${exportResult.statistics.totalExports}`);
    console.log(`  Functions: ${exportResult.statistics.functionExports}`);
    console.log(`  Classes: ${exportResult.statistics.classExports}`);
    console.log(`  Variables: ${exportResult.statistics.variableExports}`);
    console.log(`  Types: ${exportResult.statistics.typeExports}`);
    console.log(`  Default Exports: ${exportResult.statistics.defaultExports}`);
    console.log(`  Class Methods: ${exportResult.statistics.classMethodsExports}`);
    console.log(`  Class Properties: ${exportResult.statistics.classPropertiesExports}\n`);

    console.log('📋 **Detailed Export Information:**\n');

    // Group exports by type for better visualization
    const exportsByType = groupExportsByType(exportResult.exportMethods);

    // Display Functions
    if (exportsByType.function.length > 0) {
      console.log('🔧 **Functions:**');
      exportsByType.function.forEach(exp => {
        const params = exp.parameters?.map(p => `${p.name}${p.optional ? '?' : ''}`).join(', ') || '';
        const asyncLabel = exp.isAsync ? '[ASYNC] ' : '';
        console.log(`  - ${asyncLabel}${exp.name}(${params}) at line ${exp.location.line}`);
      });
      console.log();
    }

    // Display Classes
    if (exportsByType.class.length > 0) {
      console.log('🏗️ **Classes:**');
      exportsByType.class.forEach(exp => {
        console.log(`  - ${exp.name} at line ${exp.location.line}`);
      });
      console.log();
    }

    // Display Variables
    if (exportsByType.variable.length > 0) {
      console.log('📦 **Variables:**');
      exportsByType.variable.forEach(exp => {
        console.log(`  - ${exp.name} at line ${exp.location.line}`);
      });
      console.log();
    }

    // Display Class Methods (detailed)
    if (exportsByType.class_method.length > 0) {
      console.log('⚙️ **Class Methods:**');
      exportsByType.class_method.forEach(exp => {
        const visibility = exp.visibility || 'public';
        const staticLabel = exp.isStatic ? '[STATIC] ' : '';
        const asyncLabel = exp.isAsync ? '[ASYNC] ' : '';
        const params = exp.parameters?.map(p => `${p.name}${p.optional ? '?' : ''}`).join(', ') || '';

        console.log(`  - ${staticLabel}${asyncLabel}[${visibility.toUpperCase()}] ${exp.parentClass}::${exp.name}(${params}) at line ${exp.location.line}`);
      });
      console.log();
    }

    // Display Class Properties
    if (exportsByType.class_property.length > 0) {
      console.log('🔧 **Class Properties:**');
      exportsByType.class_property.forEach(exp => {
        const visibility = exp.visibility || 'public';
        const staticLabel = exp.isStatic ? '[STATIC] ' : '';

        console.log(`  - ${staticLabel}[${visibility.toUpperCase()}] ${exp.parentClass}::${exp.name} at line ${exp.location.line}`);
      });
      console.log();
    }

    // Display Default Exports
    if (exportsByType.default.length > 0) {
      console.log('⭐ **Default Exports:**');
      exportsByType.default.forEach(exp => {
        console.log(`  - ${exp.name} at line ${exp.location.line}`);
      });
      console.log();
    }

    // Display Re-exports
    if (exportsByType.re_export.length > 0) {
      console.log('🔄 **Re-exports:**');
      exportsByType.re_export.forEach(exp => {
        console.log(`  - ${exp.name} at line ${exp.location.line}`);
      });
      console.log();
    }

    console.log('🎯 **Class Details:**\n');
    exportResult.classes.forEach(cls => {
      console.log(`📁 Class: ${cls.className}`);
      console.log(`   Location: Line ${cls.location.line}`);
      console.log(`   Methods: ${cls.methods.length}`);
      console.log(`   Properties: ${cls.properties.length}`);

      if (cls.superClass) {
        console.log(`   Extends: ${cls.superClass}`);
      }

      if (cls.methods.length > 0) {
        console.log('   Methods:');
        cls.methods.forEach(method => {
          const visibility = method.visibility;
          const staticLabel = method.isStatic ? '[STATIC] ' : '';
          const asyncLabel = method.isAsync ? '[ASYNC] ' : '';
          const params = method.parameters.map(p => `${p.name}${p.optional ? '?' : ''}`).join(', ');

          console.log(`     - ${staticLabel}${asyncLabel}[${visibility.toUpperCase()}] ${method.name}(${params})`);
        });
      }

      if (cls.properties.length > 0) {
        console.log('   Properties:');
        cls.properties.forEach(prop => {
          const visibility = prop.visibility;
          const staticLabel = prop.isStatic ? '[STATIC] ' : '';
          const type = prop.type ? `: ${prop.type}` : '';

          console.log(`     - ${staticLabel}[${visibility.toUpperCase()}] ${prop.name}${type}`);
        });
      }

      console.log();
    });

  } catch (error) {
    console.error('❌ Error during export analysis:', error);
  }
}

// Helper function to group exports by type
function groupExportsByType(exportMethods: any[]) {
  const groups: { [key: string]: any[] } = {
    function: [],
    class: [],
    variable: [],
    type: [],
    default: [],
    class_method: [],
    class_property: [],
    re_export: []
  };

  exportMethods.forEach(exp => {
    if (groups[exp.exportType]) {
      groups[exp.exportType].push(exp);
    }
  });

  return groups;
}

// Expected output format:
console.log(`
📋 **Expected Output Format:**

{
  "exportMethods": [
    {
      "name": "getUserData",
      "exportType": "function",
      "declarationType": "named_export",
      "location": { "line": 4, "column": 0 },
      "isAsync": false,
      "parameters": [{"name": "id", "optional": false}],
      "returnType": "Promise<User>"
    },
    {
      "name": "UserService",
      "exportType": "class",
      "declarationType": "named_export",
      "location": { "line": 25, "column": 0 }
    },
    {
      "name": "getUser",
      "exportType": "class_method",
      "declarationType": "class_member",
      "location": { "line": 32, "column": 2 },
      "parentClass": "UserService",
      "isAsync": true,
      "isStatic": false,
      "visibility": "public",
      "parameters": [{"name": "id", "optional": false}]
    },
    {
      "name": "apiUrl",
      "exportType": "class_property",
      "declarationType": "class_member",
      "location": { "line": 26, "column": 2 },
      "parentClass": "UserService",
      "isStatic": false,
      "visibility": "private"
    }
  ],
  "statistics": {
    "totalExports": 15,
    "functionExports": 2,
    "classExports": 2,
    "variableExports": 3,
    "typeExports": 2,
    "defaultExports": 1,
    "classMethodsExports": 4,
    "classPropertiesExports": 1
  },
  "classes": [
    {
      "className": "UserService",
      "location": { "line": 25, "column": 0 },
      "methods": [
        {
          "name": "getUser",
          "isStatic": false,
          "isAsync": true,
          "visibility": "public",
          "parameters": [{"name": "id", "optional": false}],
          "location": { "line": 32, "column": 2 }
        }
      ],
      "properties": [
        {
          "name": "apiUrl",
          "isStatic": false,
          "visibility": "private",
          "type": "string",
          "location": { "line": 26, "column": 2 }
        }
      ],
      "isDefaultExport": false
    }
  ]
}
`);

// Run the demo
demonstrateExportAnalysis();