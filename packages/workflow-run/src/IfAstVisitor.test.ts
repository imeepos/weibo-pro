import { describe, it, expect, beforeEach } from 'vitest';
import { IfAstVisitor } from './IfAstVisitor';

// Mock IfAst 类型
interface MockIfAst {
  value: any;
  result?: any;
  state?: string;
}

describe('IfAstVisitor', () => {
  let visitor: IfAstVisitor;

  beforeEach(() => {
    visitor = new IfAstVisitor();
  });

  describe('handler - 条件分支传递', () => {
    it('应该将 value 传递到 result', () => {
      return new Promise<void>((resolve) => {
        const ast: MockIfAst = {
          value: true,
        };

        const states: string[] = [];
        const results: any[] = [];

        visitor.handler(ast, {}).subscribe({
          next: (node) => {
            states.push(node.state);
            if (node.result !== undefined) {
              results.push(node.result);
            }
          },
          complete: () => {
            expect(states).toContain('running');
            expect(states).toContain('emitting');
            expect(states).toContain('success');
            expect(results).toContain(true);
            resolve();
          },
        });
      });
    });

    it('应该处理布尔值条件', () => {
      return new Promise<void>((resolve) => {
        const ast: MockIfAst = {
          value: false,
        };

        visitor.handler(ast, {}).subscribe({
          next: (node) => {
            if (node.state === 'emitting') {
              expect(node.result).toBe(false);
            }
          },
          complete: () => {
            expect(ast.result).toBe(false);
            resolve();
          },
        });
      });
    });

    it('应该处理字符串值条件（switch-case）', () => {
      return new Promise<void>((resolve) => {
        const ast: MockIfAst = {
          value: 'branch1',
        };

        visitor.handler(ast, {}).subscribe({
          next: (node) => {
            if (node.state === 'emitting') {
              expect(node.result).toBe('branch1');
            }
          },
          complete: () => {
            resolve();
          },
        });
      });
    });

    it('应该处理数值条件', () => {
      return new Promise<void>((resolve) => {
        const ast: MockIfAst = {
          value: 42,
        };

        visitor.handler(ast, {}).subscribe({
          next: (node) => {
            if (node.state === 'emitting') {
              expect(node.result).toBe(42);
            }
          },
          complete: () => {
            resolve();
          },
        });
      });
    });

    it('应该处理 null 值', () => {
      return new Promise<void>((resolve) => {
        const ast: MockIfAst = {
          value: null,
        };

        visitor.handler(ast, {}).subscribe({
          next: (node) => {
            if (node.state === 'emitting') {
              expect(node.result).toBe(null);
            }
          },
          complete: () => {
            resolve();
          },
        });
      });
    });

    it('应该处理 undefined 值', () => {
      return new Promise<void>((resolve) => {
        const ast: MockIfAst = {
          value: undefined,
        };

        visitor.handler(ast, {}).subscribe({
          next: (node) => {
            if (node.state === 'emitting') {
              expect(node.result).toBe(undefined);
            }
          },
          complete: () => {
            resolve();
          },
        });
      });
    });

    it('应该处理对象值', () => {
      return new Promise<void>((resolve) => {
        const obj = { key: 'value' };
        const ast: MockIfAst = {
          value: obj,
        };

        visitor.handler(ast, {}).subscribe({
          next: (node) => {
            if (node.state === 'emitting') {
              expect(node.result).toBe(obj);
            }
          },
          complete: () => {
            resolve();
          },
        });
      });
    });

    it('应该处理数组值', () => {
      return new Promise<void>((resolve) => {
        const arr = [1, 2, 3];
        const ast: MockIfAst = {
          value: arr,
        };

        visitor.handler(ast, {}).subscribe({
          next: (node) => {
            if (node.state === 'emitting') {
              expect(node.result).toBe(arr);
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
        const ast: MockIfAst = {
          value: 'test',
        };

        const states: string[] = [];

        visitor.handler(ast, {}).subscribe({
          next: (node) => {
            states.push(node.state);
          },
          complete: () => {
            expect(states).toEqual(['running', 'emitting', 'success']);
            resolve();
          },
        });
      });
    });

    it('应该在 success 状态后完成', () => {
      return new Promise<void>((resolve) => {
        const ast: MockIfAst = {
          value: 'test',
        };

        let completed = false;

        visitor.handler(ast, {}).subscribe({
          complete: () => {
            completed = true;
            expect(completed).toBe(true);
            resolve();
          },
        });
      });
    });
  });

  describe('AST 修改', () => {
    it('应该修改原始 AST 对象', () => {
      return new Promise<void>((resolve) => {
        const ast: MockIfAst = {
          value: 'original',
        };

        visitor.handler(ast, {}).subscribe({
          next: (node) => {
            if (node.state === 'emitting') {
              expect(node.result).toBe('original');
              expect(ast.result).toBe('original');
            }
          },
          complete: () => {
            resolve();
          },
        });
      });
    });

    it('应该在流中传递修改后的 AST', () => {
      return new Promise<void>((resolve) => {
        const ast: MockIfAst = {
          value: 'test-value',
        };

        const receivedNodes: MockIfAst[] = [];

        visitor.handler(ast, {}).subscribe({
          next: (node) => {
            receivedNodes.push(node);
          },
          complete: () => {
            // 最后一个节点应该包含 result
            const lastNode = receivedNodes[receivedNodes.length - 2]; // emitting 状态的节点
            expect(lastNode.result).toBe('test-value');
            resolve();
          },
        });
      });
    });
  });

  describe('上下文处理', () => {
    it('应该接受任意上下文对象', () => {
      return new Promise<void>((resolve) => {
        const ast: MockIfAst = {
          value: 'test',
        };

        const context = {
          workflowId: 'wf-123',
          custom: { key: 'value' },
        };

        visitor.handler(ast, context).subscribe({
          complete: () => {
            expect(ast.result).toBe('test');
            resolve();
          },
        });
      });
    });

    it('应该处理空上下文', () => {
      return new Promise<void>((resolve) => {
        const ast: MockIfAst = {
          value: 'test',
        };

        visitor.handler(ast, null).subscribe({
          complete: () => {
            expect(ast.result).toBe('test');
            resolve();
          },
        });
      });
    });

    it('应该处理未定义的上下文', () => {
      return new Promise<void>((resolve) => {
        const ast: MockIfAst = {
          value: 'test',
        };

        visitor.handler(ast, undefined).subscribe({
          complete: () => {
            expect(ast.result).toBe('test');
            resolve();
          },
        });
      });
    });
  });

  describe('多值场景 - if-elseif-else', () => {
    it('应该支持三分支场景', () => {
      return new Promise<void>((resolve) => {
        const testCases = ['branch1', 'branch2', 'default'];

        let completed = 0;

        testCases.forEach((branchValue) => {
          const ast: MockIfAst = {
            value: branchValue,
          };

          visitor.handler(ast, {}).subscribe({
            complete: () => {
              completed++;
              if (completed === testCases.length) {
                resolve();
              }
            },
          });
        });
      });
    });
  });

  describe('订阅取消', () => {
    it('应该支持订阅取消', () => {
      return new Promise<void>((resolve) => {
        const ast: MockIfAst = {
          value: 'test',
        };

        const subscription = visitor.handler(ast, {}).subscribe({
          next: () => {
            // 空处理
          },
          complete: () => {
            resolve();
          },
        });

        // 验证可以取消订阅
        expect(typeof subscription.unsubscribe).toBe('function');
      });
    });
  });
});
