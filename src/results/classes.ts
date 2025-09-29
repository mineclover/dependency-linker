/**
 * Class Related Result Types
 * 클래스 관련 쿼리 결과 타입들
 */

import type { BaseQueryResult } from "../core/types";

/**
 * Class Definition 분석 결과
 */
export interface ClassDefinitionResult extends BaseQueryResult {
  queryName: "class-definitions" | "ts-class-definitions" | "js-class-definitions" | "java-class-definitions";
  className: string;
  isExported: boolean;
  isAbstract?: boolean; // TypeScript/Java
  superClass?: string;
  implements?: string[]; // TypeScript/Java
  accessModifier?: "public" | "private" | "protected"; // TypeScript/Java
}

/**
 * Interface Definition 분석 결과 (TypeScript/Java)
 */
export interface InterfaceDefinitionResult extends BaseQueryResult {
  queryName: "ts-interface-definitions" | "java-interface-definitions";
  interfaceName: string;
  isExported: boolean; // TypeScript만
  extends?: string[];
  accessModifier?: "public" | "private" | "protected"; // Java만
}

/**
 * Method Definition 분석 결과
 */
export interface MethodDefinitionResult extends BaseQueryResult {
  queryName: "method-definitions" | "ts-method-definitions" | "js-method-definitions" | "java-method-definitions";
  methodName: string;
  className: string;
  isStatic: boolean;
  isAsync?: boolean; // TypeScript/JavaScript
  isAbstract?: boolean; // TypeScript/Java
  accessModifier?: "public" | "private" | "protected";
  parameters: Array<{
    name: string;
    type?: string;
    isOptional?: boolean;
    defaultValue?: string;
  }>;
  returnType?: string;
}

/**
 * Property Definition 분석 결과
 */
export interface PropertyDefinitionResult extends BaseQueryResult {
  queryName: "property-definitions" | "ts-property-definitions" | "js-property-definitions" | "java-property-definitions";
  propertyName: string;
  className: string;
  isStatic: boolean;
  isReadonly?: boolean; // TypeScript
  isFinal?: boolean; // Java
  accessModifier?: "public" | "private" | "protected";
  type?: string;
  initialValue?: string;
}

/**
 * Struct Definition 분석 결과 (Go)
 */
export interface StructDefinitionResult extends BaseQueryResult {
  queryName: "go-struct-definitions";
  structName: string;
  isExported: boolean;
  fields: Array<{
    name: string;
    type: string;
    tag?: string;
    isEmbedded: boolean;
  }>;
}

/**
 * Enum Definition 분석 결과
 */
export interface EnumDefinitionResult extends BaseQueryResult {
  queryName: "ts-enum-definitions" | "java-enum-definitions";
  enumName: string;
  isExported: boolean; // TypeScript만
  accessModifier?: "public" | "private" | "protected"; // Java만
  members: Array<{
    name: string;
    value?: string | number;
  }>;
}