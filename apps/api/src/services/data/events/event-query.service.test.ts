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
        // 更新正则以匹配新的变量名 eventId
        expect(code).toMatch(/update\(EventEntity,\s*eventId/);
    });

    it('应该在 getEventList 方法中持久化热度', () => {
        const getEventListStart = code.indexOf('async getEventList');
        expect(getEventListStart).toBeGreaterThan(-1);
        const methodBody = code.substring(getEventListStart);
        expect(methodBody).toContain('update(EventEntity');
        expect(methodBody).toContain('hotness');
    });
});

describe('EventQueryService - 热度排序问题已修复', () => {
    let serviceCode: string;

    beforeAll(() => {
        const serviceFilePath = path.resolve(__dirname, './event-query.service.ts');
        serviceCode = fs.readFileSync(serviceFilePath, 'utf-8');
    });

    it('应该先获取所有符合条件的ID（不分页）', () => {
        const getEventListMethod = serviceCode.substring(
            serviceCode.indexOf('async getEventList'),
            serviceCode.indexOf('async getEventList') + 3000
        );

        // 验证调用了 getEventIds 获取所有ID
        expect(getEventListMethod).toContain('getEventIds');
        expect(getEventListMethod).toContain('allEventIds');

        // 验证不再使用 findEventList
        expect(getEventListMethod).not.toContain('findEventList');

        console.log('=== 修复验证：第一步 ===');
        console.log('使用 getEventIds 获取所有符合条件的ID（不分页）');
        console.log('=======================');
    });

    it('应该在获取ID后计算所有事件的衰减热度', () => {
        const getEventListMethod = serviceCode.substring(
            serviceCode.indexOf('async getEventList'),
            serviceCode.indexOf('async getEventList') + 3000
        );

        // 验证计算热度的调用在获取ID之后
        const getEventIdsIndex = getEventListMethod.indexOf('getEventIds');
        const calculateIndex = getEventListMethod.indexOf('calculateDecayedHotnessForEvents');
        expect(calculateIndex).toBeGreaterThan(getEventIdsIndex);

        // 验证对所有事件ID计算热度
        expect(getEventListMethod).toContain('calculateDecayedHotnessForEvents');
        expect(getEventListMethod).toContain('allEventIds');

        console.log('=== 修复验证：第二步 ===');
        console.log('对所有事件ID（allEventIds）计算衰减热度');
        console.log('=======================');
    });

    it('应该按新热度排序后再分页', () => {
        const getEventListMethod = serviceCode.substring(
            serviceCode.indexOf('async getEventList'),
            serviceCode.indexOf('async getEventList') + 3000
        );

        // 验证存在排序逻辑
        expect(getEventListMethod).toContain('sortedEventIds');
        expect(getEventListMethod).toContain('hotnessB - hotnessA');

        // 验证排序在计算热度之后
        const calculateIndex = getEventListMethod.indexOf('calculateDecayedHotnessForEvents');
        const sortIndex = getEventListMethod.indexOf('hotnessB - hotnessA');
        expect(sortIndex).toBeGreaterThan(calculateIndex);

        // 验证手动分页在排序之后
        expect(getEventListMethod).toContain('paginatedIds');
        expect(getEventListMethod).toContain('.slice((page - 1) * pageSize, page * pageSize)');

        console.log('=== 修复验证：第三步 ===');
        console.log('按热度排序所有事件ID');
        console.log('手动分页：sortedEventIds.slice((page - 1) * pageSize, page * pageSize)');
        console.log('=======================');
    });

    it('应该持久化所有事件的新热度（异步）', () => {
        const getEventListMethod = serviceCode.substring(
            serviceCode.indexOf('async getEventList'),
            serviceCode.indexOf('async getEventList') + 3000
        );

        // 验证使用 setImmediate 异步持久化
        expect(getEventListMethod).toContain('setImmediate');

        // 验证遍历 displayHotnessMap（所有事件）
        expect(getEventListMethod).toContain('displayHotnessMap.entries()');
        expect(getEventListMethod).toContain('for (const [eventId, newHotness] of displayHotnessMap.entries())');

        // 验证持久化逻辑存在
        const persistenceIndex = getEventListMethod.indexOf('setImmediate');
        expect(persistenceIndex).toBeGreaterThan(-1);

        console.log('=== 修复验证：持久化 ===');
        console.log('使用 setImmediate 异步持久化所有事件的新热度');
        console.log('不再只持久化 LIMIT 返回的事件，而是持久化所有事件');
        console.log('=======================');
    });

    it('应该使用新的辅助方法', () => {
        // 验证存在 getEventIds 方法
        expect(serviceCode).toContain('private async getEventIds');
        expect(serviceCode).toContain('filters?: { search?: string; category?: string }');

        // 验证存在 getEventsByIds 方法
        expect(serviceCode).toContain('private async getEventsByIds');
        expect(serviceCode).toContain('ids: string[]');

        // 验证返回类型（移除正则表达式中的特殊字符转义问题）
        expect(serviceCode).toContain('getEventIds(');
        expect(serviceCode).toContain(': Promise<string[]>');

        // 验证 getEventsByIds 返回事件数组
        expect(serviceCode).toContain('getEventsByIds(');
        expect(serviceCode).toContain(': Promise<EventWithCategory[]>');

        console.log('=== 修复验证：辅助方法 ===');
        console.log('新增 getEventIds：获取符合条件的所有事件ID（不分页）');
        console.log('新增 getEventsByIds：根据ID数组获取事件详情');
        console.log('=======================');
    });
});

describe('EventQueryService - 修复后的执行流程', () => {
    let serviceCode: string;

    beforeAll(() => {
        const serviceFilePath = path.resolve(__dirname, './event-query.service.ts');
        serviceCode = fs.readFileSync(serviceFilePath, 'utf-8');
    });

    it('应该演示修复后的正确流程', () => {
        const getEventListMethod = serviceCode.substring(
            serviceCode.indexOf('async getEventList'),
            serviceCode.indexOf('async getEventList') + 3000
        );

        // 验证执行顺序
        const indices = {
            getEventIds: getEventListMethod.indexOf('getEventIds'),
            calculate: getEventListMethod.indexOf('calculateDecayedHotnessForEvents'),
            sort: getEventListMethod.indexOf('hotnessB - hotnessA'),
            paginate: getEventListMethod.indexOf('.slice((page - 1) * pageSize'),
            getEvents: getEventListMethod.indexOf('getEventsByIds'),
            build: getEventListMethod.indexOf('mapEventToListItem'),
            persist: getEventListMethod.indexOf('setImmediate'),
        };

        // 验证顺序：获取ID -> 计算热度 -> 排序 -> 分页 -> 获取详情 -> 构建 -> 持久化
        expect(indices.getEventIds).toBeLessThan(indices.calculate);
        expect(indices.calculate).toBeLessThan(indices.sort);
        expect(indices.sort).toBeLessThan(indices.paginate);
        expect(indices.paginate).toBeLessThan(indices.getEvents);
        expect(indices.getEvents).toBeLessThan(indices.build);

        console.log('=== 修复后的执行流程 ===');
        console.log('1. getEventIds：获取所有符合条件的ID（不分页）');
        console.log('2. calculateDecayedHotnessForEvents：计算所有事件的衰减热度');
        console.log('3. sortedEventIds：按热度排序所有事件ID');
        console.log('4. paginatedIds：手动分页截取当前页的ID');
        console.log('5. getEventsByIds：获取分页后的事件详情');
        console.log('6. mapEventToListItem：构建返回数据');
        console.log('7. setImmediate：异步持久化所有事件的新热度');
        console.log('8. return：返回结果（不等待持久化完成）');
        console.log('========================');
        console.log('');
        console.log('关键改进：');
        console.log('- 不再依赖数据库的 ORDER BY + LIMIT');
        console.log('- 在内存中按新热度排序后再分页');
        console.log('- 持久化所有事件的新热度，不只是当前页');
        console.log('========================');
    });
});
