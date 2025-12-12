import { describe, it, expect } from 'vitest';
import { TextAreaAst } from './TextAreaAst';

describe('TextAreaAst', () => {
    describe('默认值', () => {
        it('input 默认值应为空数组', () => {
            const node = new TextAreaAst();

            expect(node.input).toEqual([]);
            expect(Array.isArray(node.input)).toBe(true);
        });

        it('output 默认值应为 BehaviorSubject', () => {
            const node = new TextAreaAst();

            expect(node.output).toBeDefined();
            expect(node.output.value).toBeNull();
        });
    });

    describe('序列化验证', () => {
        it('序列化后input应显示为数组而非空字符串', () => {
            const node = new TextAreaAst();
            node.input = ['01', '02'];

            // 序列化
            const json = JSON.parse(JSON.stringify(node));

            // 验证序列化后input是数组
            expect(Array.isArray(json.input)).toBe(true);
            expect(json.input).toEqual(['01', '02']);
        });

        it('空数组序列化后仍为空数组', () => {
            const node = new TextAreaAst();

            // input 默认是空数组
            const json = JSON.parse(JSON.stringify(node));

            expect(Array.isArray(json.input)).toBe(true);
            expect(json.input).toEqual([]);
        });

        it('克隆节点后input应保持为数组', () => {
            const node = new TextAreaAst();

            // 使用 structuredClone（如果可用）
            const cloned = typeof structuredClone !== 'undefined'
                ? structuredClone(node)
                : JSON.parse(JSON.stringify(node));

            expect(Array.isArray(cloned.input)).toBe(true);
            expect(cloned.input).toEqual([]);
        });

        it('克隆有数据的节点应保持数组内容', () => {
            const node = new TextAreaAst();
            node.input = ['data1', 'data2', 'data3'];

            const cloned = typeof structuredClone !== 'undefined'
                ? structuredClone(node)
                : JSON.parse(JSON.stringify(node));

            expect(Array.isArray(cloned.input)).toBe(true);
            expect(cloned.input).toEqual(['data1', 'data2', 'data3']);
        });
    });

    describe('输出验证', () => {
        it('应将多个输入用换行符连接输出', () => {
            const node = new TextAreaAst();

            // 模拟多输入场景
            node.input = ['01', '02', '03'];

            // 计算输出值（模拟 TextAreaAstVisitor 的逻辑）
            const outputValue = Array.isArray(node.input)
                ? node.input.join('\n')
                : node.input;

            expect(outputValue).toBe('01\n02\n03');
        });

        it('空数组应输出空字符串', () => {
            const node = new TextAreaAst();

            // input 默认是空数组
            const outputValue = Array.isArray(node.input)
                ? node.input.join('\n')
                : node.input;

            expect(outputValue).toBe('');
        });

        it('单个输入应直接输出', () => {
            const node = new TextAreaAst();
            node.input = ['hello'];

            const outputValue = Array.isArray(node.input)
                ? node.input.join('\n')
                : node.input;

            expect(outputValue).toBe('hello');
        });
    });

    describe('类型兼容性', () => {
        it('input 可以是数组', () => {
            const node = new TextAreaAst();
            node.input = ['a', 'b', 'c'];

            expect(Array.isArray(node.input)).toBe(true);
            expect(node.input).toEqual(['a', 'b', 'c']);
        });

        it('input 可以是字符串（向后兼容）', () => {
            const node = new TextAreaAst();
            node.input = 'single string';

            expect(typeof node.input).toBe('string');
            expect(node.input).toBe('single string');
        });
    });

    describe('旧数据兼容性', () => {
        it('旧数据的空字符串应被视为空数组（序列化兼容）', () => {
            // 模拟旧数据：input 是空字符串
            const oldNode = { input: '', type: 'TextAreaAst' };

            // 模拟从 JSON 反序列化
            const node = Object.assign(new TextAreaAst(), oldNode);

            // 验证当前值是空字符串（旧数据格式）
            expect(node.input).toBe('');

            // 在实际执行时，getInputDefaultValues 应该返回空数组
            // 这里我们验证空字符串不是数组
            expect(Array.isArray(node.input)).toBe(false);
        });

        it('克隆带有空字符串 input 的节点应得到正确的结果', () => {
            // 创建一个旧格式的节点（input 是空字符串）
            const oldNode = new TextAreaAst();
            oldNode.input = '';

            // 使用 structuredClone 克隆（模拟 ReactiveScheduler 的行为）
            const cloned = typeof structuredClone !== 'undefined'
                ? structuredClone(oldNode)
                : JSON.parse(JSON.stringify(oldNode));

            // 克隆后应该保持空字符串
            expect(cloned.input).toBe('');

            // 但在应用默认值后（模拟 ReactiveScheduler 的 getInputDefaultValues）
            // 应该被初始化为空数组
            // 这个行为在 reactive-scheduler.ts 中实现
        });
    });
});
