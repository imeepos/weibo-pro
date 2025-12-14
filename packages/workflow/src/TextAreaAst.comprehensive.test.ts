import { describe, it, expect, beforeEach } from 'vitest'
import { root, Injectable } from '@sker/core'
import { TextAreaAst } from './TextAreaAst'
import { Handler } from './decorator'
import { Observable, BehaviorSubject } from 'rxjs'
import { lastValueFrom } from 'rxjs'
import { type INode } from './types'
import { Compiler } from './compiler'

/**
 * TextAreaAstVisitor - 文本节点的访问器实现
 * 用于测试 TextAreaAst 节点的行为
 */
@Injectable()
class TextAreaAstVisitor {
    @Handler(TextAreaAst)
    visit(ast: TextAreaAst): Observable<INode> {
        return new Observable(obs => {
            ast.state = 'running'
            obs.next({ ...ast })

            // 处理输入数据
            const inputValue = Array.isArray(ast.input)
                ? ast.input.join('\n')
                : ast.input || ''

            // 设置输出值
            ast.output.next(inputValue)
            obs.next({ ...ast })

            ast.state = 'success'
            obs.next({ ...ast })
            obs.complete()
        })
    }
}

/**
 * TextAreaAstEmptyInputVisitor - 测试空输入的访问器
 */
@Injectable()
class TextAreaAstEmptyInputVisitor {
    @Handler(TextAreaAst)
    visit(ast: TextAreaAst): Observable<INode> {
        return new Observable(obs => {
            ast.state = 'running'
            obs.next({ ...ast })

            // 即使输入为空，也应正常处理
            const inputValue = Array.isArray(ast.input)
                ? ast.input.join('\n')
                : ast.input || ''

            ast.output.next(inputValue)
            obs.next({ ...ast })

            ast.state = 'success'
            obs.next({ ...ast })
            obs.complete()
        })
    }
}

/**
 * TextAreaAstMultiInputVisitor - 测试多输入的访问器
 */
@Injectable()
class TextAreaAstMultiInputVisitor {
    @Handler(TextAreaAst)
    visit(ast: TextAreaAst): Observable<INode> {
        return new Observable(obs => {
            ast.state = 'running'
            obs.next({ ...ast })

            // 处理多个输入
            const inputValue = Array.isArray(ast.input)
                ? ast.input.map(v => String(v)).join('\n')
                : ast.input || ''

            ast.output.next(inputValue)
            obs.next({ ...ast })

            ast.state = 'success'
            obs.next({ ...ast })
            obs.complete()
        })
    }
}

/**
 * 创建编译后的 TextAreaAst 测试节点
 */
function createCompiledNode(overrides?: Partial<TextAreaAst>): INode {
    const compiler = root.get(Compiler)
    const instance = new TextAreaAst()
    Object.assign(instance, overrides)
    return compiler.compile(instance)
}

/**
 * 获取最终结果
 */
function getFinal<T>(obs: Observable<T>): Promise<T> {
    return lastValueFrom(obs)
}

describe('TextAreaAst - 文本节点', () => {
    let visitor: TextAreaAstVisitor
    let emptyInputVisitor: TextAreaAstEmptyInputVisitor
    let multiInputVisitor: TextAreaAstMultiInputVisitor
    let compiler: Compiler

    beforeEach(() => {
        visitor = root.get(TextAreaAstVisitor)
        emptyInputVisitor = root.get(TextAreaAstEmptyInputVisitor)
        multiInputVisitor = root.get(TextAreaAstMultiInputVisitor)
        compiler = root.get(Compiler)
    })

    describe('节点定义', () => {
        it('应正确设置节点元数据', () => {
            const rawNode = new TextAreaAst()
            const node = compiler.compile(rawNode)

            expect(node.metadata.class.title).toBe('文本节点')
            expect(node.metadata.class.type).toBe('basic')
            expect(node.metadata.inputs).toHaveLength(1)
            expect(node.metadata.inputs[0].property).toBe('input')
            expect(node.metadata.inputs[0].mode).toBe('IS_MULTI') // 聚合多条边
            expect(node.metadata.outputs).toHaveLength(1)
            expect(node.metadata.outputs[0].property).toBe('output')
            expect(node.metadata.states).toHaveLength(0)
        })

        it('应正确配置输入和输出', () => {
            const node = new TextAreaAst()

            expect(node.input).toEqual([])
            expect(node.output).toBeInstanceOf(BehaviorSubject)
            expect(node.output.value).toBeNull()
        })
    })

    describe('访问器行为', () => {
        it('应正确处理单个字符串输入', async () => {
            const ast = new TextAreaAst()
            ast.input = 'Hello World'
            const compiledAst = createCompiledNode(ast)

            const result = await getFinal(visitor.visit(compiledAst as TextAreaAst))

            expect(result.state).toBe('success')

            // 验证输出 BehaviorSubject
            const outputValue = await new Promise(resolve => {
                (result as any).output.subscribe(value => resolve(value))
            })

            expect(outputValue).toBe('Hello World')
        })

        it('应正确处理数组输入', async () => {
            const ast = new TextAreaAst()
            ast.input = ['Line 1', 'Line 2', 'Line 3']
            const compiledAst = createCompiledNode(ast)

            const result = await getFinal(visitor.visit(compiledAst as TextAreaAst))

            expect(result.state).toBe('success')

            const outputValue = await new Promise(resolve => {
                (result as any).output.subscribe(value => resolve(value))
            })

            expect(outputValue).toBe('Line 1\nLine 2\nLine 3')
        })

        it('应正确处理空输入', async () => {
            const ast = new TextAreaAst()
            ast.input = []
            const compiledAst = createCompiledNode(ast)

            const result = await getFinal(emptyInputVisitor.visit(compiledAst as TextAreaAst))

            expect(result.state).toBe('success')

            const outputValue = await new Promise(resolve => {
                (result as any).output.subscribe(value => resolve(value))
            })

            expect(outputValue).toBe('')
        })

        it('应正确处理 undefined 输入', async () => {
            const ast = new TextAreaAst()
            ast.input = undefined as any
            const compiledAst = createCompiledNode(ast)

            const result = await getFinal(emptyInputVisitor.visit(compiledAst as TextAreaAst))

            expect(result.state).toBe('success')

            const outputValue = await new Promise(resolve => {
                (result as any).output.subscribe(value => resolve(value))
            })

            expect(outputValue).toBe('')
        })

        it('应正确处理 null 输入', async () => {
            const ast = new TextAreaAst()
            ast.input = null as any
            const compiledAst = createCompiledNode(ast)

            const result = await getFinal(emptyInputVisitor.visit(compiledAst as TextAreaAst))

            expect(result.state).toBe('success')

            const outputValue = await new Promise(resolve => {
                (result as any).output.subscribe(value => resolve(value))
            })

            expect(outputValue).toBe('')
        })

        it('应正确发射中间状态', async () => {
            const ast = new TextAreaAst()
            ast.input = ['test1', 'test2']
            const compiledAst = createCompiledNode(ast)

            const states: INode[] = []
            const subscription = visitor.visit(compiledAst as TextAreaAst).subscribe(state => {
                states.push(state)
            })

            await new Promise(resolve => setTimeout(resolve, 10))

            expect(states).toHaveLength(3)
            expect(states[0].state).toBe('running')
            expect(states[1].state).toBe('running')
            expect(states[2].state).toBe('success')

            subscription.unsubscribe()
        })
    })

    describe('数据流测试', () => {
        it('应正确处理 BehaviorSubject 的订阅', async () => {
            const ast = new TextAreaAst()
            ast.input = ['A', 'B', 'C']
            const compiledAst = createCompiledNode(ast)

            const outputValues: any[] = []
            const subscription = (compiledAst as any).output.subscribe(value => {
                outputValues.push(value)
            })

            await getFinal(visitor.visit(compiledAst as TextAreaAst))

            await new Promise(resolve => setTimeout(resolve, 10))

            expect(outputValues).toHaveLength(2) // 初始 null + 处理后的值
            expect(outputValues[0]).toBeNull()
            expect(outputValues[1]).toBe('A\nB\nC')

            subscription.unsubscribe()
        })

        it('应正确处理多次更新', async () => {
            const ast = new TextAreaAst()
            ast.input = ['initial']
            const compiledAst = createCompiledNode(ast)

            const outputValues: any[] = []
            const subscription = (compiledAst as any).output.subscribe(value => {
                outputValues.push(value)
            })

            // 第一次执行
            await getFinal(visitor.visit(compiledAst as TextAreaAst))

            // 更新输入
            compiledAst.input = ['updated']
            await getFinal(visitor.visit(compiledAst as TextAreaAst))

            await new Promise(resolve => setTimeout(resolve, 10))

            // 应该有初始值、第一次结果、第二次结果
            expect(outputValues).toHaveLength(3)
            expect(outputValues[0]).toBeNull()
            expect(outputValues[1]).toBe('initial')
            expect(outputValues[2]).toBe('updated')

            subscription.unsubscribe()
        })

        it('应正确处理并发订阅', async () => {
            const ast = new TextAreaAst()
            ast.input = ['concurrent']
            const compiledAst = createCompiledNode(ast)

            const outputValues1: any[] = []
            const outputValues2: any[] = []

            const sub1 = (compiledAst as any).output.subscribe(value => {
                outputValues1.push(value)
            })

            const sub2 = (compiledAst as any).output.subscribe(value => {
                outputValues2.push(value)
            })

            await getFinal(visitor.visit(compiledAst as TextAreaAst))

            await new Promise(resolve => setTimeout(resolve, 10))

            // 两个订阅都应收到相同的数据
            expect(outputValues1).toEqual(outputValues2)
            expect(outputValues1).toHaveLength(2)
            expect(outputValues1[1]).toBe('concurrent')

            sub1.unsubscribe()
            sub2.unsubscribe()
        })
    })

    describe('IS_MULTI 输入模式测试', () => {
        it('应正确聚合多条边的数据', async () => {
            const ast = new TextAreaAst()

            // 模拟多条边的数据
            ast.input = ['From Edge 1', 'From Edge 2', 'From Edge 3']
            const compiledAst = createCompiledNode(ast)

            const result = await getFinal(multiInputVisitor.visit(compiledAst as TextAreaAst))

            expect(result.state).toBe('success')

            const outputValue = await new Promise(resolve => {
                (result as any).output.subscribe(value => resolve(value))
            })

            expect(outputValue).toBe('From Edge 1\nFrom Edge 2\nFrom Edge 3')
        })

        it('应正确处理单条边数据', async () => {
            const ast = new TextAreaAst()
            ast.input = ['Single Edge Data']
            const compiledAst = createCompiledNode(ast)

            const result = await getFinal(multiInputVisitor.visit(compiledAst as TextAreaAst))

            expect(result.state).toBe('success')

            const outputValue = await new Promise(resolve => {
                (result as any).output.subscribe(value => resolve(value))
            })

            expect(outputValue).toBe('Single Edge Data')
        })

        it('应正确处理混合类型输入', async () => {
            const ast = new TextAreaAst()
            ast.input = ['String 1', 123, true, null, undefined]
            const compiledAst = createCompiledNode(ast)

            const result = await getFinal(multiInputVisitor.visit(compiledAst as TextAreaAst))

            expect(result.state).toBe('success')

            const outputValue = await new Promise(resolve => {
                (result as any).output.subscribe(value => resolve(value))
            })

            expect(outputValue).toBe('String 1\n123\ntrue\nnull\nundefined')
        })
    })

    describe('错误恢复测试', () => {
        it('应正确处理多次执行', async () => {
            const ast = new TextAreaAst()
            ast.input = ['first']
            const compiledAst = createCompiledNode(ast)

            // 第一次执行
            let result = await getFinal(visitor.visit(compiledAst as TextAreaAst))
            expect(result.state).toBe('success')

            // 重置状态后再次执行
            compiledAst.state = 'pending'
            compiledAst.error = undefined

            compiledAst.input = ['second']
            result = await getFinal(visitor.visit(compiledAst as TextAreaAst))
            expect(result.state).toBe('success')

            const outputValue = await new Promise(resolve => {
                (result as any).output.subscribe(value => resolve(value))
            })

            expect(outputValue).toBe('second')
        })
    })

    describe('边界情况测试', () => {
        it('应正确处理超长输入', async () => {
            const ast = new TextAreaAst()
            const longText = 'A'.repeat(10000)
            ast.input = [longText]
            const compiledAst = createCompiledNode(ast)

            const result = await getFinal(visitor.visit(compiledAst as TextAreaAst))

            expect(result.state).toBe('success')

            const outputValue = await new Promise(resolve => {
                (result as any).output.subscribe(value => resolve(value))
            })

            expect(outputValue).toBe(longText)
        })

        it('应正确处理特殊字符', async () => {
            const ast = new TextAreaAst()
            ast.input = ['Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?']
            const compiledAst = createCompiledNode(ast)

            const result = await getFinal(visitor.visit(compiledAst as TextAreaAst))

            expect(result.state).toBe('success')

            const outputValue = await new Promise(resolve => {
                (result as any).output.subscribe(value => resolve(value))
            })

            expect(outputValue).toBe('Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?')
        })

        it('应正确处理换行符', async () => {
            const ast = new TextAreaAst()
            ast.input = ['Line with\ninternal line breaks', 'Another line']
            const compiledAst = createCompiledNode(ast)

            const result = await getFinal(visitor.visit(compiledAst as TextAreaAst))

            expect(result.state).toBe('success')

            const outputValue = await new Promise(resolve => {
                (result as any).output.subscribe(value => resolve(value))
            })

            expect(outputValue).toBe('Line with\ninternal line breaks\nAnother line')
        })

        it('应正确处理空字符串数组', async () => {
            const ast = new TextAreaAst()
            ast.input = ['', '', '']
            const compiledAst = createCompiledNode(ast)

            const result = await getFinal(visitor.visit(compiledAst as TextAreaAst))

            expect(result.state).toBe('success')

            const outputValue = await new Promise(resolve => {
                (result as any).output.subscribe(value => resolve(value))
            })

            expect(outputValue).toBe('\n\n')
        })
    })

    describe('类型兼容性测试', () => {
        it('应正确处理联合类型 input', async () => {
            const ast = new TextAreaAst()

            // 测试数组类型
            ast.input = ['array input']
            let compiledAst = createCompiledNode(ast)
            let result = await getFinal(visitor.visit(compiledAst as TextAreaAst))
            let outputValue = await new Promise(resolve => {
                (result as any).output.subscribe(value => resolve(value))
            })
            expect(outputValue).toBe('array input')

            // 测试字符串类型
            ast.input = 'string input'
            compiledAst = createCompiledNode(ast)
            result = await getFinal(visitor.visit(compiledAst as TextAreaAst))
            outputValue = await new Promise(resolve => {
                (result as any).output.subscribe(value => resolve(value))
            })
            expect(outputValue).toBe('string input')
        })
    })

    describe('序列化兼容性测试', () => {
        it('应正确处理序列化和反序列化', async () => {
            const ast = new TextAreaAst()
            ast.input = ['serialized', 'data']
            const compiledAst = createCompiledNode(ast)

            // 序列化
            const serialized = JSON.parse(JSON.stringify(compiledAst))

            // 验证序列化后的数据
            expect(Array.isArray(serialized.input)).toBe(true)
            expect(serialized.input).toEqual(['serialized', 'data'])

            // 反序列化
            const deserialized = Object.assign(new TextAreaAst(), serialized)

            expect(deserialized.input).toEqual(['serialized', 'data'])

            // 执行访问器
            const result = await getFinal(visitor.visit(deserialized as TextAreaAst))

            expect(result.state).toBe('success')

            const outputValue = await new Promise(resolve => {
                (result as any).output.subscribe(value => resolve(value))
            })

            expect(outputValue).toBe('serialized\ndata')
        })
    })
})