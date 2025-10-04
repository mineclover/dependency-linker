import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';

const parser = new Parser();
parser.setLanguage(TypeScript.typescript);

const code = `
class Counter {
  private count: number = 0;
  
  increment(): void {
    this.count++;
  }
}
`;

const tree = parser.parse(code);

function printTree(node, depth = 0) {
  const indent = '  '.repeat(depth);
  console.log(`${indent}${node.type}`);
  
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) printTree(child, depth + 1);
  }
}

console.log("=== Full AST structure ===");
printTree(tree.rootNode);
