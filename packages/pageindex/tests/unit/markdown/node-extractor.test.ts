import { describe, it, expect } from 'vitest';
import { extractNodesFromMarkdown, extractNodeTextContent } from '../../../src/markdown/node-extractor.js';

describe('extractNodesFromMarkdown', () => {
  it('应该提取所有标题', () => {
    const markdown = `# Chapter 1

Some content here.

## Section 1.1

More content.

### Subsection 1.1.1

Even more content.`;

    const [nodes, _lines] = extractNodesFromMarkdown(markdown);
    
    expect(nodes).toHaveLength(3);
    expect(nodes[0].node_title).toBe('Chapter 1');
    expect(nodes[1].node_title).toBe('Section 1.1');
    expect(nodes[2].node_title).toBe('Subsection 1.1.1');
  });

  it('应该跳过代码块中的标题', () => {
    const markdown = `# Real Header

\`\`\`
# Fake Header in Code
\`\`\`

# Another Real Header`;

    const [nodes] = extractNodesFromMarkdown(markdown);
    
    expect(nodes).toHaveLength(2);
    expect(nodes[0].node_title).toBe('Real Header');
    expect(nodes[1].node_title).toBe('Another Real Header');
  });

  it('应该记录正确的行号（从1开始）', () => {
    const markdown = `Line 1
Line 2
# Header at line 3
Line 4`;

    const [nodes] = extractNodesFromMarkdown(markdown);
    
    expect(nodes[0].line_num).toBe(3);
  });

  it('应该支持多级标题（1-6级）', () => {
    const markdown = `# Level 1
## Level 2
### Level 3
#### Level 4
##### Level 5
###### Level 6`;

    const [nodes] = extractNodesFromMarkdown(markdown);
    
    expect(nodes).toHaveLength(6);
  });

  it('应该处理空内容', () => {
    const markdown = ``;
    const [nodes, lines] = extractNodesFromMarkdown(markdown);
    
    expect(nodes).toHaveLength(0);
    expect(lines).toHaveLength(0);
  });
});

describe('extractNodeTextContent', () => {
  it('应该提取标题对应的内容', () => {
    const markdown = `# Chapter 1

This is the content of chapter 1.

## Section 1.1

Content of section 1.1.`;

    const [nodes, lines] = extractNodesFromMarkdown(markdown);
    const nodesWithText = extractNodeTextContent(nodes, lines);
    
    expect(nodesWithText[0].text).toContain('This is the content of chapter 1');
    expect(nodesWithText[1].text).toContain('Content of section 1.1');
  });

  it('应该正确设置标题级别', () => {
    const markdown = `# Level 1
## Level 2
### Level 3`;

    const [nodes, lines] = extractNodesFromMarkdown(markdown);
    const nodesWithText = extractNodeTextContent(nodes, lines);
    
    expect(nodesWithText[0].level).toBe(1);
    expect(nodesWithText[1].level).toBe(2);
    expect(nodesWithText[2].level).toBe(3);
  });

  it('应该保留行号信息', () => {
    const markdown = `# Header`;

    const [nodes, lines] = extractNodesFromMarkdown(markdown);
    const nodesWithText = extractNodeTextContent(nodes, lines);
    
    expect(nodesWithText[0].line_num).toBe(1);
  });

  it('应该处理标题后没有内容的情况', () => {
    const markdown = `# Header 1

# Header 2`;

    const [nodes, lines] = extractNodesFromMarkdown(markdown);
    const nodesWithText = extractNodeTextContent(nodes, lines);
    
    expect(nodesWithText[0].text).toBe('');
    expect(nodesWithText[1].text).toBe('');
  });

  it('应该处理文档末尾没有空行的情况', () => {
    const markdown = `# Chapter 1
Content here
## Section 1.1
More content`;

    const [nodes, lines] = extractNodesFromMarkdown(markdown);
    const nodesWithText = extractNodeTextContent(nodes, lines);
    
    expect(nodesWithText[0].text).toContain('Content here');
    expect(nodesWithText[1].text).toContain('More content');
  });
});
