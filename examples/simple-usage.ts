/**
 * 간단한 사용법 예시 - PathResolverInterpreter와 PathResolutionUtils
 * 가장 기본적인 프로젝트 루트 경로 해결 예시
 */

import { PathResolverInterpreter } from '@context-action/dependency-linker/dist/interpreters/PathResolverInterpreter';
import { resolveDependencyPath, createResolutionContext } from '@context-action/dependency-linker/dist/utils/PathResolutionUtils';

// ===== 최단 사용법 예시 =====

async function quickStart() {
  console.log('🚀 PathResolver 빠른 시작 가이드\n');

  // 1. 기본 설정
  const projectRoot = '/Users/myproject';
  const sourceFile = '/Users/myproject/src/components/Header.tsx';

  // 2. PathResolverInterpreter 사용
  const pathResolver = new PathResolverInterpreter();

  const dependencies = {
    dependencies: [
      { source: './Button.tsx' },        // 같은 폴더
      { source: '../utils/format.ts' },  // 상위 폴더
      { source: '@/types/User.ts' },     // 별칭 경로
      { source: 'react' }                // NPM 패키지
    ],
    totalCount: 4,
    importCount: 4,
    exportCount: 0,
    dynamicImportCount: 0,
    typeOnlyImportCount: 0
  };

  const context = {
    filePath: sourceFile,
    language: 'typescript' as const,
    metadata: {},
    timestamp: new Date(),
    projectContext: {
      rootPath: projectRoot,
      projectType: 'frontend' as const
    }
  };

  const result = pathResolver.interpret(dependencies, context);

  console.log('📊 해결 결과:');
  result.resolvedDependencies.forEach(dep => {
    console.log(`${dep.originalSource} → ${dep.resolvedPath || 'UNRESOLVED'}`);
  });

  return result;
}

// ===== 단일 경로 해결 예시 =====

async function singlePathExample() {
  console.log('\n🎯 단일 경로 해결 예시');

  const context = {
    projectRoot: '/Users/myproject',
    sourceFileDir: '/Users/myproject/src/components',
    aliases: { '@': 'src' },
    extensions: ['.ts', '.tsx', '.js']
  };

  // 여러 경로 해결 테스트
  const testPaths = ['./Button.tsx', '../utils/helpers.ts', '@/types/User.ts'];

  for (const testPath of testPaths) {
    const resolved = await resolveDependencyPath(testPath, context);
    console.log(`${testPath} → ${resolved || 'UNRESOLVED'}`);
  }
}

// 실행
quickStart().then(() => singlePathExample());