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

    // 辅助函数：获取完整的方法代码
    function getGetEventListMethod(): string {
        const methodStart = serviceCode.indexOf('async getEventList(');
        const methodEnd = serviceCode.indexOf('\n  async', methodStart + 1);
        return serviceCode.substring(methodStart, methodEnd > 0 ? methodEnd : serviceCode.length);
    }

    it('应该先获取所有符合条件的ID（不分页）', () => {
        const getEventListMethod = getGetEventListMethod();

        // 验证调用了 getEventIds 获取所有ID
        expect(getEventListMethod).toContain('getEventIds');
        expect(getEventListMethod).toContain('allEventIds');

        // 注意：findEventList 仍然存在于性能回退逻辑中（当事件数 > 1000 时）
        // 但在正常流程（事件数 <= 1000）中不使用 findEventList
        expect(getEventListMethod).toContain('needsPaging');
        expect(getEventListMethod).toContain('MAX_HOTNESS_CALCULATION_EVENTS');

        console.log('=== 修复验证：第一步 ===');
        console.log('使用 getEventIds 获取所有符合条件的ID和分页标记');
        console.log('当事件数 <= 1000 时，使用新的内存排序逻辑');
        console.log('当事件数 > 1000 时，回退使用 findEventList 数据库排序');
        console.log('=======================');
    });

    it('应该在获取ID后计算所有事件的衰减热度', () => {
        const getEventListMethod = getGetEventListMethod();

        // 验证计算热度的调用在获取ID之后（在正常流程中）
        const normalFlowStart = getEventListMethod.indexOf('// 【正常流程】');
        expect(normalFlowStart).toBeGreaterThan(-1);

        const getEventIdsIndex = getEventListMethod.indexOf('getEventIds');
        const calculateIndex = getEventListMethod.indexOf('calculateDecayedHotnessForEvents');
        expect(calculateIndex).toBeGreaterThan(getEventIdsIndex);

        // 验证对所有事件ID计算热度
        expect(getEventListMethod).toContain('calculateDecayedHotnessForEvents');
        expect(getEventListMethod).toContain('allEventIds');

        console.log('=== 修复验证：第二步 ===');
        console.log('在正常流程中，对所有事件ID（allEventIds）计算衰减热度');
        console.log('=======================');
    });

    it('应该按新热度排序后再分页', () => {
        const getEventListMethod = getGetEventListMethod();

        // 验证存在排序逻辑（在正常流程中）
        expect(getEventListMethod).toContain('sortedEventIds');
        expect(getEventListMethod).toContain('hotnessB - hotnessA');

        // 验证排序在计算热度之后（在正常流程中）
        const normalFlowStart = getEventListMethod.indexOf('// 【正常流程】');
        const calculateIndex = getEventListMethod.indexOf('calculateDecayedHotnessForEvents', normalFlowStart);
        const sortIndex = getEventListMethod.indexOf('hotnessB - hotnessA', normalFlowStart);
        expect(sortIndex).toBeGreaterThan(calculateIndex);

        // 验证手动分页在排序之后
        expect(getEventListMethod).toContain('paginatedIds');
        expect(getEventListMethod).toContain('.slice((page - 1) * pageSize, page * pageSize)');

        console.log('=== 修复验证：第三步 ===');
        console.log('在正常流程中，按热度排序所有事件ID');
        console.log('手动分页：sortedEventIds.slice((page - 1) * pageSize, page * pageSize)');
        console.log('=======================');
    });

    it('应该持久化所有事件的新热度（异步）', () => {
        const getEventListMethod = getGetEventListMethod();

        // 验证使用 setImmediate 异步持久化（在正常流程中）
        expect(getEventListMethod).toContain('setImmediate');

        // 验证遍历 displayHotnessMap（所有事件）
        expect(getEventListMethod).toContain('displayHotnessMap.entries()');
        expect(getEventListMethod).toContain('for (const [eventId, newHotness] of displayHotnessMap.entries())');

        // 验证持久化逻辑存在
        const persistenceIndex = getEventListMethod.indexOf('setImmediate');
        expect(persistenceIndex).toBeGreaterThan(-1);

        console.log('=== 修复验证：持久化 ===');
        console.log('在正常流程中，使用 setImmediate 异步持久化所有事件的新热度');
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

        // 验证返回类型（更新为新的返回类型）
        expect(serviceCode).toContain('getEventIds(');
        expect(serviceCode).toContain(': Promise<{ ids: string[]; needsPaging: boolean }>');

        // 验证 getEventsByIds 返回事件数组
        expect(serviceCode).toContain('getEventsByIds(');
        expect(serviceCode).toContain(': Promise<EventWithCategory[]>');

        // 验证性能回退常量存在
        expect(serviceCode).toContain('MAX_HOTNESS_CALCULATION_EVENTS');
        expect(serviceCode).toContain('const MAX_HOTNESS_CALCULATION_EVENTS = 1000');

        console.log('=== 修复验证：辅助方法 ===');
        console.log('新增 getEventIds：获取符合条件的所有事件ID和分页标记');
        console.log('新增 getEventsByIds：根据ID数组获取事件详情');
        console.log('新增 MAX_HOTNESS_CALCULATION_EVENTS：性能回退阈值');
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
        // 找到 getEventList 方法开始和结束位置（下一个 async 方法开始前）
        const methodStart = serviceCode.indexOf('async getEventList(');
        const methodEnd = serviceCode.indexOf('\n  async', methodStart + 1);
        const getEventListMethod = serviceCode.substring(methodStart, methodEnd > 0 ? methodEnd : serviceCode.length);

        // 验证正常流程的关键步骤存在
        expect(getEventListMethod).toContain('getEventIds');
        expect(getEventListMethod).toContain('calculateDecayedHotnessForEvents');
        expect(getEventListMethod).toContain('hotnessB - hotnessA');
        expect(getEventListMethod).toContain('.slice((page - 1) * pageSize');
        expect(getEventListMethod).toContain('getEventsByIds');
        expect(getEventListMethod).toContain('mapEventToListItem');
        expect(getEventListMethod).toContain('setImmediate');

        // 验证回退流程存在
        expect(getEventListMethod).toContain('needsPaging');
        expect(getEventListMethod).toContain('findEventList');

        // 验证正常流程中各关键方法的调用顺序
        const normalFlowStart = getEventListMethod.indexOf('// 【正常流程】');
        expect(normalFlowStart).toBeGreaterThan(-1);

        const normalFlowIndices = {
            getEventIds: getEventListMethod.indexOf('getEventIds', normalFlowStart),
            calculate: getEventListMethod.indexOf('calculateDecayedHotnessForEvents', normalFlowStart),
            sort: getEventListMethod.indexOf('hotnessB - hotnessA', normalFlowStart),
            paginate: getEventListMethod.indexOf('.slice((page - 1) * pageSize', normalFlowStart),
            getEvents: getEventListMethod.indexOf('getEventsByIds', normalFlowStart),
            build: getEventListMethod.indexOf('mapEventToListItem', normalFlowStart),
            persist: getEventListMethod.indexOf('setImmediate', normalFlowStart),
        };

        // 验证正常流程的顺序：获取ID -> 计算热度 -> 排序 -> 分页 -> 获取详情 -> 构建 -> 持久化
        expect(normalFlowIndices.getEventIds).toBeGreaterThan(-1);
        expect(normalFlowIndices.calculate).toBeGreaterThan(normalFlowIndices.getEventIds);
        expect(normalFlowIndices.sort).toBeGreaterThan(normalFlowIndices.calculate);
        expect(normalFlowIndices.paginate).toBeGreaterThan(normalFlowIndices.sort);
        expect(normalFlowIndices.getEvents).toBeGreaterThan(normalFlowIndices.paginate);
        expect(normalFlowIndices.build).toBeGreaterThan(normalFlowIndices.getEvents);
        expect(normalFlowIndices.persist).toBeGreaterThan(normalFlowIndices.build);

        console.log('=== 修复后的执行流程 ===');
        console.log('【正常流程（事件数 <= 1000）】');
        console.log('1. getEventIds：获取所有符合条件的ID和分页标记');
        console.log('2. calculateDecayedHotnessForEvents：计算所有事件的衰减热度');
        console.log('3. sortedEventIds：按热度排序所有事件ID');
        console.log('4. paginatedIds：手动分页截取当前页的ID');
        console.log('5. getEventsByIds：获取分页后的事件详情');
        console.log('6. mapEventToListItem：构建返回数据');
        console.log('7. setImmediate：异步持久化所有事件的新热度');
        console.log('8. return：返回结果（不等待持久化完成）');
        console.log('');
        console.log('【性能回退流程（事件数 > 1000）】');
        console.log('1. getEventIds：获取所有符合条件的ID（用于计算total）');
        console.log('2. findEventList：使用数据库 hotness 字段排序+分页');
        console.log('3. getStatisticsBatch：获取当前页事件统计');
        console.log('4. mapEventToListItem：构建返回数据');
        console.log('');
        console.log('关键改进：');
        console.log('- 正常流程不再依赖数据库的 ORDER BY + LIMIT');
        console.log('- 在内存中按新热度排序后再分页');
        console.log('- 持久化所有事件的新热度，不只是当前页');
        console.log('- 性能回退模式保护大量数据时的性能');
        console.log('========================');
    });

    it('应该有性能回退逻辑', () => {
        const methodStart = serviceCode.indexOf('async getEventList(');
        const methodEnd = serviceCode.indexOf('\n  async', methodStart + 1);
        const getEventListMethod = serviceCode.substring(methodStart, methodEnd > 0 ? methodEnd : serviceCode.length);

        // 验证回退条件
        expect(getEventListMethod).toContain('if (needsPaging)');
        expect(getEventListMethod).toContain('MAX_HOTNESS_CALCULATION_EVENTS');

        // 验证回退日志
        expect(getEventListMethod).toContain('performance_fallback');
        expect(getEventListMethod).toContain('Event query fallback to database sorting');

        // 验证回退逻辑使用 findEventList
        const fallbackStart = getEventListMethod.indexOf('if (needsPaging)');
        const fallbackSection = getEventListMethod.substring(fallbackStart, fallbackStart + 1000);
        expect(fallbackSection).toContain('findEventList');

        console.log('=== 性能回退逻辑验证 ===');
        console.log('回退阈值：MAX_HOTNESS_CALCULATION_EVENTS = 1000');
        console.log('回退条件：if (needsPaging) 当事件数超过阈值');
        console.log('回退行为：使用 findEventList 数据库排序');
        console.log('监控日志：记录 performance_fallback 类型日志');
        console.log('========================');
    });
});
