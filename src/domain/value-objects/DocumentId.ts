/**
 * 📋 DocumentId Value Object
 * 문서 식별자를 위한 값 객체
 */

import { randomBytes } from 'crypto';

/**
 * Document ID 값 객체
 * 불변성과 동등성을 보장하는 식별자
 */
export class DocumentId {
  private constructor(private readonly _value: string) {
    if (!DocumentId.isValid(_value)) {
      throw new Error(`Invalid DocumentId format: ${_value}`);
    }
  }

  /**
   * 새로운 DocumentId 생성
   */
  static generate(): DocumentId {
    // UUID v4 스타일의 ID 생성
    const timestamp = Date.now().toString(36);
    const random = randomBytes(8).toString('hex');
    const id = `doc_${timestamp}_${random}`;
    return new DocumentId(id);
  }

  /**
   * 문자열로부터 DocumentId 생성
   */
  static fromString(value: string): DocumentId {
    return new DocumentId(value);
  }

  /**
   * 유효성 검사
   */
  static isValid(value: string): boolean {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return false;
    }
    
    // doc_로 시작하고 최소 길이를 만족해야 함
    return /^doc_[a-z0-9_]+$/.test(value) && value.length >= 10;
  }

  /**
   * 값 반환
   */
  get value(): string {
    return this._value;
  }

  /**
   * 동등성 비교
   */
  equals(other: DocumentId): boolean {
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