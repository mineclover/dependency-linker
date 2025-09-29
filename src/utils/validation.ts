/**
 * Validation Utilities
 * 검증 관련 유틸리티 함수들
 */

import type { BaseQueryResult, ValidationResult, ExtendedSourceLocation } from "../core/types";
import type { QueryKey } from "../core/QueryResultMap";

// ===== QUERY RESULT VALIDATION =====

/**
 * 기본 쿼리 결과 검증
 */
export function validateBaseQueryResult(result: unknown): result is BaseQueryResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    typeof (result as Record<string, unknown>).queryName === 'string' &&
    typeof (result as Record<string, unknown>).location === 'object' &&
    typeof (result as Record<string, unknown>).nodeText === 'string'
  );
}

/**
 * 쿼리 결과 배열 검증
 */
export function validateQueryResults(results: unknown[], queryKey: QueryKey): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(results)) {
    errors.push(`Results for query "${queryKey}" is not an array`);
    return { isValid: false, errors, warnings };
  }

  for (let i = 0; i < results.length; i++) {
    const result = results[i];

    if (!validateBaseQueryResult(result)) {
      errors.push(`Result ${i} for query "${queryKey}" is not a valid BaseQueryResult`);
      continue;
    }

    if (result.queryName !== queryKey) {
      errors.push(`Result ${i} has queryName "${result.queryName}" but expected "${queryKey}"`);
    }

    if (!result.location) {
      errors.push(`Result ${i} for query "${queryKey}" missing location`);
    } else {
      const locationErrors = validateLocation(result.location);
      if (locationErrors.length > 0) {
        errors.push(`Result ${i} location invalid: ${locationErrors.join(', ')}`);
      }
    }

    if (!result.nodeText || typeof result.nodeText !== 'string') {
      warnings.push(`Result ${i} for query "${queryKey}" has empty or invalid nodeText`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 위치 정보 검증
 */
export function validateLocation(location: unknown): string[] {
  const errors: string[] = [];

  if (typeof location !== 'object' || location === null) {
    errors.push('Location is not an object');
    return errors;
  }

  const loc = location as Record<string, unknown>;

  if (typeof loc.line !== 'number' || loc.line < 1) {
    errors.push('Invalid line number');
  }

  if (typeof loc.column !== 'number' || loc.column < 0) {
    errors.push('Invalid column number');
  }

  if (typeof loc.endLine !== 'number' || (typeof loc.line === 'number' && loc.endLine < loc.line)) {
    errors.push('Invalid endLine number');
  }

  if (typeof loc.endColumn !== 'number' ||
      (typeof loc.line === 'number' && typeof loc.column === 'number' &&
       typeof loc.endLine === 'number' && loc.endLine === loc.line && loc.endColumn < loc.column)) {
    errors.push('Invalid endColumn number');
  }

  return errors;
}

// ===== QUERY KEY VALIDATION =====

/**
 * 쿼리 키 형식 검증
 */
export function validateQueryKeyFormat(queryKey: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 기본 형식 검증: language-domain-target 또는 domain-target
  const keyPattern = /^([a-z]+)-([a-z]+)(-[a-z]+)*$/;
  if (!keyPattern.test(queryKey)) {
    errors.push(`Query key "${queryKey}" does not follow naming convention (language-domain-target)`);
  }

  // 길이 검증
  if (queryKey.length > 50) {
    warnings.push(`Query key "${queryKey}" is very long (${queryKey.length} characters)`);
  }

  // 언어 프리픽스 검증
  const validLanguagePrefixes = ['ts', 'js', 'go', 'java'];
  const parts = queryKey.split('-');
  if (parts.length >= 2 && validLanguagePrefixes.includes(parts[0])) {
    // 언어별 쿼리인 경우 추가 검증
    if (parts.length < 2) {
      warnings.push(`Language-specific query "${queryKey}" should have at least domain part`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 쿼리 키 충돌 검증
 */
export function validateQueryKeyConflicts(queryKeys: string[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 중복 키 검증
  const duplicates = queryKeys.filter((key, index) => queryKeys.indexOf(key) !== index);
  if (duplicates.length > 0) {
    errors.push(`Duplicate query keys found: ${[...new Set(duplicates)].join(', ')}`);
  }

  // 유사한 키 검증
  for (let i = 0; i < queryKeys.length; i++) {
    for (let j = i + 1; j < queryKeys.length; j++) {
      const key1 = queryKeys[i];
      const key2 = queryKeys[j];

      // 매우 유사한 키 체크
      const similarity = calculateStringSimilarity(key1, key2);
      if (similarity > 0.8 && key1 !== key2) {
        warnings.push(`Query keys "${key1}" and "${key2}" are very similar (${Math.round(similarity * 100)}% similar)`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ===== LANGUAGE VALIDATION =====

/**
 * 언어 지원 검증
 */
export function validateLanguageSupport(queryKey: string, supportedLanguages: string[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (supportedLanguages.length === 0) {
    warnings.push(`Query "${queryKey}" supports no languages`);
  }

  const validLanguages = ['typescript', 'tsx', 'javascript', 'jsx', 'go', 'java'];
  const invalidLanguages = supportedLanguages.filter(lang => !validLanguages.includes(lang));

  if (invalidLanguages.length > 0) {
    errors.push(`Query "${queryKey}" has invalid languages: ${invalidLanguages.join(', ')}`);
  }

  // 언어별 쿼리 키와 지원 언어 일치성 검증
  const keyParts = queryKey.split('-');
  if (keyParts.length >= 2) {
    const keyLanguage = keyParts[0];
    const languageMap: Record<string, string[]> = {
      'ts': ['typescript', 'tsx'],
      'js': ['javascript', 'jsx'],
      'go': ['go'],
      'java': ['java'],
    };

    if (languageMap[keyLanguage]) {
      const expectedLanguages = languageMap[keyLanguage];
      const hasCorrectLanguages = expectedLanguages.every(lang => supportedLanguages.includes(lang));

      if (!hasCorrectLanguages) {
        warnings.push(`Query "${queryKey}" language prefix "${keyLanguage}" doesn't match supported languages`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ===== UTILITY FUNCTIONS =====

/**
 * 문자열 유사도 계산 (Levenshtein distance 기반)
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const matrix: number[][] = [];
  const len1 = str1.length;
  const len2 = str2.length;

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : 1 - matrix[len1][len2] / maxLen;
}

/**
 * 검증 결과 병합
 */
export function mergeValidationResults(...results: ValidationResult[]): ValidationResult {
  const allErrors = results.flatMap(r => r.errors);
  const allWarnings = results.flatMap(r => r.warnings);

  return {
    isValid: allErrors.length === 0,
    errors: [...new Set(allErrors)],
    warnings: [...new Set(allWarnings)],
  };
}