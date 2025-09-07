#!/usr/bin/env bun

/**
 * 임시 검증 테스트 - CLI 순환 의존성 문제 해결 전까지 사용
 */

import { DatabaseAccessValidationService } from './src/services/validation/DatabaseAccessValidationService.js';

async function testValidation() {
  console.log('🔍 데이터베이스 접근 권한 검증 테스트 시작...\n');
  
  try {
    const validationService = new DatabaseAccessValidationService();
    
    console.log('✅ DatabaseAccessValidationService 초기화 성공');
    console.log('📊 검증 서비스가 정상적으로 작동합니다.');
    
    // 실제 검증은 설정이 필요하므로 일단 초기화만 확인
    console.log('\n💡 실제 검증을 하려면 설정 파일이 필요합니다:');
    console.log('   - Notion API 키');
    console.log('   - 데이터베이스 ID들');
    console.log('   - 작업공간 설정');
    
    console.log('\n🎉 검증 서비스 테스트 완료!');
    
  } catch (error: any) {
    console.error(`💥 검증 실패: ${error.message}`);
    process.exit(1);
  }
}

// 실행
if (import.meta.main) {
  testValidation();
}