/**
 * Node Identifier System Tests
 * 노드 식별자 시스템의 고유성과 재현성 테스트
 */

import { createNodeIdentifier } from '../../src/database/core/NodeIdentifier';
import type { NodeContext, NodeLocation } from '../../src/database/core/NodeIdentifier';

describe('NodeIdentifier System', () => {
  const projectRoot = '/test/project';
  let identifier: ReturnType<typeof createNodeIdentifier>;

  beforeEach(() => {
    identifier = createNodeIdentifier(projectRoot);
  });

  describe('File Node Identification', () => {
    test('should create consistent file identifiers', () => {
      const context: NodeContext = {
        sourceFile: '/test/project/src/App.tsx',
        language: 'tsx',
        projectRoot,
      };

      const id1 = identifier.createIdentifier('file', 'App.tsx', context);
      const id2 = identifier.createIdentifier('file', 'App.tsx', context);

      expect(id1).toBe(id2);
      expect(id1).toBe('file#src/App.tsx');
    });

    test('should handle different file paths correctly', () => {
      const contexts = [
        {
          sourceFile: '/test/project/src/components/Button.tsx',
          language: 'tsx' as const,
          projectRoot,
        },
        {
          sourceFile: '/test/project/src/utils/helpers.ts',
          language: 'typescript' as const,
          projectRoot,
        },
        {
          sourceFile: '/test/project/lib/external.js',
          language: 'javascript' as const,
          projectRoot,
        },
      ];

      const ids = contexts.map(ctx =>
        identifier.createIdentifier('file', ctx.sourceFile.split('/').pop()!, ctx)
      );

      expect(ids[0]).toBe('file#src/components/Button.tsx');
      expect(ids[1]).toBe('file#src/utils/helpers.ts');
      expect(ids[2]).toBe('file#lib/external.js');

      // 모든 ID가 유니크한지 확인
      expect(new Set(ids).size).toBe(ids.length);
    });

    test('should normalize paths consistently', () => {
      const context1: NodeContext = {
        sourceFile: '/test/project/src/App.tsx',
        language: 'tsx',
        projectRoot: '/test/project',
      };

      const context2: NodeContext = {
        sourceFile: '/test/project/src/App.tsx',
        language: 'tsx',
        projectRoot: '/test/project/',
      };

      const context3: NodeContext = {
        sourceFile: '\\test\\project\\src\\App.tsx',
        language: 'tsx',
        projectRoot: '\\test\\project\\',
      };

      const id1 = identifier.createIdentifier('file', 'App.tsx', context1);
      const id2 = identifier.createIdentifier('file', 'App.tsx', context2);
      const id3 = identifier.createIdentifier('file', 'App.tsx', context3);

      expect(id1).toBe(id2);
      expect(id2).toBe(id3);
    });
  });

  describe('Class and Interface Identification', () => {
    test('should create unique class identifiers with location', () => {
      const context: NodeContext = {
        sourceFile: '/test/project/src/models/User.ts',
        language: 'typescript',
        projectRoot,
      };

      const location: NodeLocation = {
        startLine: 10,
        startColumn: 0,
        endLine: 50,
        endColumn: 1,
      };

      const classId = identifier.createIdentifier('class', 'User', context, location);
      expect(classId).toBe('class#src/models/User.ts::User@10:0');

      // 다른 위치의 같은 이름 클래스
      const location2: NodeLocation = {
        startLine: 60,
        startColumn: 0,
        endLine: 80,
        endColumn: 1,
      };

      const classId2 = identifier.createIdentifier('class', 'User', context, location2);
      expect(classId2).toBe('class#src/models/User.ts::User@60:0');

      expect(classId).not.toBe(classId2);
    });

    test('should handle interface identifiers', () => {
      const context: NodeContext = {
        sourceFile: '/test/project/src/types/api.ts',
        language: 'typescript',
        projectRoot,
      };

      const interfaceId = identifier.createIdentifier('interface', 'ApiResponse', context);
      expect(interfaceId).toBe('interface#src/types/api.ts::ApiResponse');
    });
  });

  describe('Function and Method Identification', () => {
    test('should create function identifiers with parameters', () => {
      const context: NodeContext = {
        sourceFile: '/test/project/src/utils/math.ts',
        language: 'typescript',
        projectRoot,
      };

      const metadata = {
        parameters: [
          { name: 'a', type: 'number' },
          { name: 'b', type: 'number' },
        ],
        returnType: 'number',
      };

      const location: NodeLocation = {
        startLine: 5,
        startColumn: 0,
      };

      const functionId = identifier.createIdentifier('function', 'add', context, location, metadata);
      expect(functionId).toBe('function#src/utils/math.ts::add(number,number)@5:0');

      // 다른 시그니처의 오버로드 함수
      const metadata2 = {
        parameters: [
          { name: 'a', type: 'string' },
          { name: 'b', type: 'string' },
        ],
        returnType: 'string',
      };

      const functionId2 = identifier.createIdentifier('function', 'add', context, location, metadata2);
      expect(functionId2).toBe('function#src/utils/math.ts::add(string,string)@5:0');

      expect(functionId).not.toBe(functionId2);
    });

    test('should handle method identifiers', () => {
      const context: NodeContext = {
        sourceFile: '/test/project/src/services/UserService.ts',
        language: 'typescript',
        projectRoot,
      };

      const location: NodeLocation = {
        startLine: 15,
        startColumn: 2,
      };

      const methodId = identifier.createIdentifier('method', 'getUser', context, location);
      expect(methodId).toBe('method#src/services/UserService.ts::getUser()@15:2');
    });
  });

  describe('Variable and Property Identification', () => {
    test('should create variable identifiers with scope', () => {
      const context: NodeContext = {
        sourceFile: '/test/project/src/config/database.ts',
        language: 'typescript',
        projectRoot,
      };

      const metadata = {
        type: 'string',
        scope: 'global',
        isConst: true,
      };

      const location: NodeLocation = {
        startLine: 3,
        startColumn: 0,
      };

      const variableId = identifier.createIdentifier('constant', 'DATABASE_URL', context, location, metadata);
      expect(variableId).toBe('constant#src/config/database.ts::global.DATABASE_URL@3:0');

      // 다른 스코프의 같은 이름 변수
      const metadata2 = {
        type: 'string',
        scope: 'function',
        isConst: false,
      };

      const location2: NodeLocation = {
        startLine: 10,
        startColumn: 4,
      };

      const variableId2 = identifier.createIdentifier('variable', 'DATABASE_URL', context, location2, metadata2);
      expect(variableId2).toBe('variable#src/config/database.ts::function.DATABASE_URL@10:4');

      expect(variableId).not.toBe(variableId2);
    });

    test('should handle property identifiers', () => {
      const context: NodeContext = {
        sourceFile: '/test/project/src/models/User.ts',
        language: 'typescript',
        projectRoot,
      };

      const metadata = {
        type: 'string',
        modifiers: ['private'],
      };

      const location: NodeLocation = {
        startLine: 12,
        startColumn: 2,
      };

      const propertyId = identifier.createIdentifier('property', 'email', context, location, metadata);
      expect(propertyId).toBe('property#src/models/User.ts::unknown.email@12:2');
    });
  });

  describe('Import and Export Identification', () => {
    test('should create unique import identifiers', () => {
      const context: NodeContext = {
        sourceFile: '/test/project/src/App.tsx',
        language: 'tsx',
        projectRoot,
      };

      const metadata = {
        importPath: './components/Button',
        isDefault: false,
        isNamespace: false,
      };

      const importId = identifier.createIdentifier('import', 'Button', context, undefined, metadata);
      expect(importId).toMatch(/^import#src\/App\.tsx::\.\/components\/Button@[a-f0-9]{8}$/);

      // 같은 import는 같은 ID 생성
      const importId2 = identifier.createIdentifier('import', 'Button', context, undefined, metadata);
      expect(importId).toBe(importId2);

      // 다른 import path
      const metadata2 = {
        importPath: './components/Input',
        isDefault: false,
        isNamespace: false,
      };

      const importId3 = identifier.createIdentifier('import', 'Input', context, undefined, metadata2);
      expect(importId3).not.toBe(importId);
    });

    test('should create export identifiers', () => {
      const context: NodeContext = {
        sourceFile: '/test/project/src/components/Button.tsx',
        language: 'tsx',
        projectRoot,
      };

      const defaultExportId = identifier.createIdentifier('export', 'Button', context, undefined, { isDefault: true });
      expect(defaultExportId).toBe('export#src/components/Button.tsx::default.Button');

      const namedExportId = identifier.createIdentifier('export', 'ButtonProps', context, undefined, { isDefault: false });
      expect(namedExportId).toBe('export#src/components/Button.tsx::named.ButtonProps');

      expect(defaultExportId).not.toBe(namedExportId);
    });
  });

  describe('External Library Identification', () => {
    test('should create library identifiers', () => {
      const context: NodeContext = {
        sourceFile: 'react',
        language: 'typescript',
        projectRoot,
      };

      const reactId = identifier.createIdentifier('library', 'react', context);
      expect(reactId).toBe('lib#react');

      const lodashId = identifier.createIdentifier('library', 'lodash', context);
      expect(lodashId).toBe('lib#lodash');

      expect(reactId).not.toBe(lodashId);
    });

    test('should create package identifiers', () => {
      const context: NodeContext = {
        sourceFile: '@types/node',
        language: 'typescript',
        projectRoot,
      };

      const packageId = identifier.createIdentifier('package', '@types/node', context);
      expect(packageId).toBe('pkg#@types/node');
    });
  });

  describe('Identifier Parsing and Validation', () => {
    test('should parse file identifiers correctly', () => {
      const fileId = 'file#src/App.tsx';
      const parsed = identifier.parseIdentifier(fileId);

      expect(parsed).toMatchObject({
        type: 'file',
        name: 'App.tsx',
        context: {
          sourceFile: 'src/App.tsx',
          language: 'tsx',
          projectRoot,
        },
      });
    });

    test('should parse class identifiers correctly', () => {
      const classId = 'class#src/models/User.ts::User@10:0';
      const parsed = identifier.parseIdentifier(classId);

      expect(parsed).toMatchObject({
        type: 'class',
        name: 'User',
        context: {
          sourceFile: 'src/models/User.ts',
          language: 'typescript',
          projectRoot,
        },
      });
    });

    test('should parse library identifiers correctly', () => {
      const libId = 'lib#react';
      const parsed = identifier.parseIdentifier(libId);

      expect(parsed).toMatchObject({
        type: 'library',
        name: 'react',
      });
    });

    test('should validate identifiers', () => {
      const validIds = [
        'file#src/App.tsx',
        'class#src/models/User.ts::User@10:0',
        'function#src/utils/math.ts::add(number,number)@5:0',
        'lib#react',
        'pkg#@types/node',
      ];

      const invalidIds = [
        'invalid',
        'file',
        'file#',
        'unknown#src/App.tsx',
      ];

      validIds.forEach(id => {
        expect(identifier.validateIdentifier(id)).toBe(true);
      });

      invalidIds.forEach(id => {
        expect(identifier.validateIdentifier(id)).toBe(false);
      });
    });

    test('should check node relatedness', () => {
      const sameFileIds = [
        'class#src/models/User.ts::User@10:0',
        'method#src/models/User.ts::getEmail()@15:2',
        'property#src/models/User.ts::unknown.email@12:2',
      ];

      const differentFileIds = [
        'file#src/App.tsx',
        'file#src/components/Button.tsx',
      ];

      // 같은 파일 내 엔티티들은 관련있음
      expect(identifier.areRelated(sameFileIds[0], sameFileIds[1])).toBe(true);
      expect(identifier.areRelated(sameFileIds[1], sameFileIds[2])).toBe(true);

      // 다른 파일의 엔티티들은 관련없음
      expect(identifier.areRelated(differentFileIds[0], differentFileIds[1])).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle missing location gracefully', () => {
      const context: NodeContext = {
        sourceFile: '/test/project/src/App.tsx',
        language: 'tsx',
        projectRoot,
      };

      const classId = identifier.createIdentifier('class', 'App', context);
      expect(classId).toBe('class#src/App.tsx::App');
    });

    test('should handle missing metadata gracefully', () => {
      const context: NodeContext = {
        sourceFile: '/test/project/src/utils/helpers.ts',
        language: 'typescript',
        projectRoot,
      };

      const functionId = identifier.createIdentifier('function', 'helper', context);
      expect(functionId).toBe('function#src/utils/helpers.ts::helper()');
    });

    test('should handle invalid parsing gracefully', () => {
      const invalidIds = [
        '',
        'invalid',
        'file',
        'file#',
        '#src/App.tsx',
      ];

      invalidIds.forEach(id => {
        expect(identifier.parseIdentifier(id)).toBeNull();
      });
    });

    test('should ensure uniqueness across different node types', () => {
      const context: NodeContext = {
        sourceFile: '/test/project/src/test.ts',
        language: 'typescript',
        projectRoot,
      };

      const location: NodeLocation = {
        startLine: 10,
        startColumn: 0,
      };

      const classId = identifier.createIdentifier('class', 'Test', context, location);
      const functionId = identifier.createIdentifier('function', 'Test', context, location);
      const variableId = identifier.createIdentifier('variable', 'Test', context, location);

      const ids = [classId, functionId, variableId];
      expect(new Set(ids).size).toBe(ids.length); // 모두 다른 ID
    });

    test('should maintain consistency across recreations', () => {
      const context: NodeContext = {
        sourceFile: '/test/project/src/App.tsx',
        language: 'tsx',
        projectRoot,
      };

      const location: NodeLocation = {
        startLine: 5,
        startColumn: 0,
      };

      const metadata = {
        parameters: [{ name: 'props', type: 'AppProps' }],
        returnType: 'JSX.Element',
      };

      // 여러 번 생성해도 같은 ID
      const ids = Array.from({ length: 10 }, () =>
        identifier.createIdentifier('function', 'App', context, location, metadata)
      );

      expect(new Set(ids).size).toBe(1); // 모두 같은 ID
    });
  });
});