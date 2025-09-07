/**
 * 🗃️ NotionId Value Object
 * Notion 페이지/데이터베이스 ID를 위한 값 객체
 */

/**
 * Notion ID 값 객체
 */
export class NotionId {
  private constructor(private readonly _value: string) {
    if (!NotionId.isValid(_value)) {
      throw new Error(`Invalid Notion ID format: ${_value}`);
    }
  }

  /**
   * 문자열로부터 NotionId 생성
   */
  static fromString(value: string): NotionId {
    // Notion ID에서 하이픈 제거 후 정규화
    const normalized = value.replace(/-/g, '').toLowerCase();
    return new NotionId(normalized);
  }

  /**
   * URL에서 NotionId 추출
   */
  static fromUrl(url: string): NotionId {
    const match = url.match(/([a-f0-9]{32})/);
    if (!match) {
      throw new Error(`Cannot extract Notion ID from URL: ${url}`);
    }
    return new NotionId(match[1]);
  }

  /**
   * 유효성 검사
   */
  static isValid(value: string): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    
    // Notion ID는 32자리 헥사 문자열
    const cleanValue = value.replace(/-/g, '').toLowerCase();
    return /^[a-f0-9]{32}$/.test(cleanValue);
  }

  /**
   * 값 반환 (하이픈 없는 형태)
   */
  get value(): string {
    return this._value;
  }

  /**
   * UUID 형태로 반환 (하이픈 포함)
   */
  get uuid(): string {
    return [
      this._value.slice(0, 8),
      this._value.slice(8, 12),
      this._value.slice(12, 16),
      this._value.slice(16, 20),
      this._value.slice(20, 32)
    ].join('-');
  }

  /**
   * Notion URL 생성
   */
  toPageUrl(workspaceUrl?: string): string {
    const base = workspaceUrl || 'https://notion.so';
    return `${base}/${this.uuid}`;
  }

  /**
   * 동등성 비교
   */
  equals(other: NotionId): boolean {
    return this._value === other._value;
  }

  /**
   * 문자열 표현
   */
  toString(): string {
    return this._value;
  }

  /**
   * JSON 직렬화
   */
  toJSON(): string {
    return this._value;
  }
}