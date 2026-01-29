const markdown = `# Chapter 1

Content of chapter 1.

## Section 1.1

Content of section 1.1.

# Chapter 2

Content of chapter 2.`;

// 手动测试
const lines = markdown.split('\n');
const nodes = [];

let inCodeBlock = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.trim().startsWith('```') || line.trim().startsWith('~~~')) {
    inCodeBlock = !inCodeBlock;
    continue;
  }
  if (inCodeBlock) continue;
  const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
  if (headingMatch) {
    nodes.push({
      node_title: headingMatch[2].trim(),
      line_num: i + 1,
    });
  }
}

console.log('Extracted nodes:', nodes);

// 测试extractNodeTextContent
const nodeList = nodes.map(n => ({title: n.node_title, line_num: n.line_num}));
const result = [];
for (let i = 0; i < nodeList.length; i++) {
  const node = nodeList[i];
  const startLine = node.line_num - 1;
  const endLine = i < nodeList.length - 1 ? nodeList[i + 1].line_num - 1 : lines.length;
  const headingMatch = lines[startLine].match(/^(#{1,6})\s+/);
  const level = headingMatch ? headingMatch[1].length : 1;
  const content = lines.slice(startLine + 1, endLine).join('\n');
  result.push({
    title: node.title,
    line_num: node.line_num,
    level,
    text: content,
  });
}

console.log('Nodes with text:', JSON.stringify(result, null, 2));
