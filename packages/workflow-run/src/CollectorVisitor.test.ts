import { describe, it, expect, beforeEach } from 'vitest';
import { CollectorVisitor } from './CollectorVisitor';

// Mock CollectorAst 类型
interface MockCollectorAst {
  items?: any[];
  result?: any;
  state?: string;
}

describe('CollectorVisitor', () => {
  let visitor: CollectorVisitor;

  beforeEach(() => {
    visitor = new CollectorVisitor();
  });

  describe('handler - 数组收集', () => {
    it('应该收集单层数组', (done) => {
      const items = [1, 2, 3];
      const ast: MockCollectorAst = {
        items,
      };

      visitor.handler(ast, {}).subscribe({
        next: (node) => {
          if (node.state === 'emitting') {
            expect(node.result).toEqual([1, 2, 3]);
          }
        },
        complete: () => {
          done();
        },
      });
    });

    it('应该处理空数组', (done) => {
      const ast: MockCollectorAst = {
        items: [],
      };

      visitor.handler(ast, {}).subscribe({
        next: (node) => {
          if (node.state === 'emitting') {
            expect(node.result).toEqual([]);
          }
        },
        complete: () => {
          done();
        },
      });
    });

    it('应该处理未定义的 items', (done) => {
      const ast: MockCollectorAst = {
        items: undefined,
      };

      visitor.handler(ast, {}).subscribe({
        next: (node) => {
          if (node.state === 'emitting') {
            expect(node.result).toEqual([]);
          }
        },
        complete: () => {
          done();
        },
      });
    });

    it('应该处理 null items', (done) => {
      const ast: MockCollectorAst = {
        items: null,
      };

      visitor.handler(ast, {}).subscribe({
        next: (node) => {
          if (node.state === 'emitting') {
            expect(node.result).toEqual(null);
          }
        },
        complete: () => {
          done();
        },
      });
    });
  });

  describe('展平 - IS_BUFFER 模式处理', () => {
    it('应该展平单层嵌套数组', (done) => {
      const nestedItems = [[1, 2], [3, 4]];
      const ast: MockCollectorAst = {
        items: nestedItems,
      };

      visitor.handler(ast, {}).subscribe({
        next: (node) => {
          if (node.state === 'emitting') {
            // 应该展平为 [1, 2, 3, 4]
            expect(node.result).toEqual([1, 2, 3, 4]);
          }
        },
        complete: () => {
          done();
        },
      });
    });

    it('应该处理嵌套的混合数据类型', (done) => {
      const nestedItems = [['a', 'b'], ['c']];
      const ast: MockCollectorAst = {
        items: nestedItems,
      };

      visitor.handler(ast, {}).subscribe({
        next: (node) => {
          if (node.state === 'emitting') {
            expect(node.result).toEqual(['a', 'b', 'c']);
          }
        },
        complete: () => {
          done();
        },
      });
    });

    it('不应该展平非数组元素的嵌套结构', (done) => {
      const nestedItems = [[1, 2], { key: 'value' }];
      const ast: MockCollectorAst = {
        items: nestedItems,
      };

      visitor.handler(ast, {}).subscribe({
        next: (node) => {
          if (node.state === 'emitting') {
            // 由于第二个元素不是数组，不应该展平
            expect(node.result).toEqual(nestedItems);
          }
        },
        complete: () => {
          done();
        },
      });
    });

    it('应该处理空的嵌套数组', (done) => {
      const nestedItems = [[], [1, 2]];
      const ast: MockCollectorAst = {
        items: nestedItems,
      };

      visitor.handler(ast, {}).subscribe({
        next: (node) => {
          if (node.state === 'emitting') {
            expect(node.result).toEqual([1, 2]);
          }
        },
        complete: () => {
          done();
        },
      });
    });
  });

  describe('数据类型处理', () => {
    it('应该处理对象数组', (done) => {
      const items = [{ id: 1 }, { id: 2 }];
      const ast: MockCollectorAst = {
        items,
      };

      visitor.handler(ast, {}).subscribe({
        next: (node) => {
          if (node.state === 'emitting') {
            expect(node.result).toEqual(items);
            expect(node.result[0].id).toBe(1);
          }
        },
        complete: () => {
          done();
        },
      });
    });

    it('应该处理字符串数组', (done) => {
      const items = ['a', 'b', 'c'];
      const ast: MockCollectorAst = {
        items,
      };

      visitor.handler(ast, {}).subscribe({
        next: (node) => {
          if (node.state === 'emitting') {
            expect(node.result).toEqual(['a', 'b', 'c']);
          }
        },
        complete: () => {
          done();
        },
      });
    });

    it('应该处理混合类型数组', (done) => {
      const items = [1, 'a', true, null];
      const ast: MockCollectorAst = {
        items,
      };

      visitor.handler(ast, {}).subscribe({
        next: (node) => {
          if (node.state === 'emitting') {
            expect(node.result).toEqual(items);
          }
        },
        complete: () => {
          done();
        },
      });
    });
  });

  describe('状态流转', () => {
    it('应该按正确顺序发出状态', (done) => {
      const ast: MockCollectorAst = {
        items: [1, 2],
      };

      const states: string[] = [];

      visitor.handler(ast, {}).subscribe({
        next: (node) => {
          states.push(node.state);
        },
        complete: () => {
          expect(states).toEqual(['running', 'emitting', 'success']);
          done();
        },
      });
    });

    it('应该在 success 后完成', (done) => {
      const ast: MockCollectorAst = {
        items: [1, 2],
      };

      let completed = false;

      visitor.handler(ast, {}).subscribe({
        complete: () => {
          completed = true;
          done();
        },
      });
    });
  });

  describe('大数据集处理', () => {
    it('应该处理大型数组', (done) => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      const ast: MockCollectorAst = {
        items: largeArray,
      };

      visitor.handler(ast, {}).subscribe({
        next: (node) => {
          if (node.state === 'emitting') {
            expect(node.result.length).toBe(10000);
          }
        },
        complete: () => {
          done();
        },
      });
    });

    it('应该处理大型嵌套数组的展平', (done) => {
      const largeNestedArray = Array.from({ length: 100 }, (_, i) =>
        Array.from({ length: 100 }, (_, j) => i * 100 + j),
      );
      const ast: MockCollectorAst = {
        items: largeNestedArray,
      };

      visitor.handler(ast, {}).subscribe({
        next: (node) => {
          if (node.state === 'emitting') {
            expect(node.result.length).toBe(10000);
          }
        },
        complete: () => {
          done();
        },
      });
    });
  });

  describe('边界情况', () => {
    it('应该处理只包含一个元素的数组', (done) => {
      const ast: MockCollectorAst = {
        items: [42],
      };

      visitor.handler(ast, {}).subscribe({
        next: (node) => {
          if (node.state === 'emitting') {
            expect(node.result).toEqual([42]);
          }
        },
        complete: () => {
          done();
        },
      });
    });

    it('应该处理深层嵌套（但仅展平一层）', (done) => {
      const items = [[[1, 2]], [[3, 4]]];
      const ast: MockCollectorAst = {
        items,
      };

      visitor.handler(ast, {}).subscribe({
        next: (node) => {
          if (node.state === 'emitting') {
            // 只展平一层，结果应该是 [[1,2], [3,4]]
            expect(node.result).toEqual([[1, 2], [3, 4]]);
          }
        },
        complete: () => {
          done();
        },
      });
    });
  });

  describe('AST 修改', () => {
    it('应该修改原始 AST 的 result 属性', (done) => {
      const items = [1, 2, 3];
      const ast: MockCollectorAst = {
        items,
      };

      visitor.handler(ast, {}).subscribe({
        complete: () => {
          expect(ast.result).toEqual([1, 2, 3]);
          done();
        },
      });
    });
  });
});
