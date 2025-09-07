/**
 * Notion URL Builder Utility
 * Workspace URL을 사용하여 Notion 링크를 생성하는 유틸리티
 */

import type { ProcessedConfig } from '../types/index.js';

export class NotionUrlBuilder {
  private workspaceUrl: string;

  constructor(config: ProcessedConfig) {
    this.workspaceUrl = config.workspaceInfo?.workspaceUrl || 'https://www.notion.so/';
    // workspace URL이 /로 끝나지 않으면 추가
    if (!this.workspaceUrl.endsWith('/')) {
      this.workspaceUrl += '/';
    }
  }

  /**
   * 데이터베이스 또는 페이지 URL 생성
   */
  buildUrl(id: string): string {
    const cleanId = id.replace(/-/g, '');
    return `${this.workspaceUrl}${cleanId}`;
  }

  /**
   * 데이터베이스 URL 생성 (특별한 formatting)
   */
  buildDatabaseUrl(id: string): string {
    const cleanId = id.replace(/[^a-f0-9]/g, '');
    return `${this.workspaceUrl}${cleanId}`;
  }

  /**
   * 페이지 URL 생성
   */
  buildPageUrl(id: string): string {
    const cleanId = id.replace(/-/g, '');
    return `${this.workspaceUrl}${cleanId}`;
  }

  /**
   * 워크스페이스 URL 가져오기
   */
  getWorkspaceUrl(): string {
    return this.workspaceUrl;
  }

  /**
   * 정적 메서드 - 빠른 URL 생성
   */
  static buildQuickUrl(id: string, workspaceUrl?: string): string {
    const baseUrl = workspaceUrl || 'https://www.notion.so/';
    const cleanUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    const cleanId = id.replace(/-/g, '');
    return `${cleanUrl}${cleanId}`;
  }
}

/**
 * 편의 함수들
 */
export function createNotionUrlBuilder(config: ProcessedConfig): NotionUrlBuilder {
  return new NotionUrlBuilder(config);
}

export function buildNotionUrl(id: string, config: ProcessedConfig): string {
  const builder = new NotionUrlBuilder(config);
  return builder.buildUrl(id);
}