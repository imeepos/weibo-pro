import { describe, it, expect } from 'vitest';
import {
  structureToList,
  getLeafNodes,
  writeNodeId,
  getNodes,
  isLeafNode
} from '../../src/utils/tree.js';
import type { Node } from '../../src/types/node.types.js';

describe('structureToList', () => {
  it('应该扁平化简单树结构', () => {
    const tree: Node[] = [
      { title: 'Chapter 1' },
      { title: 'Chapter 2' },
    ];
    const result = structureToList(tree);
    expect(result).toHaveLength(2);
  });

  it('应该扁平化嵌套树结构', () => {
    const tree: Node[] = [
      {
        title: 'Chapter 1',
        nodes: [
          { title: 'Section 1.1' },
          { title: 'Section 1.2' },
        ],
      },
    ];
    const result = structureToList(tree);
    expect(result).toHaveLength(3); // 1 parent + 2 children
  });

  it('应该处理多层嵌套', () => {
    const tree: Node[] = [
      {
        title: 'Chapter 1',
        nodes: [
          {
            title: 'Section 1.1',
            nodes: [
              { title: 'Subsection 1.1.1' },
            ],
          },
        ],
      },
    ];
    const result = structureToList(tree);
    expect(result).toHaveLength(3);
  });
});

describe('getLeafNodes', () => {
  it('应该返回所有叶子节点', () => {
    const tree: Node[] = [
      {
        title: 'Parent',
        nodes: [
          { title: 'Child 1' },
          { title: 'Child 2' },
        ],
      },
    ];
    const leaves = getLeafNodes(tree);
    expect(leaves).toHaveLength(2);
    expect(leaves[0].title).toBe('Child 1');
  });

  it('应该处理空nodes数组', () => {
    const tree: Node[] = [
      {
        title: 'Node with empty children',
        nodes: [],
      },
    ];
    const leaves = getLeafNodes(tree);
    expect(leaves).toHaveLength(1);
  });
});

describe('writeNodeId', () => {
  it('应该为节点添加ID', () => {
    const tree: Node[] = [
      { title: 'Node 1' },
      { title: 'Node 2' },
    ];
    const nextId = writeNodeId(tree);
    expect(tree[0].node_id).toBe('0001');
    expect(tree[1].node_id).toBe('0002');
    expect(nextId).toBe(3);
  });

  it('应该处理嵌套结构', () => {
    const tree: Node[] = [
      {
        title: 'Parent',
        nodes: [
          { title: 'Child' },
        ],
      },
    ];
    writeNodeId(tree);
    expect(tree[0].node_id).toBe('0001');
    expect(tree[0].nodes![0].node_id).toBe('0002');
  });

  it('应该从指定ID开始', () => {
    const tree: Node[] = [{ title: 'Node' }];
    const nextId = writeNodeId(tree, 5);
    expect(tree[0].node_id).toBe('0006');
    expect(nextId).toBe(7);
  });
});

describe('isLeafNode', () => {
  it('应该识别叶子节点', () => {
    const tree: Node[] = [
      {
        title: 'Parent',
        nodes: [{ title: 'Child', node_id: '0002' }],
        node_id: '0001',
      },
    ];
    expect(isLeafNode(tree, '0002')).toBe(true);
    expect(isLeafNode(tree, '0001')).toBe(false);
  });
});
