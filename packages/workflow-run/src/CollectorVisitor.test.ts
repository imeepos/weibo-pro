import { describe, it, expect, beforeEach } from 'vitest';
import { CollectorVisitor } from './CollectorVisitor';
import { CollectorAst } from '@sker/workflow';

describe('CollectorVisitor', () => {
  let visitor: CollectorVisitor;

  beforeEach(() => {
    visitor = new CollectorVisitor();
  });

  function createAst(items?: any[]): CollectorAst {
    const ast = new CollectorAst();
    if (items !== undefined) {
      ast.items = items as any;
    }
    return ast;
  }

  describe('handler - 数组收集', () => {
    it('应该收集单层数组', () => {
      return new Promise<void>((resolve) => {
        const items = [1, 2, 3];
        const ast = createAst(items);

        visitor.handler(ast, {}).subscribe({
          next: (node) => {
            if (node.state === 'success') {
              expect(node.result.getValue()).toEqual([1, 2, 3]);
            }
          },
          complete: () => {
            resolve();
          },
        });
      });
    });

    it('应该处理空数组', () => {
      return new Promise<void>((resolve) => {
        const ast = createAst([]);

        visitor.handler(ast, {}).subscribe({
          next: (node) => {
            if (node.state === 'success') {
              expect(node.result.getValue()).toEqual([]);
            }
          },
          complete: () => {
            resolve();
          },
        });
      });
    });

    it('应该处理未定义的 items', () => {
      return new Promise<void>((resolve) => {
        const ast = createAst(undefined);

        visitor.handler(ast, {}).subscribe({
          next: (node) => {
            if (node.state === 'success') {
              expect(node.result.getValue()).toEqual([]);
            }
          },
          complete: () => {
            resolve();
          },
        });
      });
    });
  });

  describe('展平 - IS_BUFFER 模式处理', () => {
    it('应该展平单层嵌套数组', () => {
      return new Promise<void>((resolve) => {
        const nestedItems = [[1, 2], [3, 4]];
        const ast = createAst(nestedItems);

        visitor.handler(ast, {}).subscribe({
          next: (node) => {
            if (node.state === 'success') {
              expect(node.result.getValue()).toEqual([1, 2, 3, 4]);
            }
          },
          complete: () => {
            resolve();
          },
        });
      });
    });

    it('应该处理嵌套的混合数据类型', () => {
      return new Promise<void>((resolve) => {
        const nestedItems = [['a', 'b'], ['c']];
        const ast = createAst(nestedItems);

        visitor.handler(ast, {}).subscribe({
          next: (node) => {
            if (node.state === 'success') {
              expect(node.result.getValue()).toEqual(['a', 'b', 'c']);
            }
          },
          complete: () => {
            resolve();
          },
        });
      });
    });

    it('应该只在第一个元素是数组时展平', () => {
      return new Promise<void>((resolve) => {
        const nestedItems = [[1, 2], { key: 'value' }];
        const ast = createAst(nestedItems);

        visitor.handler(ast, {}).subscribe({
          next: (node) => {
            if (node.state === 'success') {
              expect(Array.isArray(node.result.getValue()[0])).toBe(false);
            }
          },
          complete: () => {
            resolve();
          },
        });
      });
    });

    it('应该处理空的嵌套数组', () => {
      return new Promise<void>((resolve) => {
        const nestedItems = [[], [1, 2]];
        const ast = createAst(nestedItems);

        visitor.handler(ast, {}).subscribe({
          next: (node) => {
            if (node.state === 'success') {
              expect(node.result.getValue()).toEqual([1, 2]);
            }
          },
          complete: () => {
            resolve();
          },
        });
      });
    });
  });

  describe('数据类型处理', () => {
    it('应该处理对象数组', () => {
      return new Promise<void>((resolve) => {
        const items = [{ id: 1 }, { id: 2 }];
        const ast = createAst(items);

        visitor.handler(ast, {}).subscribe({
          next: (node) => {
            if (node.state === 'success') {
              const result = node.result.getValue();
              expect(result).toEqual(items);
              expect(result[0].id).toBe(1);
            }
          },
          complete: () => {
            resolve();
          },
        });
      });
    });

    it('应该处理字符串数组', () => {
      return new Promise<void>((resolve) => {
        const items = ['a', 'b', 'c'];
        const ast = createAst(items);

        visitor.handler(ast, {}).subscribe({
          next: (node) => {
            if (node.state === 'success') {
              expect(node.result.getValue()).toEqual(['a', 'b', 'c']);
            }
          },
          complete: () => {
            resolve();
          },
        });
      });
    });

    it('应该处理混合类型数组', () => {
      return new Promise<void>((resolve) => {
        const items = [1, 'a', true, null];
        const ast = createAst(items);

        visitor.handler(ast, {}).subscribe({
          next: (node) => {
            if (node.state === 'success') {
              expect(node.result.getValue()).toEqual(items);
            }
          },
          complete: () => {
            resolve();
          },
        });
      });
    });
  });

  describe('状态流转', () => {
    it('应该按正确顺序发出状态', () => {
      return new Promise<void>((resolve) => {
        const ast = createAst([1, 2]);
        const states: string[] = [];

        visitor.handler(ast, {}).subscribe({
          next: (node) => {
            states.push(node.state);
          },
          complete: () => {
            expect(states).toContain('running');
            expect(states).toContain('success');
            resolve();
          },
        });
      });
    });

    it('应该在 success 后完成', () => {
      return new Promise<void>((resolve) => {
        const ast = createAst([1, 2]);

        visitor.handler(ast, {}).subscribe({
          complete: () => {
            resolve();
          },
        });
      });
    });
  });

  describe('大数据集处理', () => {
    it('应该处理大型数组', () => {
      return new Promise<void>((resolve) => {
        const largeArray = Array.from({ length: 10000 }, (_, i) => i);
        const ast = createAst(largeArray);

        visitor.handler(ast, {}).subscribe({
          next: (node) => {
            if (node.state === 'success') {
              expect(node.result.getValue().length).toBe(10000);
            }
          },
          complete: () => {
            resolve();
          },
        });
      });
    });

    it('应该处理大型嵌套数组的展平', () => {
      return new Promise<void>((resolve) => {
        const largeNestedArray = Array.from({ length: 100 }, (_, i) =>
          Array.from({ length: 100 }, (_, j) => i * 100 + j),
        );
        const ast = createAst(largeNestedArray);

        visitor.handler(ast, {}).subscribe({
          next: (node) => {
            if (node.state === 'success') {
              expect(node.result.getValue().length).toBe(10000);
            }
          },
          complete: () => {
            resolve();
          },
        });
      });
    });
  });

  describe('边界情况', () => {
    it('应该处理只包含一个元素的数组', () => {
      return new Promise<void>((resolve) => {
        const ast = createAst([42]);

        visitor.handler(ast, {}).subscribe({
          next: (node) => {
            if (node.state === 'success') {
              expect(node.result.getValue()).toEqual([42]);
            }
          },
          complete: () => {
            resolve();
          },
        });
      });
    });

    it('应该处理深层嵌套（但仅展平一层）', () => {
      return new Promise<void>((resolve) => {
        const items = [[[1, 2]], [[3, 4]]];
        const ast = createAst(items);

        visitor.handler(ast, {}).subscribe({
          next: (node) => {
            if (node.state === 'success') {
              expect(node.result.getValue()).toEqual([[1, 2], [3, 4]]);
            }
          },
          complete: () => {
            resolve();
          },
        });
      });
    });
  });

  describe('AST 修改', () => {
    it('应该修改原始 AST 的 result 属性', () => {
      return new Promise<void>((resolve) => {
        const items = [1, 2, 3];
        const ast = createAst(items);

        visitor.handler(ast, {}).subscribe({
          complete: () => {
            expect(ast.result.getValue()).toEqual([1, 2, 3]);
            resolve();
          },
        });
      });
    });
  });
});
