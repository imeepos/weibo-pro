import { describe, it, expect, } from 'vitest';
import { buildTreeFromNodes, updateNodeListWithTextTokenCount, treeThinningForIndex } from '../../../src/markdown/tree-builder.js';
import type { Node } from '../../../src/types/node.types.js';

describe('buildTreeFromNodes', () => {
  it('应该构建正确的树结构', () => {
    const nodeList = [
      { title: 'Chapter 1', line_num: 1, level: 1, text: '' },
      { title: 'Section 1.1', line_num: 5, level: 2, text: '' },
      { title: 'Section 1.2', line_num: 10, level: 2, text: '' },
      { title: 'Chapter 2', line_num: 15, level: 1, text: '' },
    ];

    const tree = buildTreeFromNodes(nodeList);
    
    expect(tree).toHaveLength(2); // 2 chapters
    expect(tree[0].title).toBe('Chapter 1');
    expect(tree[0].nodes).toHaveLength(2); // 2 sections
    expect(tree[0].nodes![0].title).toBe('Section 1.1');
    expect(tree[0].nodes![1].title).toBe('Section 1.2');
    expect(tree[1].title).toBe('Chapter 2');
    expect(tree[1].nodes).toHaveLength(0);
  });

  it('应该处理三级嵌套', () => {
    const nodeList = [
      { title: 'Chapter 1', line_num: 1, level: 1, text: '' },
      { title: 'Section 1.1', line_num: 2, level: 2, text: '' },
      { title: 'Subsection 1.1.1', line_num: 3, level: 3, text: '' },
      { title: 'Section 1.2', line_num: 4, level: 2, text: '' },
    ];

    const tree = buildTreeFromNodes(nodeList);
    
    expect(tree).toHaveLength(1);
    expect(tree[0].nodes).toHaveLength(2);
    expect(tree[0].nodes![0].nodes).toHaveLength(1);
    expect(tree[0].nodes![0].nodes![0].title).toBe('Subsection 1.1.1');
  });

  it('应该处理空列表', () => {
    const tree = buildTreeFromNodes([]);
    expect(tree).toHaveLength(0);
  });

  it('应该处理单个节点', () => {
    const nodeList = [
      { title: 'Only Chapter', line_num: 1, level: 1, text: '' },
    ];

    const tree = buildTreeFromNodes(nodeList);
    expect(tree).toHaveLength(1);
    expect(tree[0].title).toBe('Only Chapter');
  });

  it('应该保留节点的所有属性', () => {
    const nodeList = [
      { title: 'Chapter 1', line_num: 1, level: 1, text: 'Content', nodes: [] },
    ];

    const tree = buildTreeFromNodes(nodeList);
    expect(tree[0].line_num).toBe(1);
    expect(tree[0].level).toBe(1);
    expect(tree[0].text).toBe('Content');
  });
});

describe('updateNodeListWithTextTokenCount', () => {
  it('应该计算节点自身的token数', () => {
    const nodeList: Node[] = [
      { title: 'Node 1', level: 1, text: 'This is some text' },
    ];

    const result = updateNodeListWithTextTokenCount(nodeList, 'gpt-4o');
    
    expect(result[0].text_token_count).toBeGreaterThan(0);
  });

  it('应该累加子节点的token数到父节点', () => {
    const nodeList: Node[] = [
      { 
        title: 'Parent', 
        level: 1, 
        text: 'Parent content',
        nodes: [
          { title: 'Child', level: 2, text: 'Child content' },
        ],
      },
    ];

    const result = updateNodeListWithTextTokenCount(nodeList, 'gpt-4o');
    
    // 父节点的token数应该 >= 子节点的token数
    expect(result[0].text_token_count!).toBeGreaterThan(
      (result[0].nodes![0] as Node).text_token_count || 0
    );
  });

  it('应该处理多层嵌套', () => {
    const nodeList: Node[] = [
      { 
        title: 'Root', 
        level: 1, 
        text: 'Root content',
        nodes: [
          { 
            title: 'Child', 
            level: 2, 
            text: 'Child content',
            nodes: [
              { title: 'Grandchild', level: 3, text: 'Grandchild content' },
            ],
          },
        ],
      },
    ];

    const result = updateNodeListWithTextTokenCount(nodeList, 'gpt-4o');
    
    // 每层都应该有token计数
    expect(result[0].text_token_count).toBeGreaterThan(0);
    expect((result[0].nodes![0] as Node).text_token_count).toBeGreaterThan(0);
    expect(((result[0].nodes![0] as Node).nodes![0] as Node).text_token_count).toBeGreaterThan(0);
  });

  it('应该处理空文本', () => {
    const nodeList: Node[] = [
      { title: 'Empty', level: 1, text: '' },
    ];

    const result = updateNodeListWithTextTokenCount(nodeList, 'gpt-4o');
    expect(result[0].text_token_count).toBe(0);
  });
});

describe('treeThinningForIndex', () => {
  it('应该合并token数过小的节点', () => {
    const nodeList: Node[] = [
      {
        title: 'Parent',
        level: 1,
        text: 'Short parent',
        text_token_count: 100,
        nodes: [
          { title: 'Child 1', level: 2, text: 'Short child 1', text_token_count: 50 },
          { title: 'Child 2', level: 2, text: 'Short child 2', text_token_count: 50 },
        ],
      },
    ];

    const thinned = treeThinningForIndex(nodeList, 500, 'gpt-4o');

    // 父节点的text应该包含子节点文本
    expect(thinned[0].text).toContain('Short child 1');
    expect(thinned[0].text).toContain('Short child 2');
    // 子节点应该被清空
    expect(thinned[0].nodes).toHaveLength(0);
  });

  it('应该保留token数足够的节点', () => {
    const nodeList: Node[] = [
      {
        title: 'Large Node',
        level: 1,
        text: 'A'.repeat(1000),
        text_token_count: 1000,
        nodes: [],
      },
    ];

    const thinned = treeThinningForIndex(nodeList, 500, 'gpt-4o');
    
    expect(thinned).toHaveLength(1);
    expect(thinned[0].text).toContain('A');
  });

  it('应该处理空列表', () => {
    const thinned = treeThinningForIndex([], 500, 'gpt-4o');
    expect(thinned).toHaveLength(0);
  });
});
