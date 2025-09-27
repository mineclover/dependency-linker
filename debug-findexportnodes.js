const Parser = require('tree-sitter');
const TypeScript = require('tree-sitter-typescript').typescript;

// Initialize parser
const parser = new Parser();
parser.setLanguage(TypeScript);

// Test simple named export
const namedExportCode = `export { UserService, ApiService } from './services';`;

console.log('🔍 Testing findExportNodes for Named Re-export');
console.log('📝 Test Code:');
console.log(namedExportCode);
console.log('\n' + '='.repeat(60) + '\n');

// Parse the code
const ast = parser.parse(namedExportCode);

// Manually reproduce findExportNodes logic
function findExportNodes(rootNode) {
    const exportNodeTypes = new Set([
        "export_statement",
        "function_declaration",
        "class_declaration",
        "abstract_class_declaration",
        "variable_declaration",
        "lexical_declaration",
        "interface_declaration",
        "type_alias_declaration",
        "enum_declaration",
    ]);

    const allNodes = [];

    function traverse(node) {
        if (exportNodeTypes.has(node.type)) {
            allNodes.push(node);
        }
        for (let i = 0; i < node.childCount; i++) {
            const child = node.child(i);
            if (child) {
                traverse(child);
            }
        }
    }

    traverse(rootNode);

    console.log('Found nodes before filtering:');
    allNodes.forEach((node, i) => {
        console.log(`${i + 1}. ${node.type}: "${node.text.substring(0, 50)}"`);
    });

    // Apply the filter logic
    const filtered = allNodes.filter(node => {
        if (node.type === "export_statement") {
            console.log(`✅ Including export_statement: "${node.text.substring(0, 50)}"`);
            return true; // Always include export statements
        }

        // For declaration nodes, only include them if they're actually exported
        let parent = node.parent;
        let isExported = false;

        while (parent) {
            if (parent.type === "export_statement") {
                const exportText = parent.text;
                if (exportText.includes("export default")) {
                    console.log(`❌ Skipping default export declaration: "${node.text.substring(0, 50)}"`);
                    return false;
                } else {
                    console.log(`✅ Including exported declaration: "${node.text.substring(0, 50)}"`);
                    isExported = true;
                    break;
                }
            }
            parent = parent.parent;
        }

        if (!isExported) {
            const parentNode = node.parent;
            if (parentNode && parentNode.type === "program") {
                console.log(`❌ Skipping top-level declaration: "${node.text.substring(0, 50)}"`);
                return false;
            }
        }

        return isExported;
    });

    console.log('\nFiltered nodes:');
    filtered.forEach((node, i) => {
        console.log(`${i + 1}. ${node.type}: "${node.text.substring(0, 50)}"`);
    });

    return filtered;
}

const exportNodes = findExportNodes(ast.rootNode);
console.log(`\n📊 Final result: ${exportNodes.length} export nodes found`);