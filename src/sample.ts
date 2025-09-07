/**
 * Notion SDK 테스트 실행을 위한 진입점 스크립트
 */

import { runNotionTest } from './sample/notion-test.js';
import { logger } from './shared/utils/index.js';

// 스크립트가 직접 실행될 때만 테스트 함수를 호출합니다.
if (import.meta.url.startsWith('file://') && process.argv[1] === import.meta.url.substring(7)) {
  runNotionTest().catch((error) => {
    logger.error('❌ 테스트 스크립트 실행 중 처리되지 않은 오류 발생:',error);
    process.exit(1);
  });
}
