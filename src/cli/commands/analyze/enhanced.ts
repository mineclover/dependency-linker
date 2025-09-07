/**
 * Enhanced Analysis Command - 향상된 의존성 분석
 * SQLite 캐싱과 패턴 매칭을 활용한 종합적인 분석
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { EnhancedDependencyAnalyzer, type EnhancedAnalysisResult } from '../../../infrastructure/dependencies/enhancedAnalyzer.js';
import { logger } from '../../../shared/utils/index.js';

export function createEnhancedAnalyzeCommand(): Command {
  const cmd = new Command('enhanced')
    .alias('enh')
    .description('Enhanced dependency analysis with SQLite caching')
    .option('--force-resync', 'Force resync all files regardless of cache')
    .option('--pattern-only', 'Analyze patterns only, skip direct dependencies')
    .option('--direct-only', 'Analyze direct dependencies only, skip patterns')
    .option('--show-cache-stats', 'Show detailed cache statistics')
    .option('--export-graph <format>', 'Export dependency graph (json|dot|csv)', 'json')
    .action(async (options) => {
      try {
        await runEnhancedAnalysis(options);
      } catch (error) {
        logger.error(`Enhanced analysis failed: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    });

  return cmd;
}

interface AnalysisOptions {
  forceResync?: boolean;
  patternOnly?: boolean;
  directOnly?: boolean;
  showCacheStats?: boolean;
  exportGraph?: string;
}

async function runEnhancedAnalysis(options: AnalysisOptions): Promise<void> {
  const projectPath = resolve(process.cwd());
  logger.info(`🔍 Starting enhanced dependency analysis`);
  logger.info(`📁 Project path: ${projectPath}`);

  const analyzer = new EnhancedDependencyAnalyzer(projectPath);

  try {
    // 분석 수행
    const result = await analyzer.analyzeProject();
    
    // 결과 출력
    displayAnalysisResults(result, options);
    
    // 그래프 내보내기
    if (options.exportGraph) {
      await exportAnalysisGraph(result, options.exportGraph, projectPath);
    }

  } finally {
    analyzer.dispose();
  }
}

function displayAnalysisResults(result: EnhancedAnalysisResult, options: AnalysisOptions): void {
  const { statistics, directDependencies, patternMatches, documentLinks, circularDependencies } = result;

  // 기본 통계
  logger.info('📊 Analysis Statistics');
  console.log(`   Total Files: ${statistics.totalFiles}`);
  console.log(`   Analyzed Files: ${statistics.analyzedFiles}`);
  console.log(`   Cache Hit Rate: ${(result.cacheHitRate * 100).toFixed(1)}%`);
  console.log(`   Analysis Time: ${statistics.analysisTimeMs}ms`);
  console.log();

  // 직접 의존성 결과
  if (!options.patternOnly && directDependencies.length > 0) {
    logger.info('🔗 Direct Dependencies');
    console.log(`   Count: ${statistics.directDependencies}`);
    console.log(`   Resolved: ${statistics.resolvedDependencies}`);
    
    // 상위 5개 의존성 표시
    const topDeps = directDependencies.slice(0, 5);
    topDeps.forEach((dep, index) => {
      console.log(`   ${index + 1}. ${dep.importStatement} (Line ${dep.lineNumber})`);
    });
    
    if (directDependencies.length > 5) {
      console.log(`   ... and ${directDependencies.length - 5} more`);
    }
    console.log();
  }

  // 패턴 매칭 결과
  if (!options.directOnly && patternMatches.length > 0) {
    logger.info('🎯 Pattern Matches');
    console.log(`   Active Patterns: ${statistics.activePatternMatches}`);
    
    patternMatches.forEach((match, index) => {
      if (index < 10) { // 상위 10개만 표시
        const confidence = (match.confidence * 100).toFixed(1);
        console.log(`   ${match.pattern.pattern} (${confidence}% confidence)`);
        console.log(`     Scope: ${match.scope} | Files: ${match.matchedFiles.length}`);
      }
    });
    
    if (patternMatches.length > 10) {
      console.log(`   ... and ${patternMatches.length - 10} more patterns`);
    }
    console.log();
  }

  // 문서-코드 링크
  if (documentLinks.length > 0) {
    logger.info('📚 Document-Code Links');
    console.log(`   Total Links: ${statistics.documentCodeLinks}`);
    
    documentLinks.slice(0, 5).forEach((link, index) => {
      const strength = (link.linkStrength * 100).toFixed(1);
      console.log(`   ${index + 1}. ${link.documentFile.relativePath}`);
      console.log(`      → ${link.linkedCodeFiles.length} files (${strength}% strength)`);
    });
    console.log();
  }

  // 순환 의존성
  if (circularDependencies.length > 0) {
    logger.warning('🔄 Circular Dependencies Found');
    console.log(`   Count: ${statistics.circularDependencies}`);
    
    circularDependencies.slice(0, 3).forEach((cycle, index) => {
      const severity = cycle.severity.toUpperCase();
      console.log(`   ${index + 1}. [${severity}] Cycle of ${cycle.length} files`);
      console.log(`      ${cycle.cycle.map(f => f.relativePath).join(' → ')}`);
    });
    console.log();
  }

  // 상세 캐시 통계
  if (options.showCacheStats) {
    logger.info('💾 Cache Performance');
    console.log(`   Cache Efficiency: ${(statistics.cacheEfficiency * 100).toFixed(1)}%`);
    console.log(`   Cached Files: ${statistics.cachedFiles}/${statistics.totalFiles}`);
    console.log(`   Pattern References: ${statistics.patternReferences}`);
    console.log();
  }

  // 성과 요약
  const cachePercentage = (result.cacheHitRate * 100).toFixed(1);
  const analysisSpeedUp = statistics.cachedFiles > 0 ? 
    `${((statistics.cachedFiles / statistics.totalFiles) * 70).toFixed(0)}% faster` : 'baseline';
    
  logger.success(
    `✅ Analysis complete: ${cachePercentage}% cache hit rate, ${analysisSpeedUp} execution`
  );
}

async function exportAnalysisGraph(
  result: EnhancedAnalysisResult, 
  format: string, 
  projectPath: string
): Promise<void> {
  const outputPath = resolve(projectPath, '.deplink', `analysis-graph.${format}`);
  
  try {
    let content: string;
    
    switch (format.toLowerCase()) {
      case 'json':
        content = JSON.stringify({
          metadata: {
            timestamp: new Date().toISOString(),
            projectPath,
            statistics: result.statistics
          },
          directDependencies: result.directDependencies,
          patternMatches: result.patternMatches.map(m => ({
            pattern: m.pattern.pattern,
            type: m.pattern.patternType,
            scope: m.scope,
            confidence: m.confidence,
            matchedFiles: m.matchedFiles.map(f => f.relativePath)
          })),
          documentLinks: result.documentLinks.map(l => ({
            document: l.documentFile.relativePath,
            linkedFiles: l.linkedCodeFiles.map(f => f.relativePath),
            linkStrength: l.linkStrength
          })),
          circularDependencies: result.circularDependencies.map(c => ({
            cycle: c.cycle.map(f => f.relativePath),
            severity: c.severity,
            length: c.length
          }))
        }, null, 2);
        break;
        
      case 'dot':
        content = generateDotGraph(result);
        break;
        
      case 'csv':
        content = generateCsvExport(result);
        break;
        
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    const fs = await import('fs/promises');
    await fs.writeFile(outputPath, content, 'utf8');
    
    logger.success(`📤 Analysis graph exported: ${outputPath}`);
    
  } catch (error) {
    logger.error(`Graph export failed: ${error}`);
  }
}

function generateDotGraph(result: EnhancedAnalysisResult): string {
  const lines = [
    'digraph DependencyGraph {',
    '  rankdir=LR;',
    '  node [shape=box];',
    ''
  ];

  // 노드 정의
  const files = new Set<string>();
  result.directDependencies.forEach(dep => {
    // 간단화를 위해 파일 ID 대신 상대 경로 사용
    files.add(`dep_${dep.sourceFileId}`);
    files.add(`dep_${dep.targetFileId}`);
  });

  files.forEach(file => {
    lines.push(`  "${file}";`);
  });

  lines.push('');

  // 엣지 정의
  result.directDependencies.forEach(dep => {
    const source = `dep_${dep.sourceFileId}`;
    const target = `dep_${dep.targetFileId}`;
    lines.push(`  "${source}" -> "${target}";`);
  });

  lines.push('}');
  return lines.join('\n');
}

function generateCsvExport(result: EnhancedAnalysisResult): string {
  const lines = ['Type,Source,Target,Details,Confidence'];

  // 직접 의존성
  result.directDependencies.forEach(dep => {
    lines.push(`Direct,${dep.sourceFileId},${dep.targetFileId},${dep.importStatement},1.0`);
  });

  // 패턴 매칭
  result.patternMatches.forEach(match => {
    match.matchedFiles.forEach(file => {
      lines.push(`Pattern,${match.pattern.ownerFileId},${file.id},${match.pattern.pattern},${match.confidence}`);
    });
  });

  return lines.join('\n');
}