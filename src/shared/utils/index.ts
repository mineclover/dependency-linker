/**
 * Shared Utils - 공통 유틸리티 함수들
 * 전체 시스템에서 재사용되는 유틸리티 함수들
 */

export * from './apiQueue.js';
export * from './schemaManager.js';
export * from './projectDetector.js';

// Note: UnifiedSchemaManager moved to infrastructure layer
// Import directly from infrastructure/database/UnifiedSchemaManager.js when needed
export * from './bunSqlite.js';
export * from './schemaValidator.js';
export * from './aliasResolver.js';
export * from './typeGuards.js';
export * from './tempFolderManager.js';

import { COLORS, EMOJIS } from '../constants/index.js';

/**
 * 로깅 유틸리티
 */
export const logger = {
  info: (message: string, emoji?: string) => {
    console.log(`${emoji || EMOJIS.INFO} ${message}`);
  },
  
  success: (message: string) => {
    console.log(`${COLORS.GREEN}${EMOJIS.SUCCESS} ${message}${COLORS.RESET}`);
  },
  
  error: (message: string, error?: Error) => {
    console.error(`${COLORS.RED}${EMOJIS.ERROR} ${message}${COLORS.RESET}`, error);
  },
  
  warning: (message: string) => {
    console.warn(`${COLORS.YELLOW}${EMOJIS.WARNING} ${message}${COLORS.RESET}`);
  },
  
  debug: (message: string, data?: unknown) => {
    if (process.env.DEBUG) {
      console.log(`${COLORS.DIM}🐛 ${message}${COLORS.RESET}`);
      if (data) {
        console.log(`${COLORS.DIM}${JSON.stringify(data, null, 2)}${COLORS.RESET}`);
      }
    }
  },
};

/**
 * 파일 경로 유틸리티
 */
export const pathUtils = {
  /**
   * 파일 확장자 확인
   */
  hasExtension: (filePath: string, extensions: string[]): boolean => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    return extensions.includes(`.${ext}`);
  },

  /**
   * 상대 경로를 절대 경로로 변환
   */
  toAbsolute: (relativePath: string, basePath = process.cwd()): string => {
    if (relativePath.startsWith('/')) return relativePath;
    return `${basePath}/${relativePath}`.replace(/\/+/g, '/');
  },

  /**
   * 절대 경로를 상대 경로로 변환
   */
  toRelative: (absolutePath: string, basePath = process.cwd()): string => {
    return absolutePath.replace(basePath, '').replace(/^\/+/, '');
  },
};

/**
 * 문자열 유틸리티
 */
export const stringUtils = {
  /**
   * 캐멀케이스를 케밥케이스로 변환
   */
  camelToKebab: (str: string): string => {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  },

  /**
   * 케밥케이스를 캐멀케이스로 변환
   */
  kebabToCamel: (str: string): string => {
    return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  },

  /**
   * 첫 글자를 대문자로 변환
   */
  capitalize: (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  /**
   * 문자열 자르기 (말줄임표 포함)
   */
  truncate: (str: string, maxLength: number): string => {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
  },
};

/**
 * 배열 유틸리티
 */
export const arrayUtils = {
  /**
   * 배열을 청크 단위로 분할
   */
  chunk: <T>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },

  /**
   * 배열에서 중복 제거
   */
  unique: <T>(array: T[]): T[] => {
    return [...new Set(array)];
  },

  /**
   * 객체 배열에서 특정 키로 중복 제거
   */
  uniqueBy: <T>(array: T[], key: keyof T): T[] => {
    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  },
};

/**
 * 비동기 유틸리티
 */
export const asyncUtils = {
  /**
   * 지연 실행
   */
  delay: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * 재시도 로직
   */
  retry: async <T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> => {
    let lastError: Error;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries) {
          await asyncUtils.delay(delayMs * (i + 1)); // 지수 백오프
        }
      }
    }
    
    throw lastError;
  },

  /**
   * 병렬 처리 (동시성 제한)
   */
  parallelLimit: async <T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
    limit: number
  ): Promise<R[]> => {
    const results: R[] = [];
    const executing: Promise<void>[] = [];
    
    for (const item of items) {
      const promise = fn(item).then(result => {
        results.push(result);
      });
      
      executing.push(promise);
      
      if (executing.length >= limit) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === promise), 1);
      }
    }
    
    await Promise.all(executing);
    return results;
  },
};

/**
 * 검증 유틸리티
 */
export const validation = {
  /**
   * 이메일 형식 검증
   */
  isEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * URL 형식 검증
   */
  isUrl: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * 파일 경로 검증
   */
  isValidFilePath: (path: string): boolean => {
    // 기본적인 파일 경로 검증 (더 정교한 검증 필요시 확장)
    return path.length > 0 && !path.includes('..') && !/[<>:"|?*]/.test(path);
  },
};