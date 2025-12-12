import { describe, it, expect } from 'vitest';
import { ReactiveScheduler } from './reactive-scheduler';
import { TextAreaAst } from '../TextAreaAst';
import { root } from '@sker/core';
import { Compiler } from '../compiler';

/**
 * 单元测试：专门测试 getInputDefaultValues 方法的行为
 *
 * 这个测试直接验证核心问题：
 * 当节点的 input 是空字符串（旧数据）时，
 * getInputDefaultValues 应该返回什么？
 */
describe('ReactiveScheduler - getInputDefaultValues 行为测试', () => {
    it('对于 IS_MULTI 模式的空字符串input，应该初始化为空数组', () => {
        const scheduler = root.get(ReactiveScheduler) as any;
        const compiler = root.get(Compiler);

        // 创建一个旧数据格式的节点（input 是空字符串）
        const node = new TextAreaAst();
        node.id = 'test-node';
        node.input = '';  // ❌ 旧数据：空字符串

        // 编译节点（设置 metadata）
        compiler.compile(node);

        console.log('[测试] 节点初始 input:', node.input, '类型:', typeof node.input);

        // 调用 getInputDefaultValues（这是private方法，我们通过 as any 访问）
        const defaults = scheduler.getInputDefaultValues(node);

        console.log('[测试] getInputDefaultValues 返回:', defaults);
        console.log('[测试] defaults.input:', defaults.input);
        console.log('[测试] defaults.input 类型:', typeof defaults.input);
        console.log('[测试] defaults.input 是否为数组:', Array.isArray(defaults.input));

        // ⚠️ 关键断言：对于旧数据（空字符串），应该返回空数组
        // 当前实现可能不会设置 defaults.input，导致它是 undefined
        // 修复后应该是空数组
        if (defaults.input === undefined) {
            console.warn('❌ BUG 确认：defaults.input 是 undefined，这会导致空字符串被保留');
            // 这个测试应该失败，确认bug
            expect(defaults.input).toBeDefined();
        } else {
            expect(Array.isArray(defaults.input)).toBe(true);
            expect(defaults.input).toEqual([]);
        }
    });

    it('对于 IS_MULTI 模式的数组input，应该重置为空数组（避免累积旧数据）', () => {
        const scheduler = root.get(ReactiveScheduler) as any;
        const compiler = root.get(Compiler);

        // 创建一个已有数据的节点（模拟上次执行后的状态）
        const node = new TextAreaAst();
        node.id = 'test-node';
        node.input = ['a', 'b'];  // 上次执行遗留的数据

        compiler.compile(node);

        const defaults = scheduler.getInputDefaultValues(node);

        console.log('[测试-数组] defaults.input:', defaults.input);

        // IS_MULTI 模式应该重置为空数组，避免累积旧数据
        expect(Array.isArray(defaults.input)).toBe(true);
        expect(defaults.input).toEqual([]);
    });

    it('验证完整的克隆+默认值流程', () => {
        const scheduler = root.get(ReactiveScheduler) as any;
        const compiler = root.get(Compiler);

        // 创建旧数据节点
        const originalNode = new TextAreaAst();
        originalNode.id = 'test-node';
        originalNode.input = '';  // 旧数据

        compiler.compile(originalNode);

        console.log('\n=== 完整流程测试 ===');
        console.log('1. 原始节点 input:', originalNode.input, '类型:', typeof originalNode.input);

        // 模拟 cloneNode（使用 structuredClone 或 JSON）
        const cloned = typeof structuredClone !== 'undefined'
            ? structuredClone(originalNode)
            : JSON.parse(JSON.stringify(originalNode));

        console.log('2. 克隆后 input:', cloned.input, '类型:', typeof cloned.input);

        // 获取默认值
        const defaults = scheduler.getInputDefaultValues(compiler.compile(cloned));
        console.log('3. 默认值:', defaults);

        // 应用默认值（模拟 Object.assign(nodeInstance, defaults)）
        const nodeInstance = Object.assign({}, cloned, defaults);
        console.log('4. 应用默认值后 input:', nodeInstance.input, '类型:', typeof nodeInstance.input);

        // ⚠️ 关键验证：应用默认值后，input 应该是数组
        expect(Array.isArray(nodeInstance.input)).toBe(true);
        expect(nodeInstance.input).toEqual([]);
    });
});
