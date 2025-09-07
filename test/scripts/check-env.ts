#!/usr/bin/env bun
/**
 * 테스트 환경 설정 확인 스크립트
 */

import { Client } from '@notionhq/client';
import * as fs from 'fs';
import * as path from 'path';

interface EnvironmentCheck {
  name: string;
  status: 'success' | 'warning' | 'error';
  message: string;
}

class TestEnvironmentChecker {
  private checks: EnvironmentCheck[] = [];

  async runAllChecks(): Promise<void> {
    console.log('🔍 테스트 환경 설정 확인 중...\n');

    await this.checkEnvironmentVariables();
    await this.checkNotionConnection();
    await this.checkFileSystem();
    await this.checkDependencies();

    this.displayResults();
  }

  private async checkEnvironmentVariables(): Promise<void> {
    // API Key 확인
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) {
      this.addCheck('NOTION_API_KEY', 'error', '환경 변수가 설정되지 않았습니다');
    } else if (apiKey.startsWith('secret_') && apiKey.length > 40) {
      this.addCheck('NOTION_API_KEY', 'success', '올바른 형식의 API 키가 설정되어 있습니다');
    } else {
      this.addCheck('NOTION_API_KEY', 'warning', 'API 키 형식을 확인해주세요');
    }

    // Parent Page ID 확인
    const parentPageId = process.env.TEST_PARENT_PAGE_ID;
    if (!parentPageId) {
      this.addCheck('TEST_PARENT_PAGE_ID', 'error', '환경 변수가 설정되지 않았습니다');
    } else if (this.isValidNotionId(parentPageId)) {
      this.addCheck('TEST_PARENT_PAGE_ID', 'success', '올바른 형식의 페이지 ID입니다');
    } else {
      this.addCheck('TEST_PARENT_PAGE_ID', 'warning', '페이지 ID 형식을 확인해주세요');
    }

    // Database ID 확인 (선택사항)
    const databaseId = process.env.TEST_DATABASE_ID;
    if (!databaseId) {
      this.addCheck('TEST_DATABASE_ID', 'warning', '설정되지 않음 (선택사항)');
    } else if (this.isValidNotionId(databaseId)) {
      this.addCheck('TEST_DATABASE_ID', 'success', '올바른 형식의 데이터베이스 ID입니다');
    } else {
      this.addCheck('TEST_DATABASE_ID', 'warning', '데이터베이스 ID 형식을 확인해주세요');
    }
  }

  private async checkNotionConnection(): Promise<void> {
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) {
      this.addCheck('Notion 연결', 'error', 'API 키가 없어 연결을 확인할 수 없습니다');
      return;
    }

    try {
      const notion = new Client({ auth: apiKey });
      
      // 기본 연결 확인
      await notion.users.me();
      this.addCheck('Notion API 연결', 'success', 'API 연결이 성공적입니다');

      // 부모 페이지 접근 확인
      const parentPageId = process.env.TEST_PARENT_PAGE_ID;
      if (parentPageId) {
        try {
          await notion.pages.retrieve({ page_id: parentPageId });
          this.addCheck('테스트 페이지 접근', 'success', '부모 페이지에 접근할 수 있습니다');
        } catch (error) {
          this.addCheck('테스트 페이지 접근', 'error', `부모 페이지 접근 실패: ${error}`);
        }
      }

    } catch (error: any) {
      if (error.code === 'unauthorized') {
        this.addCheck('Notion API 연결', 'error', 'API 키가 유효하지 않습니다');
      } else if (error.code === 'rate_limited') {
        this.addCheck('Notion API 연결', 'warning', 'API 요청 한도에 도달했습니다');
      } else {
        this.addCheck('Notion API 연결', 'error', `연결 실패: ${error.message}`);
      }
    }
  }

  private async checkFileSystem(): Promise<void> {
    // 테스트 디렉토리 구조 확인
    const testDir = path.join(process.cwd(), 'test');
    const requiredDirs = ['fixtures', 'helpers', 'integration', 'unit', 'temp'];

    if (!fs.existsSync(testDir)) {
      this.addCheck('테스트 디렉토리', 'error', 'test 디렉토리가 존재하지 않습니다');
      return;
    }

    let missingDirs: string[] = [];
    for (const dir of requiredDirs) {
      const dirPath = path.join(testDir, dir);
      if (!fs.existsSync(dirPath)) {
        missingDirs.push(dir);
      }
    }

    if (missingDirs.length === 0) {
      this.addCheck('테스트 디렉토리 구조', 'success', '모든 필수 디렉토리가 존재합니다');
    } else {
      this.addCheck('테스트 디렉토리 구조', 'warning', `누락된 디렉토리: ${missingDirs.join(', ')}`);
    }

    // temp 디렉토리 쓰기 권한 확인
    const tempDir = path.join(testDir, 'temp');
    try {
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const testFile = path.join(tempDir, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      
      this.addCheck('임시 디렉토리 권한', 'success', '쓰기 권한이 있습니다');
    } catch (error) {
      this.addCheck('임시 디렉토리 권한', 'error', `쓰기 권한 없음: ${error}`);
    }
  }

  private async checkDependencies(): Promise<void> {
    // package.json 확인
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      this.addCheck('의존성 확인', 'error', 'package.json 파일을 찾을 수 없습니다');
      return;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const requiredDeps = ['@notionhq/client', 'vitest', 'marked', 'gray-matter'];
      
      let missingDeps: string[] = [];
      for (const dep of requiredDeps) {
        if (!packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]) {
          missingDeps.push(dep);
        }
      }

      if (missingDeps.length === 0) {
        this.addCheck('필수 의존성', 'success', '모든 필수 패키지가 설치되어 있습니다');
      } else {
        this.addCheck('필수 의존성', 'error', `누락된 패키지: ${missingDeps.join(', ')}`);
      }

      // node_modules 확인
      const nodeModulesPath = path.join(process.cwd(), 'node_modules');
      if (fs.existsSync(nodeModulesPath)) {
        this.addCheck('패키지 설치', 'success', 'node_modules가 존재합니다');
      } else {
        this.addCheck('패키지 설치', 'warning', 'bun install을 실행해주세요');
      }

    } catch (error) {
      this.addCheck('의존성 확인', 'error', `package.json 파싱 실패: ${error}`);
    }
  }

  private isValidNotionId(id: string): boolean {
    // UUID 형식 확인 (하이픈 있음)
    const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    // 32자 hex 형식 확인 (하이픈 없음)
    const hexRegex = /^[a-f0-9]{32}$/i;
    
    return uuidRegex.test(id) || hexRegex.test(id);
  }

  private addCheck(name: string, status: 'success' | 'warning' | 'error', message: string): void {
    this.checks.push({ name, status, message });
  }

  private displayResults(): void {
    console.log('📋 환경 설정 확인 결과:\n');

    let successCount = 0;
    let warningCount = 0;
    let errorCount = 0;

    for (const check of this.checks) {
      const icon = check.status === 'success' ? '✅' : 
                   check.status === 'warning' ? '⚠️' : '❌';
      
      console.log(`${icon} ${check.name}: ${check.message}`);
      
      if (check.status === 'success') successCount++;
      else if (check.status === 'warning') warningCount++;
      else errorCount++;
    }

    console.log('\n📊 요약:');
    console.log(`   성공: ${successCount}`);
    console.log(`   경고: ${warningCount}`);
    console.log(`   오류: ${errorCount}`);

    if (errorCount > 0) {
      console.log('\n❌ 오류가 있어 통합 테스트를 실행할 수 없습니다.');
      console.log('   위의 오류들을 먼저 해결해주세요.');
      process.exit(1);
    } else if (warningCount > 0) {
      console.log('\n⚠️ 경고가 있지만 기본 테스트는 실행 가능합니다.');
      console.log('   더 나은 테스트를 위해 경고사항을 확인해주세요.');
    } else {
      console.log('\n🎉 모든 설정이 완료되었습니다! 테스트를 실행하세요.');
    }
  }
}

// 스크립트 실행
async function main() {
  const checker = new TestEnvironmentChecker();
  await checker.runAllChecks();
}

if (import.meta.main) {
  main().catch(console.error);
}

export { TestEnvironmentChecker };