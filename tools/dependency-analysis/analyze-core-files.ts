#!/usr/bin/env npx tsx

import { DependencyAnalyzer } from './dependency-analyzer';
import { DependencyVisualizer } from './dependency-visualizer';

async function analyzeCoreFiles() {
  const analyzer = new DependencyAnalyzer();
  const visualizer = new DependencyVisualizer();

  // 핵심 파일들 정의
  const coreFiles = [
    'src/extractors/IDataExtractor.ts',      // 많이 의존받는 인터페이스
    'src/interpreters/IDataInterpreter.ts',  // 많이 의존받는 인터페이스
    'src/parsers/ILanguageParser.ts',        // 파서 기본 인터페이스
    'src/models/AnalysisResult.ts',          // 결과 모델 (병목 지점)
    'src/parsers/TypeScriptParser.ts'        // 복잡한 파서 구현체
  ];

  console.log('🎯 핵심 파일들의 의존성 분석 시작...\n');

  for (const file of coreFiles) {
    try {
      console.log(`🔍 분석 중: ${file}`);
      console.log('='.repeat(60));

      const result = await analyzer.analyzeDependencies(file);

      console.log(`📊 총 파일 수: ${result.totalFiles}개`);
      console.log(`📈 최대 깊이: ${result.maxDepth}`);
      console.log(`🔄 순환 의존성: ${result.circularDependencies.length}개`);

      // 간단한 요약 표시
      console.log('\n📋 직접 의존성:');
      const rootInfo = result.dependencies.get(result.rootFile.includes('/') ?
        `/Users/junwoobang/project/dependency-linker/${result.rootFile}` : result.rootFile);

      if (rootInfo && rootInfo.dependencies.length > 0) {
        rootInfo.dependencies.forEach(dep => {
          const relativeDep = dep.replace('/Users/junwoobang/project/dependency-linker/', '');
          console.log(`  📄 ${relativeDep}`);
        });
      } else {
        console.log('  📄 직접 의존성 없음');
      }

      console.log('\n📥 이 파일을 의존하는 파일들:');
      if (rootInfo && rootInfo.dependents.length > 0) {
        rootInfo.dependents.forEach(dep => {
          const relativeDep = dep.replace('/Users/junwoobang/project/dependency-linker/', '');
          console.log(`  📄 ${relativeDep}`);
        });
      } else {
        console.log('  📄 이 파일을 의존하는 파일 없음');
      }

      // 결과 저장
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const filename = file.replace(/[\/\.]/g, '_');
      await analyzer.saveResultsToFile(result, `core-analysis-${filename}-${timestamp}.json`);

      console.log('\n' + '='.repeat(60) + '\n');

    } catch (error) {
      console.error(`❌ ${file} 분석 실패:`, error);
      console.log('\n' + '='.repeat(60) + '\n');
    }
  }

  console.log('✅ 모든 핵심 파일 분석 완료!');
}

if (require.main === module) {
  analyzeCoreFiles();
}