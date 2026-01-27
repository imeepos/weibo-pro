import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('EventQueryService - 热度排序问题验证', () => {

    it('应该验证当前实现中存在的排序问题', () => {
        // 这个测试通过代码静态分析验证已知的 bug：
        // 问题：数据库查询使用持久化的旧 hotness 排序，
        // 但计算出新的 displayHotness 后只在内存中排序，
        // 导致当数据库 LIMIT 限制时，可能错过真正高热度的事件

        const serviceCode = fs.readFileSync(
            path.resolve(__dirname, './event-query.service.ts'),
            'utf-8'
        );

        // 问题1: getEventList 使用 findEventList 查询数据
        const hasFindEventListCall = serviceCode.includes('findEventList');
        expect(hasFindEventListCall).toBe(true);

        // 问题2: findEventList 按数据库中的旧 hotness 排序（在 event.queries.ts 中）
        const queriesCode = fs.readFileSync(
            path.resolve(__dirname, '../../../../../../packages/entities/src/queries/event.queries.ts'),
            'utf-8'
        );
        expect(queriesCode).toContain(".orderBy('event.hotness', 'DESC')");

        // 问题3: getEventList 在查询数据后计算 displayHotness
        const findEventListIndex = serviceCode.indexOf('findEventList');
        const calculateDecayedIndex = serviceCode.indexOf('calculateDecayedHotnessForEvents');
        expect(findEventListIndex).toBeLessThan(calculateDecayedIndex);

        // 问题4: 内存排序在数据库查询之后
        // 这证明了：先查询（带 LIMIT），后排序，导致可能丢失高热度事件
        const sortIndex = serviceCode.indexOf('.sort((a, b) => b.hotness - a.hotness)');
        expect(sortIndex).toBeGreaterThan(findEventListIndex);

        // 打印问题分析
        console.log('=== 排序问题分析 ===');
        console.log('1. findEventList 在数据库层按 event.hotness 排序并应用 LIMIT');
        console.log('2. calculateDecayedHotnessForEvents 在之后计算新的热度');
        console.log('3. 内存排序无法找回被 LIMIT 截断的高热度事件');
        console.log('====================');
    });

    it('应该演示 LIMIT 导致的数据丢失问题', () => {
        // 场景说明：
        // 假设数据库有 10 个事件：
        // - 前 5 个事件的旧 hotness 很高：100, 90, 80, 70, 60
        // - 后 5 个事件的旧 hotness 较低：10, 20, 30, 40, 50
        //
        // 查询：LIMIT 5，按 hotness DESC
        // 结果：返回事件 [100, 90, 80, 70, 60]
        //
        // 但经过时间衰减后：
        // - 前 5 个的实际 displayHotness：10, 20, 30, 40, 50（都衰减了）
        // - 后 5 个的实际 displayHotness：95, 85, 75, 65, 55（新的，几乎没衰减）
        //
        // 内存排序后返回：[50, 40, 30, 20, 10]
        // 但正确结果应该是：[95, 85, 75, 65, 55]
        //
        // 真正高热度的事件（95, 85, 75, 65, 55）被 LIMIT 截断了！

        console.log('=== LIMIT 导致数据丢失示例 ===');
        console.log('数据库状态（旧 hotness）:');
        console.log('  事件1-5: 100, 90, 80, 70, 60（旧事件，已衰减）');
        console.log('  事件6-10: 10, 20, 30, 40, 50（新事件，实际热度高）');
        console.log('');
        console.log('数据库查询（ORDER BY hotness DESC LIMIT 5）:');
        console.log('  返回: 事件1-5（100, 90, 80, 70, 60）');
        console.log('  遗漏: 事件6-10（真正的热门事件）');
        console.log('');
        console.log('时间衰减后（lambda=0.05）:');
        console.log('  事件1-5 的 displayHotness: 10, 20, 30, 40, 50');
        console.log('  事件6-10 的 displayHotness: 95, 85, 75, 65, 55（被遗漏！）');
        console.log('');
        console.log('内存排序结果:');
        console.log('  当前返回: [50, 40, 30, 20, 10]（都是低热度）');
        console.log('  应该返回: [95, 85, 75, 65, 55]（真正的热门）');
        console.log('=========================');

        // 这个测试总是通过，因为它只是演示问题
        expect(true).toBe(true);
    });

    it('应该验证持久化热度的时机', () => {
        // 验证持久化 hotness 的时机是否正确
        // 当前实现：在计算出 displayHotness 后才持久化
        // 这意味着下次查询时，hotness 已经是"上一次计算的值"

        const serviceCode = fs.readFileSync(
            path.resolve(__dirname, './event-query.service.ts'),
            'utf-8'
        );

        // 检查持久化逻辑
        const hasPersistenceLogic = serviceCode.includes('entityManager.update(EventEntity');
        expect(hasPersistenceLogic).toBe(true);

        // 检查持久化是否在计算之后
        const persistenceIndex = serviceCode.indexOf('entityManager.update(EventEntity');
        const calculateIndex = serviceCode.indexOf('calculateDecayedHotnessForEvents');
        expect(persistenceIndex).toBeGreaterThan(calculateIndex);

        console.log('=== 持久化时机分析 ===');
        console.log('当前流程:');
        console.log('1. 查询数据库（使用旧的 hotness 排序）');
        console.log('2. 计算 displayHotness（基于统计数据时间衰减）');
        console.log('3. 内存排序');
        console.log('4. 持久化新的 hotness（为下次查询准备）');
        console.log('');
        console.log('问题：第1步使用的是"上次计算的 hotness"，可能已过时');
        console.log('=================');
    });

    it('应该描述解决方案', () => {
        console.log('=== 解决方案 ===');
        console.log('方案1：先计算所有事件的 displayHotness，再排序和分页');
        console.log('  优点：保证结果正确');
        console.log('  缺点：性能开销大（需要计算所有事件）');
        console.log('');
        console.log('方案2：使用子查询，在 SQL 层计算 displayHotness');
        console.log('  优点：性能好，数据库层排序');
        console.log('  缺点：SQL 复杂，衰减计算难以在 SQL 中实现');
        console.log('');
        console.log('方案3（推荐）：使用窗口函数或 CTE');
        console.log('  先计算 displayHotness，再排序和分页');
        console.log('  优点：兼顾性能和正确性');
        console.log('================');

        expect(true).toBe(true);
    });
});
