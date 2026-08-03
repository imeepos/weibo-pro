import { expect } from 'vitest';
import { TestScheduler } from 'rxjs/testing';

/**
 * 共享测试工具
 *
 * 供 rxjs.*.test.ts 各测试文件复用，避免重复的 setup/helper。
 */

/**
 * 创建一个使用 vitest 断言进行深度对比的 TestScheduler。
 * 用于 Marble Testing（弹珠图测试）。
 */
export function createTestScheduler(): TestScheduler {
  return new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });
}
