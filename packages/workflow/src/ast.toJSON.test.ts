import { describe, expect, it } from 'vitest'
import { BehaviorSubject } from 'rxjs'
import { TextAreaAst } from './TextAreaAst'
import { root } from '@sker/core'
import { Compiler } from './compiler'

describe('Ast.toJSON() - BehaviorSubject 序列化', () => {
    it('序列化时应该排除 BehaviorSubject 属性', () => {
        const ast = new TextAreaAst()
        ast.input = 'test input'
        ast.output.next('test output')

        // 序列化
        const json = JSON.parse(JSON.stringify(ast))

        // ✅ input 应该正常序列化
        expect(json.input).toBe('test input')

        // ✅ output (BehaviorSubject) 应该被排除
        expect(json.output).toBeUndefined()

        // ✅ 不应该有 BehaviorSubject 的内部状态
        expect(json.observers).toBeUndefined()
        expect(json.closed).toBeUndefined()
        expect(json.isStopped).toBeUndefined()
        expect(json._value).toBeUndefined()
    })

    it('反序列化后 Compiler 应该重建 BehaviorSubject', () => {
        const compiler = root.get(Compiler)

        // 原始节点
        const original = new TextAreaAst()
        original.input = 'original input'
        original.output.next('original output')

        // 序列化 + 反序列化
        const json = JSON.parse(JSON.stringify(original))
        expect(json.output).toBeUndefined() // 确认已排除

        // 通过 Compiler 重建
        const restored = compiler.compile(json)

        // ✅ input 应该恢复
        expect(restored.input).toBe('original input')

        // ✅ output 应该是新的 BehaviorSubject 实例
        expect(restored.output).toBeInstanceOf(BehaviorSubject)

        // ✅ BehaviorSubject 应该是初始状态（null）
        expect(restored.output.value).toBeNull()
    })

    it('序列化时应该保留普通属性', () => {
        const ast = new TextAreaAst()
        ast.id = 'test-id'
        ast.state = 'success'
        ast.count = 5
        ast.input = ['item1', 'item2']
        ast.position = { x: 100, y: 200 }

        const json = JSON.parse(JSON.stringify(ast))

        // ✅ 所有普通属性应该保留
        expect(json.id).toBe('test-id')
        expect(json.state).toBe('success')
        expect(json.count).toBe(5)
        expect(json.input).toEqual(['item1', 'item2'])
        expect(json.position).toEqual({ x: 100, y: 200 })

        // ✅ BehaviorSubject 应该排除
        expect(json.output).toBeUndefined()
    })

    it('克隆工作流时不应该包含 BehaviorSubject', () => {
        const ast = new TextAreaAst()
        ast.input = 'test'
        ast.output.next('result')

        // 模拟克隆操作（常见场景）
        const cloned = JSON.parse(JSON.stringify(ast))

        // ✅ BehaviorSubject 应该被排除
        expect(cloned.output).toBeUndefined()

        // ✅ 克隆的数据结构应该干净
        expect(Object.keys(cloned)).not.toContain('output')
    })

    it('WorkflowGraphAst 嵌套节点序列化', () => {
        const node1 = new TextAreaAst()
        node1.id = 'node1'
        node1.input = 'node1-input'
        node1.output.next('node1-output')

        const node2 = new TextAreaAst()
        node2.id = 'node2'
        node2.input = 'node2-input'
        node2.output.next('node2-output')

        // 模拟工作流数据
        const workflow = {
            id: 'workflow-1',
            type: 'WorkflowGraphAst',
            nodes: [node1, node2],
            edges: []
        }

        // 序列化整个工作流
        const json = JSON.parse(JSON.stringify(workflow))

        // ✅ 嵌套节点的 BehaviorSubject 应该全部排除
        expect(json.nodes[0].output).toBeUndefined()
        expect(json.nodes[1].output).toBeUndefined()

        // ✅ 普通属性应该保留
        expect(json.nodes[0].input).toBe('node1-input')
        expect(json.nodes[1].input).toBe('node2-input')
    })

    it('测试真实场景：工作流执行后序列化', () => {
        const compiler = root.get(Compiler)

        // 创建并编译节点
        const ast = new TextAreaAst()
        ast.input = 'initial'
        const compiled = compiler.compile(ast)

        // 模拟执行（output 发射值）
        compiled.output.next('execution result')
        compiled.state = 'success'
        compiled.count = 1

        // 序列化（保存到数据库/传输到前端）
        const saved = JSON.parse(JSON.stringify(compiled))

        // ✅ 运行时状态应该保留
        expect(saved.state).toBe('success')
        expect(saved.count).toBe(1)

        // ✅ BehaviorSubject 应该排除
        expect(saved.output).toBeUndefined()

        // 反序列化恢复
        const restored = compiler.compile(saved)

        // ✅ BehaviorSubject 应该重建
        expect(restored.output).toBeInstanceOf(BehaviorSubject)
        expect(restored.output.value).toBeNull() // 初始状态
    })
})
