import { extractNodesFromMarkdown, extractNodeTextContent } from './src/markdown/node-extractor.js';
import { buildTreeFromNodes } from './src/markdown/tree-builder.js';

const testMarkdown = `# Chapter 1

Content of chapter 1.

## Section 1.1

Content of section 1.1.

# Chapter 2

Content of chapter 2.`;

const [nodes, lines] = extractNodesFromMarkdown(testMarkdown);
console.log('Nodes:', nodes);

const nodesWithText = extractNodeTextContent(nodes, lines);
console.log('Nodes with text:', nodesWithText);

const tree = buildTreeFromNodes(nodesWithText);
console.log('Tree:', JSON.stringify(tree, null, 2));
