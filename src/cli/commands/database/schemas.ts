/**
 * Database Schema Definitions
 * 기본 스키마 정의를 별도 파일로 분리
 */

export const DEFAULT_SCHEMAS = {
  files: {
    "Language": {
      type: "select",
      select: {
        options: [
          { name: "TypeScript", color: "blue" },
          { name: "JavaScript", color: "yellow" },
          { name: "Python", color: "green" },
          { name: "Go", color: "purple" },
          { name: "Rust", color: "red" },
          { name: "Other", color: "gray" }
        ]
      }
    },
    "Dependencies Count": { type: "number", number: {} },
    "Local Dependencies Count": { type: "number", number: {} },
    "Library Dependencies Count": { type: "number", number: {} },
    "Functions Count": { type: "number", number: {} },
    "Classes Count": { type: "number", number: {} },
    "Analysis Time": { type: "rich_text", rich_text: {} },
    "Status": {
      type: "select",
      select: {
        options: [
          { name: "Uploaded", color: "green" },
          { name: "Updated", color: "blue" },
          { name: "Error", color: "red" }
        ]
      }
    }
  },
  
  functions: {
    "File Path": { type: "rich_text", rich_text: {} },
    "Language": {
      type: "select",
      select: {
        options: [
          { name: "TypeScript", color: "blue" },
          { name: "JavaScript", color: "yellow" },
          { name: "Python", color: "green" },
          { name: "Go", color: "purple" },
          { name: "Rust", color: "red" }
        ]
      }
    },
    "Line Number": { type: "number", number: {} },
    "Parameters Count": { type: "number", number: {} },
    "Return Type": { type: "rich_text", rich_text: {} },
    "Is Async": { type: "checkbox", checkbox: {} },
    "Is Exported": { type: "checkbox", checkbox: {} },
    "Complexity": {
      type: "select",
      select: {
        options: [
          { name: "Low", color: "green" },
          { name: "Medium", color: "yellow" },
          { name: "High", color: "red" }
        ]
      }
    },
    "Description": { type: "rich_text", rich_text: {} },
    "Project": {
      type: "select",
      select: {
        options: [{ name: "dependency-linker", color: "blue" }]
      }
    }
  },

  dependencies: {
    "File Path": { type: "rich_text", rich_text: {} },
    "Language": {
      type: "select",
      select: {
        options: [
          { name: "TypeScript", color: "blue" },
          { name: "JavaScript", color: "yellow" },
          { name: "Python", color: "green" },
          { name: "Go", color: "purple" },
          { name: "Rust", color: "red" }
        ]
      }
    },
    "Type": {
      type: "select",
      select: {
        options: [
          { name: "Local", color: "blue" },
          { name: "Library", color: "green" },
          { name: "Built-in", color: "gray" }
        ]
      }
    },
    "Import Statement": { type: "rich_text", rich_text: {} },
    "Line Number": { type: "number", number: {} },
    "Project": {
      type: "select",
      select: {
        options: [{ name: "dependency-linker", color: "blue" }]
      }
    }
  },

  libraries: {
    "Version": { type: "rich_text", rich_text: {} },
    "Package Manager": {
      type: "select",
      select: {
        options: [
          { name: "npm", color: "red" },
          { name: "yarn", color: "blue" },
          { name: "pnpm", color: "orange" },
          { name: "bun", color: "yellow" },
          { name: "pip", color: "green" },
          { name: "cargo", color: "orange" },
          { name: "go mod", color: "blue" }
        ]
      }
    },
    "Category": {
      type: "select",
      select: {
        options: [
          { name: "Framework", color: "purple" },
          { name: "Library", color: "blue" },
          { name: "Utility", color: "green" },
          { name: "Dev Tool", color: "orange" },
          { name: "Testing", color: "yellow" },
          { name: "Build Tool", color: "red" }
        ]
      }
    },
    "Language": {
      type: "select",
      select: {
        options: [
          { name: "TypeScript", color: "blue" },
          { name: "JavaScript", color: "yellow" },
          { name: "Python", color: "green" },
          { name: "Go", color: "purple" },
          { name: "Rust", color: "red" }
        ]
      }
    },
    "Is Dev Dependency": { type: "checkbox", checkbox: {} },
    "Description": { type: "rich_text", rich_text: {} },
    "Project": {
      type: "select",
      select: {
        options: [{ name: "dependency-linker", color: "blue" }]
      }
    }
  },

  classes: {
    "File Path": { type: "rich_text", rich_text: {} },
    "Language": {
      type: "select",
      select: {
        options: [
          { name: "TypeScript", color: "blue" },
          { name: "JavaScript", color: "yellow" },
          { name: "Python", color: "green" },
          { name: "Go", color: "purple" },
          { name: "Rust", color: "red" }
        ]
      }
    },
    "Line Number": { type: "number", number: {} },
    "Methods Count": { type: "number", number: {} },
    "Properties Count": { type: "number", number: {} },
    "Is Exported": { type: "checkbox", checkbox: {} },
    "Is Abstract": { type: "checkbox", checkbox: {} },
    "Extends": { type: "rich_text", rich_text: {} },
    "Implements": { type: "rich_text", rich_text: {} },
    "Description": { type: "rich_text", rich_text: {} },
    "Project": {
      type: "select",
      select: {
        options: [{ name: "dependency-linker", color: "blue" }]
      }
    }
  }
};