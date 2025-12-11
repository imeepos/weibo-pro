import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StoreGetAstVisitor, StoreSetAstVisitor } from './StoreAstVisitor';

// Mock AST 类型
interface MockStoreGetAst {
  key: string;
  value?: any;
  count?: number;
  state?: string;
  error?: any;
}

interface MockStoreSetAst {
  key: string;
  value: any;
  count?: number;
  state?: string;
  error?: any;
}

// Mock RedisClient
class MockRedisClient {
  private store = new Map<string, any>();

  async get<T>(key: string): Promise<T | null> {
    return (this.store.get(key) ?? null) as T;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    this.store.set(key, value);
  }

  clear() {
    this.store.clear();
  }
}

describe('StoreGetAstVisitor', () => {
  let visitor: StoreGetAstVisitor;
  let redisClient: MockRedisClient;

  beforeEach(() => {
    redisClient = new MockRedisClient();
    visitor = new StoreGetAstVisitor(redisClient as any);
  });

  describe('visit - 读取存储数据', () => {
    it('应该读取存在的键', () => {
      return new Promise<void>((resolve) => {
        redisClient.set('workflow:store:test-key', { data: 'test' });

        const ast: MockStoreGetAst = {
          key: 'test-key',
          count: 0,
        };

        visitor.visit(ast, {}).subscribe({
          next: (node) => {
            if (node.state === 'emitting') {
              expect(node.value).toEqual({ data: 'test' });
            }
          },
          complete: () => {
            expect(ast.value).toEqual({ data: 'test' });
            resolve();
          },
        });
      });
    });

    it('应该处理不存在的键', () => {
      return new Promise<void>((resolve) => {
        const ast: MockStoreGetAst = {
          key: 'non-existent',
          count: 0,
        };

        visitor.visit(ast, {}).subscribe({
          next: (node) => {
            if (node.state === 'emitting') {
              expect(node.value).toBeNull();
            }
          },
          complete: () => {
            expect(ast.value).toBeNull();
            resolve();
          },
        });
      });
    });

    it('应该为空键报错', () => {
      return new Promise<void>((resolve) => {
        const ast: MockStoreGetAst = {
          key: '',
          count: 0,
        };

        visitor.visit(ast, {}).subscribe({
          complete: () => {
            expect(ast.state).toBe('fail');
            expect(ast.error).toBeDefined();
            resolve();
          },
        });
      });
    });

    it('应该为 null 键报错', () => {
      return new Promise<void>((resolve) => {
        const ast: MockStoreGetAst = {
          key: null as any,
          count: 0,
        };

        visitor.visit(ast, {}).subscribe({
          complete: () => {
            expect(ast.state).toBe('fail');
            resolve();
          },
        });
      });
    });

    it('应该递增计数器', () => {
      return new Promise<void>((resolve) => {
        redisClient.set('workflow:store:counter', 0);

        const ast: MockStoreGetAst = {
          key: 'counter',
          count: 0,
        };

        visitor.visit(ast, {}).subscribe({
          complete: () => {
            expect(ast.count).toBe(1);
            resolve();
          },
        });
      });
    });

    it('应该读取字符串值', () => {
      return new Promise<void>((resolve) => {
        redisClient.set('workflow:store:string', 'hello');

        const ast: MockStoreGetAst = {
          key: 'string',
          count: 0,
        };

        visitor.visit(ast, {}).subscribe({
          complete: () => {
            expect(ast.value).toBe('hello');
            resolve();
          },
        });
      });
    });

    it('应该读取数值', () => {
      return new Promise<void>((resolve) => {
        redisClient.set('workflow:store:number', 42);

        const ast: MockStoreGetAst = {
          key: 'number',
          count: 0,
        };

        visitor.visit(ast, {}).subscribe({
          complete: () => {
            expect(ast.value).toBe(42);
            resolve();
          },
        });
      });
    });

    it('应该读取数组', () => {
      return new Promise<void>((resolve) => {
        const array = [1, 2, 3];
        redisClient.set('workflow:store:array', array);

        const ast: MockStoreGetAst = {
          key: 'array',
          count: 0,
        };

        visitor.visit(ast, {}).subscribe({
          complete: () => {
            expect(ast.value).toEqual(array);
            resolve();
          },
        });
      });
    });

    it('应该按正确的键前缀查询', () => {
      return new Promise<void>((resolve) => {
        redisClient.set('workflow:store:mykey', 'myvalue');

        const ast: MockStoreGetAst = {
          key: 'mykey',
          count: 0,
        };

        const getSpy = vi.spyOn(redisClient, 'get');

        visitor.visit(ast, {}).subscribe({
          complete: () => {
            expect(getSpy).toHaveBeenCalledWith('workflow:store:mykey');
            resolve();
          },
        });
      });
    });
  });

  describe('状态流转', () => {
    it('应该按正确的状态顺序发出', () => {
      return new Promise<void>((resolve) => {
        redisClient.set('workflow:store:test', 'value');

        const ast: MockStoreGetAst = {
          key: 'test',
          count: 0,
        };

        const states: string[] = [];

        visitor.visit(ast, {}).subscribe({
          next: (node) => {
            states.push(node.state);
          },
          complete: () => {
            expect(states).toContain('running');
            expect(states).toContain('emitting');
            expect(states).toContain('success');
            resolve();
          },
        });
      });
    });
  });
});

describe('StoreSetAstVisitor', () => {
  let visitor: StoreSetAstVisitor;
  let redisClient: MockRedisClient;

  beforeEach(() => {
    redisClient = new MockRedisClient();
    visitor = new StoreSetAstVisitor(redisClient as any);
  });

  describe('visit - 写入存储数据', () => {
    it('应该写入字符串值', () => {
      return new Promise<void>((resolve) => {
        const ast: MockStoreSetAst = {
          key: 'test-key',
          value: 'test-value',
          count: 0,
        };

        visitor.visit(ast, {}).subscribe({
          complete: async () => {
            const stored = await redisClient.get('workflow:store:test-key');
            expect(stored).toBe('test-value');
            resolve();
          },
        });
      });
    });

    it('应该写入对象值', () => {
      return new Promise<void>((resolve) => {
        const testObj = { name: 'test', data: [1, 2, 3] };
        const ast: MockStoreSetAst = {
          key: 'object-key',
          value: testObj,
          count: 0,
        };

        visitor.visit(ast, {}).subscribe({
          complete: async () => {
            const stored = await redisClient.get('workflow:store:object-key');
            expect(stored).toEqual(testObj);
            resolve();
          },
        });
      });
    });

    it('应该写入数值', () => {
      return new Promise<void>((resolve) => {
        const ast: MockStoreSetAst = {
          key: 'number-key',
          value: 42,
          count: 0,
        };

        visitor.visit(ast, {}).subscribe({
          complete: async () => {
            const stored = await redisClient.get('workflow:store:number-key');
            expect(stored).toBe(42);
            resolve();
          },
        });
      });
    });

    it('应该写入数组', () => {
      return new Promise<void>((resolve) => {
        const testArray = ['a', 'b', 'c'];
        const ast: MockStoreSetAst = {
          key: 'array-key',
          value: testArray,
          count: 0,
        };

        visitor.visit(ast, {}).subscribe({
          complete: async () => {
            const stored = await redisClient.get('workflow:store:array-key');
            expect(stored).toEqual(testArray);
            resolve();
          },
        });
      });
    });

    it('应该拒绝空键', () => {
      return new Promise<void>((resolve) => {
        const ast: MockStoreSetAst = {
          key: '',
          value: 'value',
          count: 0,
        };

        visitor.visit(ast, {}).subscribe({
          complete: () => {
            expect(ast.state).toBe('fail');
            expect(ast.error).toBeDefined();
            resolve();
          },
        });
      });
    });

    it('应该递增计数器', () => {
      return new Promise<void>((resolve) => {
        const ast: MockStoreSetAst = {
          key: 'counter',
          value: 1,
          count: 0,
        };

        visitor.visit(ast, {}).subscribe({
          complete: () => {
            expect(ast.count).toBe(1);
            resolve();
          },
        });
      });
    });

    it('应该使用带前缀的键保存', () => {
      return new Promise<void>((resolve) => {
        const ast: MockStoreSetAst = {
          key: 'mykey',
          value: 'myvalue',
          count: 0,
        };

        const setSpy = vi.spyOn(redisClient, 'set');

        visitor.visit(ast, {}).subscribe({
          complete: () => {
            expect(setSpy).toHaveBeenCalledWith(
              'workflow:store:mykey',
              'myvalue',
              expect.any(Number),
            );
            resolve();
          },
        });
      });
    });

    it('应该设置 TTL 为 7 天', () => {
      return new Promise<void>((resolve) => {
        const ast: MockStoreSetAst = {
          key: 'ttl-test',
          value: 'value',
          count: 0,
        };

        const setSpy = vi.spyOn(redisClient, 'set');

        visitor.visit(ast, {}).subscribe({
          complete: () => {
            const ttlArg = setSpy.mock.calls[0][2];
            expect(ttlArg).toBe(7 * 24 * 60 * 60);
            resolve();
          },
        });
      });
    });

    it('应该支持 null 值', () => {
      return new Promise<void>((resolve) => {
        const ast: MockStoreSetAst = {
          key: 'null-key',
          value: null,
          count: 0,
        };

        visitor.visit(ast, {}).subscribe({
          complete: async () => {
            const stored = await redisClient.get('workflow:store:null-key');
            expect(stored).toBeNull();
            resolve();
          },
        });
      });
    });

    it('应该支持 undefined 值', () => {
      return new Promise<void>((resolve) => {
        const ast: MockStoreSetAst = {
          key: 'undefined-key',
          value: undefined,
          count: 0,
        };

        visitor.visit(ast, {}).subscribe({
          complete: () => {
            // MockRedisClient 使用 ?? 将 undefined 转换为 null
            // 这是正常的行为，验证在 undefined 值时不会报错即可
            expect(ast.state).toBe('success');
            resolve();
          },
        });
      });
    });

    it('应该重写已有的值', () => {
      return new Promise<void>((resolve) => {
        redisClient.set('workflow:store:key', 'old-value');

        const ast: MockStoreSetAst = {
          key: 'key',
          value: 'new-value',
          count: 0,
        };

        visitor.visit(ast, {}).subscribe({
          complete: async () => {
            const stored = await redisClient.get('workflow:store:key');
            expect(stored).toBe('new-value');
            resolve();
          },
        });
      });
    });
  });

  describe('状态流转', () => {
    it('应该按正确的状态顺序发出', () => {
      return new Promise<void>((resolve) => {
        const ast: MockStoreSetAst = {
          key: 'test',
          value: 'value',
          count: 0,
        };

        const states: string[] = [];

        visitor.visit(ast, {}).subscribe({
          next: (node) => {
            states.push(node.state);
          },
          complete: () => {
            expect(states).toContain('running');
            expect(states).toContain('emitting');
            expect(states).toContain('success');
            resolve();
          },
        });
      });
    });
  });
});
