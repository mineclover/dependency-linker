#!/usr/bin/env bun

/**
 * Analyze All Project Files
 * 전체 프로젝트 파일을 분석하고 데이터베이스에 저장
 */

import { parserFactory } from './src/services/parsers/parserFactory.js';
import { analysisIndexManager } from './src/services/analysis/analysisIndexManager.js';
import { readFileSync, statSync } from 'fs';
import { resolve, relative } from 'path';
import { glob } from 'glob';

interface AnalysisStats {
  totalFiles: number;
  analyzedFiles: number;
  skippedFiles: number;
  errorFiles: number;
  byLanguage: Record<string, number>;
  errors: Array<{ file: string; error: string }>;
}

async function analyzeAllFiles() {
  console.log('🔍 Starting complete project analysis...');
  
  const stats: AnalysisStats = {
    totalFiles: 0,
    analyzedFiles: 0,
    skippedFiles: 0,
    errorFiles: 0,
    byLanguage: {},
    errors: []
  };

  try {
    // 분석할 파일 패턴들
    const patterns = [
      'src/**/*.ts',
      'src/**/*.js',
      'src_new/**/*.ts',
      'src_new/**/*.js',
      'test/**/*.ts',
      'test/**/*.js',
      'docs/**/*.md',
      '*.md',
      '*.ts',
      '*.js'
    ];

    // 제외할 패턴들
    const excludePatterns = [
      'node_modules/**',
      '.git/**',
      'build/**',
      'dist/**',
      '**/*.d.ts',
      '**/node_modules/**'
    ];

    console.log('📂 Discovering files...');
    
    let allFiles: string[] = [];
    for (const pattern of patterns) {
      const files = await glob(pattern, { 
        ignore: excludePatterns,
        absolute: true 
      });
      allFiles.push(...files);
    }

    // 중복 제거
    allFiles = [...new Set(allFiles)];
    stats.totalFiles = allFiles.length;
    
    console.log(`📊 Found ${stats.totalFiles} files to analyze`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    let processedCount = 0;
    
    for (const filePath of allFiles) {
      processedCount++;
      const relativePath = relative(process.cwd(), filePath);
      
      // 진행률 표시
      if (processedCount % 10 === 0 || processedCount === stats.totalFiles) {
        const progress = ((processedCount / stats.totalFiles) * 100).toFixed(1);
        console.log(`⚡ Progress: ${progress}% (${processedCount}/${stats.totalFiles})`);
      }

      try {
        // 파일 정보 확인
        const fileStats = statSync(filePath);
        if (!fileStats.isFile()) {
          stats.skippedFiles++;
          continue;
        }

        // 파서 확인
        const parser = parserFactory.getParserByFilePath(filePath);
        if (!parser) {
          // 마크다운 파일은 별도 처리
          if (filePath.endsWith('.md')) {
            console.log(`📄 Markdown file: ${relativePath}`);
            stats.skippedFiles++;
            continue;
          }
          
          stats.skippedFiles++;
          continue;
        }

        // 파일 내용 읽기
        const fileContent = readFileSync(filePath, 'utf-8');
        
        // 분석 실행
        const analysisResult = await parser.analyzeFile(filePath);
        
        if (analysisResult) {
          // 데이터베이스에 저장
          analysisIndexManager.saveAnalysisResult(analysisResult);
          
          stats.analyzedFiles++;
          
          // 언어별 통계
          const language = analysisResult.language;
          stats.byLanguage[language] = (stats.byLanguage[language] || 0) + 1;
          
          if (analysisResult.dependencies.length > 0) {
            console.log(`✅ ${relativePath} (${language}) - ${analysisResult.dependencies.length} deps`);
          }
        } else {
          stats.errorFiles++;
          stats.errors.push({ file: relativePath, error: 'Analysis returned null' });
        }

      } catch (error) {
        stats.errorFiles++;
        stats.errors.push({ 
          file: relativePath, 
          error: error instanceof Error ? error.message : String(error) 
        });
        console.log(`❌ Error analyzing ${relativePath}: ${error}`);
      }
    }

    // 최종 통계 출력
    console.log('\n📊 Analysis Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📁 Total files discovered: ${stats.totalFiles}`);
    console.log(`✅ Successfully analyzed: ${stats.analyzedFiles}`);
    console.log(`⏭️ Skipped files: ${stats.skippedFiles}`);
    console.log(`❌ Error files: ${stats.errorFiles}`);
    
    console.log('\n🏷️ Files by language:');
    Object.entries(stats.byLanguage)
      .sort(([,a], [,b]) => b - a)
      .forEach(([language, count]) => {
        console.log(`  ${language}: ${count} files`);
      });

    if (stats.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      stats.errors.slice(0, 10).forEach(({ file, error }) => {
        console.log(`  ${file}: ${error}`);
      });
      if (stats.errors.length > 10) {
        console.log(`  ... and ${stats.errors.length - 10} more errors`);
      }
    }

    // 데이터베이스 통계 확인
    console.log('\n💾 Database Statistics:');
    const dbStats = analysisIndexManager.getStatistics();
    console.log(`📦 Total files in DB: ${dbStats.totalFiles.count}`);
    console.log(`🔗 Total dependencies: ${dbStats.totalDependencies.count}`);
    console.log(`🔧 Total functions: ${dbStats.totalFunctions.count}`);
    console.log(`🏗️ Total classes: ${dbStats.totalClasses.count}`);

    console.log('\n✅ Complete project analysis finished! 🎉');

  } catch (error) {
    console.error('💥 Analysis failed:', error);
    process.exit(1);
  }
}

// 스크립트 실행
if (import.meta.main) {
  analyzeAllFiles().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}