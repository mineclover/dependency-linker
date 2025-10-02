/**
 * File Dependency Analyzer Tests
 * 파일 기반 의존성 분석 시스템 테스트
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { GraphDatabase } from '../../src/database/GraphDatabase';
import {
  FileDependencyAnalyzer,
  ImportSource,
  DependencyAnalysisResult
} from '../../src/database/services/FileDependencyAnalyzer';
import {
  runFileDependencyAnalysisExample,
  simulateFileUpdate,
  getSampleImportData
} from '../../src/database/examples/FileDependencyExample';
import { join } from 'path';
import { tmpdir } from 'os';
import { unlink } from 'fs/promises';

describe('FileDependencyAnalyzer', () => {
  let database: GraphDatabase;
  let analyzer: FileDependencyAnalyzer;
  let dbPath: string;
  const projectRoot = '/test-project';

  beforeEach(async () => {
    dbPath = join(tmpdir(), `test-file-dep-${Date.now()}.db`);
    database = new GraphDatabase(dbPath);
    await database.initialize();
    analyzer = new FileDependencyAnalyzer(database, projectRoot);
  });

  afterEach(async () => {
    await database.close();
    try {
      await unlink(dbPath);
    } catch (error) {
      // 파일이 없으면 무시
    }
  });

  describe('Basic File Analysis', () => {
    it('should analyze a simple file with library imports', async () => {
      const importSources: ImportSource[] = [
        {
          type: 'library',
          source: 'react',
          imports: [
            { name: 'React', isDefault: true, isNamespace: false },
            { name: 'useState', isDefault: false, isNamespace: false }
          ],
          location: { line: 1, column: 1 }
        },
        {
          type: 'library',
          source: 'lodash',
          imports: [
            { name: 'map', isDefault: false, isNamespace: false }
          ],
          location: { line: 2, column: 1 }
        }
      ];

      const result = await analyzer.analyzeFile(
        '/src/App.tsx',
        'typescript',
        importSources
      );

      expect(result.sourceFile).toBe('/src/App.tsx');
      expect(result.createdNodes).toHaveLength(3); // App.tsx + react + lodash
      expect(result.createdRelationships).toHaveLength(2); // App -> react, App -> lodash
      expect(result.stats.totalImports).toBe(2);
      expect(result.stats.libraryImports).toBe(2);
      expect(result.stats.relativeImports).toBe(0);
      expect(result.missingLinks).toHaveLength(0);
    });

    it('should analyze file with relative imports', async () => {
      const importSources: ImportSource[] = [
        {
          type: 'relative',
          source: './components/Header',
          imports: [
            { name: 'Header', isDefault: true, isNamespace: false }
          ],
          location: { line: 1, column: 1 }
        },
        {
          type: 'relative',
          source: '../utils/helpers',
          imports: [
            { name: 'formatDate', isDefault: false, isNamespace: false }
          ],
          location: { line: 2, column: 1 }
        }
      ];

      const result = await analyzer.analyzeFile(
        '/src/pages/Home.tsx',
        'typescript',
        importSources
      );

      expect(result.sourceFile).toBe('/src/pages/Home.tsx');
      expect(result.createdNodes).toHaveLength(3); // Home.tsx + Header + helpers
      expect(result.createdRelationships).toHaveLength(2);
      expect(result.stats.relativeImports).toBe(2);
      expect(result.stats.libraryImports).toBe(0);

      // 파일들이 존재하지 않으므로 미싱 링크 발생
      expect(result.missingLinks).toHaveLength(2);
      expect(result.missingLinks[0].type).toBe('file_not_found');
    });

    it('should handle absolute imports', async () => {
      const importSources: ImportSource[] = [
        {
          type: 'absolute',
          source: '@/types/user',
          imports: [
            { name: 'User', isDefault: false, isNamespace: false },
            { name: 'UserPreferences', isDefault: false, isNamespace: false }
          ],
          location: { line: 1, column: 1 }
        }
      ];

      const result = await analyzer.analyzeFile(
        '/src/components/UserProfile.tsx',
        'typescript',
        importSources
      );

      expect(result.createdNodes).toHaveLength(2);
      expect(result.createdRelationships).toHaveLength(1);
      expect(result.stats.relativeImports).toBe(1); // absolute는 relative로 카운트됨
    });
  });

  describe('File Dependency Cleanup', () => {
    it('should clean up existing dependencies when re-analyzing file', async () => {
      // 1. 첫 번째 분석
      const originalImports: ImportSource[] = [
        {
          type: 'library',
          source: 'react',
          imports: [{ name: 'React', isDefault: true, isNamespace: false }],
          location: { line: 1, column: 1 }
        },
        {
          type: 'relative',
          source: './OldComponent',
          imports: [{ name: 'OldComponent', isDefault: true, isNamespace: false }],
          location: { line: 2, column: 1 }
        }
      ];

      await analyzer.analyzeFile('/src/Test.tsx', 'typescript', originalImports);

      // 첫 번째 분석 후 관계 확인
      const firstRelationships = await database.findRelationships({
        relationshipTypes: ['imports_library', 'imports_file']
      });
      expect(firstRelationships.length).toBeGreaterThan(0);

      // 2. 두 번째 분석 (다른 imports)
      const newImports: ImportSource[] = [
        {
          type: 'library',
          source: 'react',
          imports: [{ name: 'React', isDefault: true, isNamespace: false }],
          location: { line: 1, column: 1 }
        },
        {
          type: 'relative',
          source: './NewComponent',
          imports: [{ name: 'NewComponent', isDefault: true, isNamespace: false }],
          location: { line: 2, column: 1 }
        }
      ];

      const result = await analyzer.analyzeFile('/src/Test.tsx', 'typescript', newImports);

      // 새로운 분석 결과 확인
      expect(result.createdRelationships).toHaveLength(2);
      expect(result.stats.totalImports).toBe(2);

      // 전체 관계 수가 적절히 관리되고 있는지 확인
      const allRelationships = await database.findRelationships({});
      expect(allRelationships.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Missing Link Detection', () => {
    it('should detect missing files and create missing links', async () => {
      const importSources: ImportSource[] = [
        {
          type: 'relative',
          source: './NonExistentFile',
          imports: [{ name: 'NonExistent', isDefault: true, isNamespace: false }],
          location: { line: 1, column: 1 }
        },
        {
          type: 'relative',
          source: '../another/MissingFile',
          imports: [{ name: 'Missing', isDefault: true, isNamespace: false }],
          location: { line: 2, column: 1 }
        }
      ];

      const result = await analyzer.analyzeFile('/src/Test.tsx', 'typescript', importSources);

      expect(result.missingLinks).toHaveLength(2);

      const missingLink = result.missingLinks[0];
      expect(missingLink.from).toBe('/src/Test.tsx');
      expect(missingLink.type).toBe('file_not_found');
      expect(missingLink.originalImport.source).toBe('./NonExistentFile');
    });

    it('should query missing links for specific file', async () => {
      // 미싱 링크가 있는 파일 분석
      const importSources: ImportSource[] = [
        {
          type: 'relative',
          source: './MissingFile',
          imports: [{ name: 'Missing', isDefault: true, isNamespace: false }],
          location: { line: 1, column: 1 }
        }
      ];

      await analyzer.analyzeFile('/src/WithMissing.tsx', 'typescript', importSources);

      // 미싱 링크 조회
      const missingLinks = await analyzer.getMissingLinks('/src/WithMissing.tsx');
      expect(missingLinks.length).toBeGreaterThan(0);

      const link = missingLinks[0];
      expect(link.from).toBe('/src/WithMissing.tsx');
      expect(link.type).toBe('file_not_found');
    });
  });

  describe('Dependency Tree Generation', () => {
    it('should generate dependency tree for a file', async () => {
      // 계층적 의존성 생성
      // App.tsx -> Header.tsx -> useAuth.ts

      // useAuth.ts (리프)
      await analyzer.analyzeFile('/src/hooks/useAuth.ts', 'typescript', [
        {
          type: 'library',
          source: 'react',
          imports: [{ name: 'useState', isDefault: false, isNamespace: false }],
          location: { line: 1, column: 1 }
        }
      ]);

      // Header.tsx (useAuth 사용)
      await analyzer.analyzeFile('/src/components/Header.tsx', 'typescript', [
        {
          type: 'relative',
          source: '../hooks/useAuth',
          imports: [{ name: 'useAuth', isDefault: true, isNamespace: false }],
          location: { line: 1, column: 1 }
        }
      ]);

      // App.tsx (Header 사용)
      await analyzer.analyzeFile('/src/App.tsx', 'typescript', [
        {
          type: 'relative',
          source: './components/Header',
          imports: [{ name: 'Header', isDefault: true, isNamespace: false }],
          location: { line: 1, column: 1 }
        }
      ]);

      // 의존성 트리 생성
      const tree = await analyzer.getDependencyTree('/src/App.tsx', 3);

      expect(tree.file).toBe('/src/App.tsx');
      expect(tree.dependencies).toHaveLength(1);
      expect(tree.dependencies[0].file).toContain('Header');
    });
  });

  describe('Integration with Sample Data', () => {
    it('should work with sample import data', async () => {
      const sampleData = getSampleImportData();
      const results: DependencyAnalysisResult[] = [];

      // 샘플 데이터의 일부 파일들 분석
      const testFiles = ['/src/App.tsx', '/src/components/Header.tsx'];

      for (const filePath of testFiles) {
        if (sampleData[filePath]) {
          const result = await analyzer.analyzeFile(
            filePath,
            'typescript',
            sampleData[filePath]
          );
          results.push(result);
        }
      }

      expect(results).toHaveLength(2);

      // App.tsx 결과 확인
      const appResult = results.find(r => r.sourceFile === '/src/App.tsx');
      expect(appResult).toBeDefined();
      expect(appResult!.stats.totalImports).toBe(5);
      expect(appResult!.stats.libraryImports).toBe(2); // react, @mui/material

      // Header.tsx 결과 확인
      const headerResult = results.find(r => r.sourceFile === '/src/components/Header.tsx');
      expect(headerResult).toBeDefined();
      expect(headerResult!.stats.totalImports).toBe(4);
    });
  });

  describe('Path Resolution', () => {
    it('should resolve relative paths correctly', async () => {
      const importSources: ImportSource[] = [
        {
          type: 'relative',
          source: './sibling',
          imports: [{ name: 'Sibling', isDefault: true, isNamespace: false }],
          location: { line: 1, column: 1 }
        },
        {
          type: 'relative',
          source: '../parent/file',
          imports: [{ name: 'Parent', isDefault: true, isNamespace: false }],
          location: { line: 2, column: 1 }
        },
        {
          type: 'absolute',
          source: '@/utils/helper',
          imports: [{ name: 'helper', isDefault: true, isNamespace: false }],
          location: { line: 3, column: 1 }
        }
      ];

      const result = await analyzer.analyzeFile(
        '/src/components/Test.tsx',
        'typescript',
        importSources
      );

      // 생성된 노드들의 파일 경로 확인
      const fileNodes = result.createdNodes.filter(node => node.type === 'file');
      expect(fileNodes).toHaveLength(4); // Test.tsx + 3 imported files

      const targetNodes = fileNodes.filter(node => node.sourceFile !== '/src/components/Test.tsx');
      expect(targetNodes.some(node => node.sourceFile.includes('sibling'))).toBe(true);
      expect(targetNodes.some(node => node.sourceFile.includes('parent'))).toBe(true);
      expect(targetNodes.some(node => node.sourceFile.includes('helper'))).toBe(true);
    });
  });

  describe('Weight Calculation', () => {
    it('should calculate appropriate weights for different import types', async () => {
      const importSources: ImportSource[] = [
        {
          type: 'relative',
          source: './LocalFile',
          imports: [
            { name: 'default', isDefault: true, isNamespace: false },
            { name: 'named1', isDefault: false, isNamespace: false },
            { name: 'named2', isDefault: false, isNamespace: false }
          ],
          location: { line: 1, column: 1 }
        },
        {
          type: 'library',
          source: 'some-library',
          imports: [
            { name: 'libFunction', isDefault: false, isNamespace: false }
          ],
          location: { line: 2, column: 1 }
        },
        {
          type: 'builtin',
          source: 'fs',
          imports: [
            { name: 'readFile', isDefault: false, isNamespace: false }
          ],
          location: { line: 3, column: 1 }
        }
      ];

      const result = await analyzer.analyzeFile('/src/Test.tsx', 'typescript', importSources);

      // 관계별 가중치 확인
      const relationships = result.createdRelationships;
      expect(relationships).toHaveLength(3);

      // 상대 경로 import가 가장 높은 가중치를 가져야 함
      const relativeRel = relationships.find(rel => rel.type === 'imports_file');
      const libraryRel = relationships.find(rel =>
        rel.type === 'imports_library' && rel.label?.includes('some-library')
      );
      const builtinRel = relationships.find(rel =>
        rel.type === 'imports_library' && rel.label?.includes('fs')
      );

      expect(relativeRel?.weight).toBeGreaterThan(libraryRel?.weight || 0);
      expect(libraryRel?.weight).toBeGreaterThan(builtinRel?.weight || 0);
    });
  });
});

describe('File Dependency Examples', () => {
  let database: GraphDatabase;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = join(tmpdir(), `test-examples-${Date.now()}.db`);
    database = new GraphDatabase(dbPath);
    await database.initialize();
  });

  afterEach(async () => {
    await database.close();
    try {
      await unlink(dbPath);
    } catch (error) {
      // 파일이 없으면 무시
    }
  });

  it('should run file dependency analysis example', async () => {
    // 예제 실행 함수가 오류 없이 실행되는지 확인
    await expect(runFileDependencyAnalysisExample(database, '/test-project')).resolves.not.toThrow();

    // 분석 후 데이터베이스에 데이터가 있는지 확인
    const stats = await database.getStatistics();
    expect(stats.totalNodes).toBeGreaterThan(0);
    expect(stats.totalRelationships).toBeGreaterThan(0);
    expect(stats.nodesByType).toHaveProperty('file');
    expect(stats.nodesByType).toHaveProperty('library');
  });

  it('should simulate file update correctly', async () => {
    await expect(simulateFileUpdate(database, '/test-project')).resolves.not.toThrow();

    // 업데이트 후 통계 확인
    const stats = await database.getStatistics();
    expect(stats.totalNodes).toBeGreaterThan(0);
  });
});

describe('Database Statistics', () => {
  let database: GraphDatabase;
  let analyzer: FileDependencyAnalyzer;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = join(tmpdir(), `test-stats-${Date.now()}.db`);
    database = new GraphDatabase(dbPath);
    await database.initialize();
    analyzer = new FileDependencyAnalyzer(database, '/test-project');
  });

  afterEach(async () => {
    await database.close();
    try {
      await unlink(dbPath);
    } catch (error) {
      // 파일이 없으면 무시
    }
  });

  it('should provide accurate statistics after analysis', async () => {
    // 몇 개 파일 분석
    await analyzer.analyzeFile('/src/App.tsx', 'typescript', [
      {
        type: 'library',
        source: 'react',
        imports: [{ name: 'React', isDefault: true, isNamespace: false }],
        location: { line: 1, column: 1 }
      }
    ]);

    await analyzer.analyzeFile('/src/Utils.ts', 'typescript', [
      {
        type: 'library',
        source: 'lodash',
        imports: [{ name: 'map', isDefault: false, isNamespace: false }],
        location: { line: 1, column: 1 }
      }
    ]);

    const stats = await database.getStatistics();

    expect(stats.totalNodes).toBe(4); // App.tsx, Utils.ts, react, lodash
    expect(stats.totalRelationships).toBe(2); // App->react, Utils->lodash
    expect(stats.nodesByType.file).toBe(2);
    expect(stats.nodesByType.library).toBe(2);
    expect(stats.relationshipsByType.imports_library).toBe(2);
    expect(stats.lastUpdated).toBeDefined();
  });
});

describe('Improved Import Resolution', () => {
  let database: GraphDatabase;
  let analyzer: FileDependencyAnalyzer;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = join(tmpdir(), `test-import-resolution-${Date.now()}.db`);
    database = new GraphDatabase(dbPath);
    await database.initialize();
    analyzer = new FileDependencyAnalyzer(database, '/test-project');
  });

  afterEach(async () => {
    await database.close();
    try {
      await unlink(dbPath);
    } catch (error) {
      // 파일이 없으면 무시
    }
  });

  describe('Extension Inference', () => {
    it('should infer TypeScript extensions for imports without extensions', async () => {
      const importSources: ImportSource[] = [
        {
          type: 'relative',
          source: './utils/helper', // 확장자 없음
          imports: [{ name: 'helper', isDefault: true, isNamespace: false }],
          location: { line: 1, column: 1 }
        }
      ];

      const result = await analyzer.analyzeFile(
        '/src/components/App.ts', // .ts 파일로 변경
        'typescript',
        importSources
      );

      // 미싱 링크가 생성되어야 하며, 진단 정보가 있어야 함
      expect(result.missingLinks).toHaveLength(1);
      const missingLink = result.missingLinks[0];

      expect(missingLink.diagnostic).toBeDefined();
      expect(missingLink.diagnostic?.attemptedPaths).toBeDefined();
      expect(missingLink.diagnostic?.expectedExtensions).toContain('.ts');
      expect(missingLink.diagnostic?.expectedExtensions).toContain('.d.ts');
    });

    it('should infer JavaScript extensions for JS files', async () => {
      const importSources: ImportSource[] = [
        {
          type: 'relative',
          source: './utils/helper',
          imports: [{ name: 'helper', isDefault: true, isNamespace: false }],
          location: { line: 1, column: 1 }
        }
      ];

      const result = await analyzer.analyzeFile(
        '/src/components/App.js',
        'javascript',
        importSources
      );

      expect(result.missingLinks).toHaveLength(1);
      const diagnostic = result.missingLinks[0].diagnostic;

      expect(diagnostic?.expectedExtensions).toContain('.js');
      expect(diagnostic?.expectedExtensions).toContain('.mjs');
    });

    it('should try language-specific extensions first', async () => {
      const importSources: ImportSource[] = [
        {
          type: 'relative',
          source: './component',
          imports: [{ name: 'Component', isDefault: true, isNamespace: false }],
          location: { line: 1, column: 1 }
        }
      ];

      const result = await analyzer.analyzeFile(
        '/src/App.tsx',
        'tsx',
        importSources
      );

      const diagnostic = result.missingLinks[0]?.diagnostic;
      expect(diagnostic?.attemptedPaths).toBeDefined();

      // .tsx 확장자가 먼저 시도되어야 함
      const tsxAttempt = diagnostic?.attemptedPaths?.find(p => p.endsWith('.tsx'));
      const tsAttempt = diagnostic?.attemptedPaths?.find(p => p.endsWith('.ts'));
      const tsxIndex = diagnostic?.attemptedPaths?.indexOf(tsxAttempt!);
      const tsIndex = diagnostic?.attemptedPaths?.indexOf(tsAttempt!);

      expect(tsxIndex).toBeLessThan(tsIndex!);
    });
  });

  describe('Index File Resolution', () => {
    it('should attempt index.ts resolution for directory imports', async () => {
      const importSources: ImportSource[] = [
        {
          type: 'relative',
          source: './components', // 디렉토리 import
          imports: [{ name: 'Button', isDefault: false, isNamespace: false }],
          location: { line: 1, column: 1 }
        }
      ];

      const result = await analyzer.analyzeFile(
        '/src/App.tsx',
        'typescript',
        importSources
      );

      const diagnostic = result.missingLinks[0]?.diagnostic;
      expect(diagnostic?.attemptedPaths).toBeDefined();

      // index.ts 시도가 포함되어야 함
      const indexAttempts = diagnostic?.attemptedPaths?.filter(p =>
        p.includes('/index.ts') || p.includes('/index.tsx')
      );
      expect(indexAttempts!.length).toBeGreaterThan(0);
    });

    it('should attempt multiple index file extensions', async () => {
      const importSources: ImportSource[] = [
        {
          type: 'relative',
          source: './utils',
          imports: [{ name: 'utility', isDefault: false, isNamespace: false }],
          location: { line: 1, column: 1 }
        }
      ];

      const result = await analyzer.analyzeFile(
        '/src/App.tsx',
        'typescript',
        importSources
      );

      const diagnostic = result.missingLinks[0]?.diagnostic;
      const attemptedPaths = diagnostic?.attemptedPaths || [];

      // 여러 index 파일 시도 확인
      const hasIndexTs = attemptedPaths.some(p => p.endsWith('/index.ts'));
      const hasIndexTsx = attemptedPaths.some(p => p.endsWith('/index.tsx'));
      const hasIndexJs = attemptedPaths.some(p => p.endsWith('/index.js'));

      expect(hasIndexTs || hasIndexTsx || hasIndexJs).toBe(true);
    });
  });

  describe('Diagnostic Information', () => {
    it('should provide helpful suggestions for missing files', async () => {
      const importSources: ImportSource[] = [
        {
          type: 'relative',
          source: './MissingComponent',
          imports: [{ name: 'MissingComponent', isDefault: true, isNamespace: false }],
          location: { line: 5, column: 10 }
        }
      ];

      const result = await analyzer.analyzeFile(
        '/src/components/App.tsx',
        'typescript',
        importSources
      );

      expect(result.missingLinks).toHaveLength(1);
      const missingLink = result.missingLinks[0];

      expect(missingLink.diagnostic).toBeDefined();
      expect(missingLink.diagnostic?.suggestion).toBeDefined();
      expect(missingLink.diagnostic?.suggestion).toContain('extension');
      expect(missingLink.diagnostic?.attemptedPaths).toBeDefined();
      expect(missingLink.diagnostic?.attemptedPaths!.length).toBeGreaterThan(0);
    });

    it('should include all attempted paths in diagnostic info', async () => {
      const importSources: ImportSource[] = [
        {
          type: 'relative',
          source: './utils/calculator',
          imports: [{ name: 'calculate', isDefault: false, isNamespace: false }],
          location: { line: 1, column: 1 }
        }
      ];

      const result = await analyzer.analyzeFile(
        '/src/math/index.ts',
        'typescript',
        importSources
      );

      const diagnostic = result.missingLinks[0]?.diagnostic;
      expect(diagnostic?.attemptedPaths).toBeDefined();

      // 직접 파일 시도와 index 파일 시도가 모두 포함되어야 함
      const directAttempts = diagnostic?.attemptedPaths?.filter(p =>
        !p.includes('/index.')
      );
      const indexAttempts = diagnostic?.attemptedPaths?.filter(p =>
        p.includes('/index.')
      );

      expect(directAttempts!.length).toBeGreaterThan(0);
      expect(indexAttempts!.length).toBeGreaterThan(0);
    });

    it('should provide language-specific extension suggestions', async () => {
      const testCases = [
        { filePath: '/src/App.tsx', language: 'tsx' as const, expectedExt: '.tsx' },
        { filePath: '/src/App.ts', language: 'typescript' as const, expectedExt: '.ts' },
        { filePath: '/src/App.jsx', language: 'jsx' as const, expectedExt: '.jsx' },
        { filePath: '/src/App.js', language: 'javascript' as const, expectedExt: '.js' },
      ];

      for (const testCase of testCases) {
        const importSources: ImportSource[] = [
          {
            type: 'relative',
            source: './component',
            imports: [{ name: 'Component', isDefault: true, isNamespace: false }],
            location: { line: 1, column: 1 }
          }
        ];

        const result = await analyzer.analyzeFile(
          testCase.filePath,
          testCase.language,
          importSources
        );

        const diagnostic = result.missingLinks[0]?.diagnostic;
        expect(diagnostic?.expectedExtensions).toContain(testCase.expectedExt);
      }
    });
  });

  describe('Path Resolution Edge Cases', () => {
    it('should handle imports with existing extensions correctly', async () => {
      const importSources: ImportSource[] = [
        {
          type: 'relative',
          source: './component.tsx',
          imports: [{ name: 'Component', isDefault: true, isNamespace: false }],
          location: { line: 1, column: 1 }
        }
      ];

      const result = await analyzer.analyzeFile(
        '/src/App.tsx',
        'typescript',
        importSources
      );

      const diagnostic = result.missingLinks[0]?.diagnostic;

      // 이미 확장자가 있으므로 하나의 경로만 시도되어야 함
      expect(diagnostic?.attemptedPaths).toHaveLength(1);
      expect(diagnostic?.attemptedPaths?.[0]).toContain('.tsx');
    });

    it('should handle complex relative paths with .. correctly', async () => {
      const importSources: ImportSource[] = [
        {
          type: 'relative',
          source: '../../shared/utils/helper',
          imports: [{ name: 'helper', isDefault: true, isNamespace: false }],
          location: { line: 1, column: 1 }
        }
      ];

      const result = await analyzer.analyzeFile(
        '/src/components/deep/Component.tsx',
        'typescript',
        importSources
      );

      expect(result.missingLinks).toHaveLength(1);
      const diagnostic = result.missingLinks[0]?.diagnostic;

      // 경로가 올바르게 해결되었는지 확인
      expect(diagnostic?.attemptedPaths?.[0]).not.toContain('..');
      expect(diagnostic?.attemptedPaths?.[0]).toContain('shared/utils/helper');
    });
  });

  describe('Multi-Language Support', () => {
    it('should use appropriate extensions for Python files', async () => {
      const importSources: ImportSource[] = [
        {
          type: 'relative',
          source: './utils',
          imports: [{ name: 'helper', isDefault: false, isNamespace: false }],
          location: { line: 1, column: 1 }
        }
      ];

      const result = await analyzer.analyzeFile(
        '/src/main.py',
        'python',
        importSources
      );

      const diagnostic = result.missingLinks[0]?.diagnostic;
      expect(diagnostic?.expectedExtensions).toContain('.py');
    });

    it('should use appropriate extensions for Java files', async () => {
      const importSources: ImportSource[] = [
        {
          type: 'relative',
          source: './Helper',
          imports: [{ name: 'Helper', isDefault: false, isNamespace: false }],
          location: { line: 1, column: 1 }
        }
      ];

      const result = await analyzer.analyzeFile(
        '/src/Main.java',
        'java',
        importSources
      );

      const diagnostic = result.missingLinks[0]?.diagnostic;
      expect(diagnostic?.expectedExtensions).toContain('.java');
    });

    it('should use appropriate extensions for Go files', async () => {
      const importSources: ImportSource[] = [
        {
          type: 'relative',
          source: './helper',
          imports: [{ name: 'Helper', isDefault: false, isNamespace: false }],
          location: { line: 1, column: 1 }
        }
      ];

      const result = await analyzer.analyzeFile(
        '/src/main.go',
        'go',
        importSources
      );

      const diagnostic = result.missingLinks[0]?.diagnostic;
      expect(diagnostic?.expectedExtensions).toContain('.go');
    });
  });
});