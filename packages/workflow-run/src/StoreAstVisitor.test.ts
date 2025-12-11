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
    it('应该读取存在的键', (done) => {
      // 预设数据
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
          done();
        },
      });
    });

    it('应该处理不存在的键', (done) => {
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
          done();
        },
      });
    });

    it('应该为空键报错', (done) => {
      const ast: MockStoreGetAst = {
        key: '',
        count: 0,
      };

      visitor.visit(ast, {}).subscribe({
        complete: () => {
          expect(ast.state).toBe('fail');
          expect(ast.error).toBeDefined();
          done();
        },
      });
    });

    it('应该为 null 键报错', (done) => {
      const ast: MockStoreGetAst = {
        key: null as any,
        count: 0,
      };

      visitor.visit(ast, {}).subscribe({
        complete: () => {
          expect(ast.state).toBe('fail');
          done();
        },
      });
    });

    it('应该递增计数器', (done) => {
      redisClient.set('workflow:store:counter', 0);

      const ast: MockStoreGetAst = {
        key: 'counter',
        count: 0,
      };

      visitor.visit(ast, {}).subscribe({
        complete: () => {
          expect(ast.count).toBe(1);
          done();
        },
      });
    });

    it('应该读取字符串值', (done) => {
      redisClient.set('workflow:store:string', 'hello');

      const ast: MockStoreGetAst = {
        key: 'string',
        count: 0,
      };

      visitor.visit(ast, {}).subscribe({
        complete: () => {
          expect(ast.value).toBe('hello');
          done();
        },
      });
    });

    it('应该读取数值', (done) => {
      redisClient.set('workflow:store:number', 42);

      const ast: MockStoreGetAst = {
        key: 'number',
        count: 0,
      };

      visitor.visit(ast, {}).subscribe({
        complete: () => {
          expect(ast.value).toBe(42);
          done();
        },
      });
    });

    it('应该读取数组', (done) => {
      const array = [1, 2, 3];
      redisClient.set('workflow:store:array', array);

      const ast: MockStoreGetAst = {
        key: 'array',
        count: 0,
      };

      visitor.visit(ast, {}).subscribe({
        complete: () => {
          expect(ast.value).toEqual(array);
          done();
        },
      });
    });

    it('应该按正确的键前缀查询', (done) => {
      redisClient.set('workflow:store:mykey', 'myvalue');

      const ast: MockStoreGetAst = {
        key: 'mykey',
        count: 0,
      };

      // 验证实际查询的是带前缀的键
      const getSpy = vi.spyOn(redisClient, 'get');

      visitor.visit(ast, {}).subscribe({
        complete: () => {
          expect(getSpy).toHaveBeenCalledWith('workflow:store:mykey');
          done();
        },
      });
    });
  });

  describe('状态流转', () => {
    it('应该按正确的状态顺序发出', (done) => {
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
          done();
        },
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
    it('应该写入字符串值', (done) => {
      const ast: MockStoreSetAst = {
        key: 'test-key',
        value: 'test-value',
        count: 0,
      };

      visitor.visit(ast, {}).subscribe({
        complete: async () => {
          const stored = await redisClient.get('workflow:store:test-key');
          expect(stored).toBe('test-value');
          done();
        },
      });
    });

    it('应该写入对象值', (done) => {
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
          done();
        },
      });
    });

    it('应该写入数值', (done) => {
      const ast: MockStoreSetAst = {
        key: 'number-key',
        value: 42,
        count: 0,
      };

      visitor.visit(ast, {}).subscribe({
        complete: async () => {
          const stored = await redisClient.get('workflow:store:number-key');
          expect(stored).toBe(42);
          done();
        },
      });
    });

    it('应该写入数组', (done) => {
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
          done();
        },
      });
    });

    it('应该拒绝空键', (done) => {
      const ast: MockStoreSetAst = {
        key: '',
        value: 'value',
        count: 0,
      };

      visitor.visit(ast, {}).subscribe({
        complete: () => {
          expect(ast.state).toBe('fail');
          expect(ast.error).toBeDefined();
          done();
        },
      });
    });

    it('应该递增计数器', (done) => {
      const ast: MockStoreSetAst = {
        key: 'counter',
        value: 1,
        count: 0,
      };

      visitor.visit(ast, {}).subscribe({
        complete: () => {
          expect(ast.count).toBe(1);
          done();
        },
      });
    });

    it('应该使用带前缀的键保存', (done) => {
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
          done();
        },
      });
    });

    it('应该设置 TTL 为 7 天', (done) => {
      const ast: MockStoreSetAst = {
        key: 'ttl-test',
        value: 'value',
        count: 0,
      };

      const setSpy = vi.spyOn(redisClient, 'set');

      visitor.visit(ast, {}).subscribe({
        complete: () => {
          const ttlArg = setSpy.mock.calls[0][2];
          // 7 天 = 604800 秒
          expect(ttlArg).toBe(7 * 24 * 60 * 60);
          done();
        },
      });
    });

    it('应该支持 null 值', (done) => {
      const ast: MockStoreSetAst = {
        key: 'null-key',
        value: null,
        count: 0,
      };

      visitor.visit(ast, {}).subscribe({
        complete: async () => {
          const stored = await redisClient.get('workflow:store:null-key');
          expect(stored).toBeNull();
          done();
        },
      });
    });

    it('应该支持 undefined 值', (done) => {
      const ast: MockStoreSetAst = {
        key: 'undefined-key',
        value: undefined,
        count: 0,
      };

      visitor.visit(ast, {}).subscribe({
        complete: async () => {
          const stored = await redisClient.get('workflow:store:undefined-key');
          expect(stored).toBeUndefined();
          done();
        },
      });
    });

    it('应该重写已有的值', (done) => {
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
          done();
        },
      });
    });
  });

  describe('状态流转', () => {
    it('应该按正确的状态顺序发出', (done) => {
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
          done();
        },
      });
    });
  });
});
