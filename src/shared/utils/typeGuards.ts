/**
 * Type Guards - Runtime Type Safety
 * 런타임에서 타입 안전성을 보장하는 타입 가드 함수들
 */

import type { 
  NotionConfig, 
  NotionPage, 
  NotionBlock, 
  FrontMatterData,
  ProjectFile,
  NotionPageProperties
} from '../types/index.js';

/**
 * NotionConfig 타입 가드
 */
export function isNotionConfig(obj: unknown): obj is NotionConfig {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const config = obj as Record<string, unknown>;
  return (
    typeof config.apiKey === 'string' &&
    typeof config.databases === 'object' &&
    config.databases !== null &&
    (config.environment === undefined || 
     ['development', 'test', 'production'].includes(config.environment as string))
  );
}

/**
 * NotionPage 타입 가드
 */
export function isNotionPage(obj: unknown): obj is NotionPage {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const page = obj as Record<string, unknown>;
  return (
    typeof page.id === 'string' &&
    page.object === 'page' &&
    typeof page.created_time === 'string' &&
    typeof page.properties === 'object' &&
    page.properties !== null
  );
}

/**
 * NotionBlock 타입 가드
 */
export function isNotionBlock(obj: unknown): obj is NotionBlock {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const block = obj as Record<string, unknown>;
  return (
    typeof block.id === 'string' &&
    typeof block.type === 'string' &&
    block.object === 'block' &&
    typeof block.created_time === 'string'
  );
}

/**
 * FrontMatterData 타입 가드
 */
export function isFrontMatterData(obj: unknown): obj is FrontMatterData {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const fm = obj as Record<string, unknown>;
  return (
    (fm.title === undefined || typeof fm.title === 'string') &&
    (fm.description === undefined || typeof fm.description === 'string') &&
    (fm.tags === undefined || Array.isArray(fm.tags)) &&
    (fm.notion_id === undefined || typeof fm.notion_id === 'string')
  );
}

/**
 * ProjectFile 타입 가드
 */
export function isProjectFile(obj: unknown): obj is ProjectFile {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const file = obj as Record<string, unknown>;
  return (
    typeof file.path === 'string' &&
    typeof file.relativePath === 'string' &&
    typeof file.size === 'number' &&
    typeof file.extension === 'string' &&
    file.lastModified instanceof Date
  );
}

/**
 * NotionPageProperties 타입 가드
 */
export function isNotionPageProperties(obj: unknown): obj is NotionPageProperties {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const props = obj as Record<string, unknown>;
  for (const [key, value] of Object.entries(props)) {
    if (typeof key !== 'string') return false;
    if (typeof value !== 'object' || value === null) return false;
    if (typeof (value as Record<string, unknown>).type !== 'string') return false;
  }
  
  return true;
}

/**
 * 배열의 모든 요소가 특정 타입인지 확인하는 유틸리티
 */
export function isArrayOf<T>(
  arr: unknown, 
  guard: (item: unknown) => item is T
): arr is T[] {
  return Array.isArray(arr) && arr.every(guard);
}

/**
 * 안전한 JSON 파싱
 */
export function safeJsonParse(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * 안전한 객체 키 접근
 */
export function hasProperty<T extends Record<string, unknown>>(
  obj: T, 
  key: string
): key is Extract<keyof T, string> {
  return Object.prototype.hasOwnProperty.call(obj, key) && typeof key === 'string';
}

/**
 * 값이 null이나 undefined가 아님을 확인
 */
export function isNotNullOrUndefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * 문자열이 비어있지 않음을 확인
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * 객체가 특정 필수 키들을 가지고 있는지 확인
 */
export function hasRequiredKeys<T extends Record<string, unknown>>(
  obj: unknown,
  requiredKeys: string[]
): obj is T {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const record = obj as Record<string, unknown>;
  return requiredKeys.every(key => hasProperty(record, key));
}