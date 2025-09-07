/**
 * Explore Commands - 탐색 명령어
 * 🔍 deplink explore
 */

import { Command } from 'commander';
import * as path from 'path';
import { ExploreService } from '../../../services/exploreService.js';
import type { 
  CommandResult, 
  ProjectStructureResult, 
  ExploreResult, 
  SingleFileDependencyResult 
} from '../../../shared/types/index.js';

export function createExploreCommands(): Command {
  const exploreCmd = new Command('explore')
    .description('코드베이스와 의존성 탐색');

  // deplink explore project
  exploreCmd
    .command('project')
    .alias('proj')
    .description('프로젝트 구조 탐색')
    .option('--pattern <glob>', '파일 패턴 (예: "src/**/*.ts")')
    .option('--include-ignored', '무시된 파일도 포함')
    .option('--max-depth <number>', '최대 탐색 깊이', parseInt)
    .option('--show-dependencies', '의존성 정보 포함')
    .option('--format <type>', '출력 형식', 'tree')
    .action(async (options) => {
      const service = new ExploreService();
      const result = await service.exploreProject({
        pattern: options.pattern,
        includeIgnored: options.includeIgnored,
        maxDepth: options.maxDepth,
        showDependencies: options.showDependencies
      });

      if (result.success && result.data) {
        console.log(`✅ ${result.message}`);
        
        const projectData = result.data as ProjectStructureResult;
        const structure = projectData.structure;
        console.log('\n📂 프로젝트 구조:');
        
        // 디렉토리 수 계산
        const directories = new Set(structure.files.map(file => 
          path.dirname(file.relativePath || file.path)
        ).filter(dir => dir !== '.'));
        console.log(`   📁 디렉토리: ${directories.size}개`);
        console.log(`   📄 파일: ${structure.files.length}개`);
        
        // 파일 유형별 통계
        const extensions = structure.files.reduce((acc: Record<string, number>, file) => {
          const ext = file.extension || path.extname(file.relativePath || file.path) || 'no-ext';
          acc[ext] = (acc[ext] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        console.log('\n📊 파일 유형:');
        Object.entries(extensions).forEach(([ext, count]) => {
          console.log(`   ${ext}: ${count}개`);
        });

        // 의존성 정보 (요청된 경우)
        if (projectData.dependencies) {
          const deps = projectData.dependencies;
          console.log('\n🔗 의존성 통계:');
          console.log(`   전체 파일: ${deps.statistics.totalFiles}개`);
          console.log(`   해결된 의존성: ${deps.statistics.resolvedDependencies}개`);
          console.log(`   외부 의존성: ${deps.statistics.externalDependencies}개`);
          console.log(`   순환 의존성: ${deps.statistics.circularDependencies}개`);
        }

        // 트리 형식으로 출력 (옵션)
        if (options.format === 'tree' && directories.size < 50) {
          console.log('\n🌳 디렉토리 트리:');
          displayDirectoryTree(Array.from(directories), structure.files);
        }

      } else {
        console.error(`❌ ${result.message}`);
        if (result.errors) {
          result.errors.forEach(error => console.error(`   ${error}`));
        }
        process.exit(1);
      }
    });

  // deplink explore dependencies
  exploreCmd
    .command('dependencies')
    .alias('deps')
    .description('의존성 관계 탐색')
    .option('--file <path>', '특정 파일의 의존성 탐색')
    .option('--direction <dir>', '의존성 방향', 'both')
    .option('--max-depth <number>', '최대 탐색 깊이', parseInt)
    .option('--include-external', '외부 의존성 포함')
    .option('--format <type>', '출력 형식', 'list')
    .action(async (options) => {
      const service = new ExploreService();
      const result = await service.exploreDependencies({
        filePath: options.file,
        direction: options.direction,
        maxDepth: options.maxDepth,
        includeExternal: options.includeExternal
      });

      if (result.success && result.data) {
        console.log(`✅ ${result.message}`);

        if ((result.data as SingleFileDependencyResult).file) {
          // 특정 파일의 의존성
          const data = result.data as SingleFileDependencyResult;
          console.log(`\n📄 파일: ${data.file.path}`);
          
          if (data.dependencies && data.dependencies.length > 0) {
            console.log(`\n📤 이 파일이 사용하는 파일들 (${data.dependencies.length}개):`);
            data.dependencies.forEach(dep => {
              console.log(`   → ${dep}`);
            });
          }

          if (data.dependents && data.dependents.length > 0) {
            console.log(`\n📥 이 파일을 사용하는 파일들 (${data.dependents.length}개):`);
            data.dependents.forEach(dep => {
              console.log(`   ← ${dep}`);
            });
          }

          if ((!data.dependencies || data.dependencies.length === 0) && 
              (!data.dependents || data.dependents.length === 0)) {
            console.log('\n   의존성 관계가 없습니다.');
          }

        } else {
          // 전체 의존성 그래프
          const analysisData = result.data as DependencyAnalysisResult;
          const stats = analysisData.statistics;
          console.log('\n🔗 전체 의존성 분석:');
          console.log(`   전체 파일: ${stats.totalFiles}개`);
          console.log(`   해결된 의존성: ${stats.resolvedDependencies}개`);
          console.log(`   외부 의존성: ${stats.externalDependencies}개`);
          console.log(`   순환 의존성: ${stats.circularDependencies}개`);

          if (stats.mostConnectedFiles && stats.mostConnectedFiles.length > 0) {
            console.log('\n📈 연결이 많은 파일들:');
            stats.mostConnectedFiles.slice(0, 5).forEach(file => {
              console.log(`   ${file.path} (${file.connections}개 연결)`);
            });
          }
        }

      } else {
        console.error(`❌ ${result.message}`);
        if (result.errors) {
          result.errors.forEach(error => console.error(`   ${error}`));
        }
        process.exit(1);
      }
    });

  // deplink explore docs
  exploreCmd
    .command('docs')
    .description('문서 탐색 및 분석')
    .option('--docs-path <path>', '문서 디렉토리 경로', './docs')
    .option('--link-to-code', '코드 링크 분석')
    .option('--check-sync', '동기화 상태 확인')
    .action(async (options) => {
      const service = new ExploreService();
      const result = await service.exploreDocs({
        docsPath: options.docsPath,
        linkToCode: options.linkToCode,
        checkSyncStatus: options.checkSync
      });

      if (result.success && result.data) {
        console.log(`✅ ${result.message}`);
        
        if (result.data.docs && result.data.docs.length > 0) {
          console.log('\n📚 문서 목록:');
          result.data.docs.forEach((doc: any) => {
            console.log(`   📄 ${doc.relativePath}`);
          });

          // 동기화 상태
          if (result.data.syncStatus) {
            console.log('\n📊 동기화 상태:');
            console.log(`   동기화됨: ${result.data.syncStatus.synced}개`);
            console.log(`   업데이트 필요: ${result.data.syncStatus.needsUpdate}개`);
            console.log(`   미동기화: ${result.data.syncStatus.notSynced}개`);
          }

          // 코드 링크 분석
          if (result.data.codeLinks && result.data.codeLinks.length > 0) {
            console.log('\n🔗 코드 링크 분석:');
            result.data.codeLinks.forEach((link: any) => {
              console.log(`   📄 ${link.document}:`);
              console.log(`      코드 블록: ${link.codeBlocks}개`);
              if (link.fileReferences.length > 0) {
                console.log(`      파일 참조: ${link.fileReferences.join(', ')}`);
              }
            });
          }

        } else {
          console.log('\n   문서가 없습니다.');
        }

      } else {
        console.error(`❌ ${result.message}`);
        if (result.errors) {
          result.errors.forEach(error => console.error(`   ${error}`));
        }
        process.exit(1);
      }
    });

  // deplink explore path
  exploreCmd
    .command('path <targetPath>')
    .description('특정 경로 탐색')
    .option('--show-content', '파일 내용 표시')
    .option('--show-dependencies', '의존성 정보 표시')
    .option('--max-lines <number>', '최대 표시 라인 수', parseInt)
    .action(async (targetPath, options) => {
      const service = new ExploreService();
      const result = await service.explorePath({
        targetPath,
        showContent: options.showContent,
        showDependencies: options.showDependencies,
        maxLines: options.maxLines
      });

      if (result.success && result.data) {
        console.log(`✅ ${result.message}`);

        if (result.data.fileInfo) {
          // 파일 정보
          const file = result.data.fileInfo;
          console.log('\n📄 파일 정보:');
          console.log(`   경로: ${file.relativePath}`);
          console.log(`   크기: ${formatFileSize(file.size)}`);
          console.log(`   수정일: ${file.lastModified.toLocaleString()}`);

          // 파일 내용
          if (result.data.content) {
            console.log('\n📖 파일 내용:');
            console.log('```');
            console.log(result.data.content);
            console.log('```');
          }

          // 의존성 정보
          if (result.data.dependencies) {
            const deps = result.data.dependencies;
            console.log('\n🔗 의존성 정보:');
            if (deps.dependencies && deps.dependencies.length > 0) {
              console.log(`   사용하는 파일: ${deps.dependencies.length}개`);
            }
            if (deps.dependents && deps.dependents.length > 0) {
              console.log(`   사용되는 곳: ${deps.dependents.length}개`);
            }
          }

        } else if (result.data.directoryInfo) {
          // 디렉토리 정보
          const dir = result.data.directoryInfo;
          console.log('\n📁 디렉토리 정보:');
          console.log(`   경로: ${dir.relativePath}`);
          console.log(`   파일: ${dir.fileCount}개`);
          console.log(`   디렉토리: ${dir.dirCount}개`);

          if (result.data.contents && result.data.contents.length > 0) {
            console.log('\n📂 내용:');
            result.data.contents.forEach((item: any) => {
              const icon = item.isDirectory ? '📁' : '📄';
              console.log(`   ${icon} ${item.name}`);
            });
          }
        }

      } else {
        console.error(`❌ ${result.message}`);
        if (result.errors) {
          result.errors.forEach(error => console.error(`   ${error}`));
        }
        process.exit(1);
      }
    });

  // deplink explore enhanced (SQLite version)
  exploreCmd
    .command('enhanced')
    .alias('enh')
    .description('Enhanced dependency analysis with SQLite caching')
    .option('--force-resync', 'Force resync all files regardless of cache')
    .option('--pattern-only', 'Analyze patterns only, skip direct dependencies')
    .option('--direct-only', 'Analyze direct dependencies only, skip patterns')
    .option('--show-cache-stats', 'Show detailed cache statistics')
    .option('--export-graph <format>', 'Export dependency graph (json|dot|csv)', 'json')
    .action(async (options) => {
      try {
        const { runEnhancedAnalysis } = await import('./enhanced.js');
        await runEnhancedAnalysis(options);
      } catch (error) {
        console.error(`❌ Enhanced analysis failed: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    });

  // deplink explore demo
  exploreCmd
    .command('demo')
    .description('Demo: Enhanced dependency analysis architecture')
    .option('--pattern-only', 'Show patterns only, skip direct dependencies')
    .option('--direct-only', 'Show direct dependencies only, skip patterns')
    .option('--show-cache-stats', 'Show detailed cache statistics')
    .action(async (options) => {
      try {
        const { runDemoEnhancedAnalysis } = await import('./demo-enhanced.js');
        await runDemoEnhancedAnalysis(options);
      } catch (error) {
        console.error(`❌ Demo analysis failed: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    });

  // deplink explore summary
  exploreCmd
    .command('summary')
    .description('프로젝트 전체 요약')
    .action(async () => {
      const service = new ExploreService();
      const result = await service.getProjectSummary();

      if (result.success && result.data) {
        console.log(`✅ ${result.message}`);
        
        const summary = result.data;
        console.log('\n📊 프로젝트 요약:');
        console.log(`   프로젝트: ${summary.project.name}`);
        console.log(`   경로: ${summary.project.path}`);
        console.log(`   파일: ${summary.project.fileCount}개`);
        console.log(`   디렉토리: ${summary.project.directoryCount}개`);

        if (summary.dependencies) {
          console.log('\n🔗 의존성:');
          console.log(`   전체 의존성: ${summary.dependencies.totalDependencies}개`);
          console.log(`   해결된 의존성: ${summary.dependencies.resolvedDependencies}개`);
          console.log(`   외부 의존성: ${summary.dependencies.externalDependencies}개`);
        }

        if (summary.sync) {
          console.log('\n📊 동기화:');
          console.log(`   동기화됨: ${summary.sync.synced}개`);
          console.log(`   업데이트 필요: ${summary.sync.needsUpdate}개`);
          console.log(`   미동기화: ${summary.sync.notSynced}개`);
        }

      } else {
        console.error(`❌ ${result.message}`);
        if (result.errors) {
          result.errors.forEach(error => console.error(`   ${error}`));
        }
        process.exit(1);
      }
    });

  return exploreCmd;
}

/**
 * 디렉토리 트리 표시 헬퍼 함수
 */
function displayDirectoryTree(directories: string[], files: any[], maxItems: number = 20) {
  const items = [
    ...directories.map(d => ({ relativePath: d, type: 'dir', name: path.basename(d) })),
    ...files.map(f => ({ ...f, type: 'file', relativePath: f.relativePath || f.path }))
  ].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'dir' ? -1 : 1;
    }
    return (a.relativePath || '').localeCompare(b.relativePath || '');
  });

  const displayItems = items.slice(0, maxItems);
  
  displayItems.forEach(item => {
    const icon = item.type === 'dir' ? '📁' : '📄';
    const depth = item.relativePath.split('/').length - 1;
    const indent = '  '.repeat(depth);
    console.log(`${indent}${icon} ${item.name || item.relativePath.split('/').pop()}`);
  });

  if (items.length > maxItems) {
    console.log(`   ... (${items.length - maxItems} more items)`);
  }
}

/**
 * 파일 크기 포맷팅
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}