import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';

describe('EventQueryService - 实时热度持久化', () => {
    let code: string;

    beforeAll(() => {
        const filePath = path.resolve(__dirname, './event-query.service.ts');
        code = fs.readFileSync(filePath, 'utf-8');
    });

    it('应该在计算实时热度后更新 event.hotness 到数据库', () => {
        // 检查是否有在计算 displayHotness 后调用 entityManager.update 更新 hotness 的逻辑
        // 正确的模式应该类似于:
        // entityManager.update(EventEntity, event.id, { hotness: displayHotness })

        // 验证代码包含 update 调用
        expect(code).toContain('entityManager.update');

        // 验证更新的是 EventEntity 的 hotness
        // 应该在 calculateDecayedHotnessForEvents 之后有更新逻辑
        const updateIndex = code.indexOf('entityManager.update');
        const calculateIndex = code.indexOf('calculateDecayedHotnessForEvents');

        // update 应该在 calculateDecayedHotnessForEvents 之后调用
        expect(updateIndex).toBeGreaterThan(calculateIndex);

        // 验证更新时使用了计算出的 hotness 值
        expect(code).toMatch(/update\(EventEntity,\s*.*id.*,\s*\{\s*hotness:/);
    });

    it('应该在 getEventList 方法中持久化热度', () => {
        // getEventList 方法应该包含更新 hotness 的逻辑

        // 检查 getEventList 方法定义
        const getEventListStart = code.indexOf('async getEventList');
        expect(getEventListStart).toBeGreaterThan(-1);

        // 提取 getEventList 方法的代码
        const methodBody = code.substring(getEventListStart);

        // 方法中应该包含 update 调用来持久化热度
        expect(methodBody).toContain('update(EventEntity');
        expect(methodBody).toContain('hotness');
    });
});
