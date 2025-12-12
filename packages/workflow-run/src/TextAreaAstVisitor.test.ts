import { describe, it, expect } from 'vitest'
import { BehaviorSubject } from 'rxjs'
import { TextAreaAst } from '@sker/workflow'
import { TextAreaAstVisitor } from './TextAreaAstVisitor'
import { lastValueFrom } from 'rxjs'

describe('TextAreaAstVisitor 单元测试', () => {
    it('应该执行节点并设置正确的输出状态', async () => {
        const visitor = new TextAreaAstVisitor()
        const ast = new TextAreaAst()

        ast.id = 'test-node-1'
        ast.input = 'test input'
        ast.output = new BehaviorSubject<string|null>('')

        const result = await lastValueFrom(visitor.handler(ast, {}))

        expect(result.state).toBe('success')
        expect(result.output.getValue()).toBe('test input')
    })

    it('应该处理字符串输入', async () => {
        const visitor = new TextAreaAstVisitor()
        const ast = new TextAreaAst()

        ast.id = 'test-node-2'
        ast.input = '001\n'
        ast.output = new BehaviorSubject<string|null>('')

        const result = await lastValueFrom(visitor.handler(ast, {}))

        expect(result.state).toBe('success')
        expect(result.output.getValue()).toBe('001\n')
    })

    it('应该处理数组输入并用换行符连接', async () => {
        const visitor = new TextAreaAstVisitor()
        const ast = new TextAreaAst()

        ast.id = 'test-node-3'
        ast.input = ['line1', 'line2', 'line3'] as any
        ast.output = new BehaviorSubject<string|null>('')

        const result = await lastValueFrom(visitor.handler(ast, {}))

        expect(result.state).toBe('success')
        expect(result.output.getValue()).toBe('line1\nline2\nline3')
    })

    it('应该处理空字符串输入', async () => {
        const visitor = new TextAreaAstVisitor()
        const ast = new TextAreaAst()

        ast.id = 'test-node-4'
        ast.input = ''
        ast.output = new BehaviorSubject<string|null>('')

        const result = await lastValueFrom(visitor.handler(ast, {}))

        expect(result.state).toBe('success')
        expect(result.output.getValue()).toBe('')
    })

    it('应该处理对象输入并转换为 JSON', async () => {
        const visitor = new TextAreaAstVisitor()
        const ast = new TextAreaAst()

        ast.id = 'test-node-5'
        ast.input = { key: 'value' } as any
        ast.output = new BehaviorSubject<string|null>('')

        const result = await lastValueFrom(visitor.handler(ast, {}))

        expect(result.state).toBe('success')
        expect(result.output.getValue()).toBe('{"key":"value"}')
    })

    it('BehaviorSubject 应该立即发射值', async () => {
        const visitor = new TextAreaAstVisitor()
        const ast = new TextAreaAst()

        ast.id = 'test-node-6'
        ast.input = 'test'
        ast.output = new BehaviorSubject<string|null>('')

        const result = await lastValueFrom(visitor.handler(ast, {}))

        // 验证 BehaviorSubject 包含值
        let receivedValue: string | null = null
        result.output.subscribe((value: string | null) => {
            receivedValue = value
        })

        expect(receivedValue).toBe('test')
    })

    it('应该正确通过状态转换（pending → running → success）', async () => {
        const visitor = new TextAreaAstVisitor()
        const ast = new TextAreaAst()

        ast.id = 'test-node-7'
        ast.input = 'test'
        ast.output = new BehaviorSubject<string|null>('')

        const states: string[] = []

        const observable = visitor.handler(ast, {})
        observable.subscribe(node => {
            states.push(node.state)
        })

        await lastValueFrom(observable)

        expect(states).toContain('running')
        expect(states[states.length - 1]).toBe('success')
    })
})

