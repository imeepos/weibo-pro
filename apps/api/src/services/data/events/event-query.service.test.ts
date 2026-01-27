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
        expect(code).toContain('entityManager.update');
        const updateIndex = code.indexOf('entityManager.update');
        const calculateIndex = code.indexOf('calculateDecayedHotnessForEvents');
        expect(updateIndex).toBeGreaterThan(calculateIndex);
        expect(code).toMatch(/update\(EventEntity,\s*.*id.*,\s*\{\s*hotness:/);
    });

    it('应该在 getEventList 方法中持久化热度', () => {
        const getEventListStart = code.indexOf('async getEventList');
        expect(getEventListStart).toBeGreaterThan(-1);
        const methodBody = code.substring(getEventListStart);
        expect(methodBody).toContain('update(EventEntity');
        expect(methodBody).toContain('hotness');
    });
});

describe('EventQueryService - 热度排序问题（TDD 第一步）', () => {
    let serviceCode: string;
    let queriesCode: string;

    beforeAll(() => {
        const serviceFilePath = path.resolve(__dirname, './event-query.service.ts');
        const queriesFilePath = path.resolve(__dirname, '../../../../../../packages/entities/src/queries/event.queries.ts');
        serviceCode = fs.readFileSync(serviceFilePath, 'utf-8');
        queriesCode = fs.readFileSync(queriesFilePath, 'utf-8');
    });

    it('应该验证当前实现中存在的排序问题', () => {
        // 这个测试通过代码静态分析验证已知的 bug：
        // 问题：数据库查询使用持久化的旧 hotness 排序，
        // 但计算出新的 displayHotness 后只在内存中排序，
        // 导致当数据库 LIMIT 限制时，可能错过真正高热度的事件

        // 问题1: getEventList 使用 findEventList 查询数据
        expect(serviceCode).toContain('findEventList');

        // 问题2: findEventList 按数据库中的旧 hotness 排序
        expect(queriesCode).toMatch(/\.orderBy\('event\.hotness',\s*'DESC'\)/);

        // 问题3: getEventList 在查询数据后计算 displayHotness
        const findEventListIndex = serviceCode.indexOf('findEventList');
        const calculateDecayedIndex = serviceCode.indexOf('calculateDecayedHotnessForEvents');
        expect(findEventListIndex).toBeLessThan(calculateDecayedIndex);

        // 问题4: 内存排序在数据库查询之后
        const sortIndex = serviceCode.indexOf('.sort((a, b) => b.hotness - a.hotness)');
        expect(sortIndex).toBeGreaterThan(findEventListIndex);
        expect(sortIndex).toBeGreaterThan(calculateDecayedIndex);

        console.log('=== 排序问题分析 ===');
        console.log('1. findEventList 在数据库层按 event.hotness 排序并应用 LIMIT');
        console.log('2. calculateDecayedHotnessForEvents 在之后计算新的热度');
        console.log('3. data.sort() 在内存中排序');
        console.log('4. 问题：内存排序无法找回被 LIMIT 截断的高热度事件');
        console.log('====================');
    });

    it('应该演示 LIMIT 导致的数据丢失问题场景', () => {
        // 验证 findEventList 调用时带 limit 参数
        expect(serviceCode).toMatch(/findEventList\([^)]*\{[\s\S]*limit:/);

        // 验证 calculateDecayedHotnessForEvents 在查询之后调用
        const getEventListMethod = serviceCode.substring(
            serviceCode.indexOf('async getEventList'),
            serviceCode.indexOf('async getEventList') + 3000
        );
        expect(getEventListMethod.indexOf('findEventList')).toBeLessThan(
            getEventListMethod.indexOf('calculateDecayedHotnessForEvents')
        );

        // 验证存在内存排序
        expect(getEventListMethod).toContain('.sort((a, b) => b.hotness - a.hotness)');

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
        console.log('内存排序结果（第1页）:');
        console.log('  当前返回: [50, 40, 30, 20, 10]（都是低热度）');
        console.log('  应该返回: [95, 85, 75, 65, 55]（真正的热门）');
        console.log('=========================');
    });

    it('应该验证持久化热度的时机问题', () => {
        // 验证持久化 hotness 的时机
        expect(serviceCode).toContain('entityManager.update(EventEntity');

        const persistenceIndex = serviceCode.indexOf('entityManager.update(EventEntity');
        const calculateIndex = serviceCode.indexOf('calculateDecayedHotnessForEvents');
        expect(persistenceIndex).toBeGreaterThan(calculateIndex);

        // 问题：持久化在 LIMIT 之后，所以被截断的事件无法持久化新热度
        const getEventListMethod = serviceCode.substring(
            serviceCode.indexOf('async getEventList'),
            serviceCode.indexOf('async getEventList') + 3000
        );

        // 验证存在遍历 events 的逻辑（events 来自 findEventList，已被 LIMIT 截断）
        expect(getEventListMethod).toContain('for (const event of events)');

        console.log('=== 持久化时机分析 ===');
        console.log('当前流程:');
        console.log('1. 查询数据库（使用旧的 hotness 排序）+ LIMIT');
        console.log('2. 计算 displayHotness（基于统计数据时间衰减）');
        console.log('3. 内存排序 data.sort()');
        console.log('4. 持久化新的 hotness（但只对 LIMIT 返回的事件）');
        console.log('');
        console.log('问题：第4步只能持久化第1步返回的事件');
        console.log('       被 LIMIT 截断的高热度事件永远无法被持久化和查询到');
        console.log('=================');
    });
});
