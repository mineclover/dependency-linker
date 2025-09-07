/**
 * 📁 FilePath Value Object
 * 파일 경로를 위한 값 객체
 */

import * as path from 'path';

/**
 * 파일 경로 값 객체
 */
export class FilePath {
  private constructor(private readonly _value: string) {
    if (!FilePath.isValid(_value)) {
      throw new Error(`Invalid file path: ${_value}`);
    }
  }

  /**
   * 문자열로부터 FilePath 생성
   */
  static fromString(value: string): FilePath {
    const normalized = path.normalize(value);
    return new FilePath(normalized);
  }

  /**
   * 상대 경로로부터 FilePath 생성
   */
  static fromRelative(relativePath: string, basePath?: string): FilePath {
    const base = basePath || process.cwd();
    const absolute = path.resolve(base, relativePath);
    return new FilePath(absolute);
  }

  /**
   * 유효성 검사
   */
  static isValid(value: string): boolean {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return false;
    }
    
    // 기본적인 경로 형식 검증
    return !value.includes('\0') && value.length < 4096;
  }

  /**
   * 값 반환
   */
  get value(): string {
    return this._value;
  }

  /**
   * 절대 경로 반환
   */
  get absolutePath(): string {
    return path.isAbsolute(this._value) ? this._value : path.resolve(this._value);
  }

  /**
   * 상대 경로 반환
   */
  getRelativePath(basePath?: string): string {
    const base = basePath || process.cwd();
    return path.relative(base, this.absolutePath);
  }

  /**
   * 디렉토리 경로 반환
   */
  get directory(): string {
    return path.dirname(this._value);
  }

  /**
   * 파일명 반환
   */
  get filename(): string {
    return path.basename(this._value);
  }

  /**
   * 확장자 반환
   */
  get extension(): string {
    return path.extname(this._value);
  }

  /**
   * 확장자 없는 파일명 반환
   */
  get basename(): string {
    return path.basename(this._value, this.extension);
  }

  /**
   * 파일 타입 확인
   */
  isMarkdown(): boolean {
    return ['.md', '.markdown'].includes(this.extension.toLowerCase());
  }

  isTypeScript(): boolean {
    return ['.ts', '.tsx'].includes(this.extension.toLowerCase());
  }

  isJavaScript(): boolean {
    return ['.js', '.jsx', '.mjs', '.cjs'].includes(this.extension.toLowerCase());
  }

  isCode(): boolean {
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.java', '.go', '.rs'];
    return codeExtensions.includes(this.extension.toLowerCase());
  }

  /**
   * 경로 결합
   */
  join(...segments: string[]): FilePath {
    const joinedPath = path.join(this._value, ...segments);
    return new FilePath(joinedPath);
  }

  /**
   * 동등성 비교
   */
  equals(other: FilePath): boolean {
    return path.normalize(this._value) === path.normalize(other._value);
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