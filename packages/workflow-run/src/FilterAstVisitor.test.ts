import { describe, it, expect, beforeEach } from 'vitest'
import { FilterAstVisitor } from './FilterAstVisitor'
import { BehaviorSubject } from 'rxjs'

interface MockFilterAst {
    items: any[]
    conditions: Array<{ field: string; operator: string; value?: any }>
    logic: 'and' | 'or'
    expression?: string
    matched: BehaviorSubject<any[]>
    matchedCount: BehaviorSubject<number>
    state?: string
}

const createMockAst = (overrides: Partial<MockFilterAst> = {}): MockFilterAst => ({
    items: [],
    conditions: [],
    logic: 'and',
    matched: new BehaviorSubject<any[]>([]),
    matchedCount: new BehaviorSubject<number>(0),
    ...overrides,
})

describe('FilterAstVisitor', () => {
    let visitor: FilterAstVisitor

    beforeEach(() => {
        visitor = new FilterAstVisitor()
    })

    describe('基础过滤', () => {
        it('无条件时过滤掉 falsy 值', async () => {
            const ast = createMockAst({
                items: [1, 0, 'hello', '', null, undefined, { id: 1 }],
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.matched.getValue()).toEqual([1, 'hello', { id: 1 }])
                        expect(ast.matchedCount.getValue()).toBe(3)
                        resolve()
                    },
                })
            })
        })

        it('处理空数组', async () => {
            const ast = createMockAst({ items: [] })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.matched.getValue()).toEqual([])
                        expect(ast.matchedCount.getValue()).toBe(0)
                        resolve()
                    },
                })
            })
        })

        it('处理嵌套数组（自动展平）', async () => {
            const ast = createMockAst({
                items: [[1, 2], [3, 4]],
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.matched.getValue()).toEqual([1, 2, 3, 4])
                        resolve()
                    },
                })
            })
        })
    })

    describe('条件过滤 - equals', () => {
        it('equals 操作符', async () => {
            const ast = createMockAst({
                items: [{ status: 'active' }, { status: 'inactive' }, { status: 'active' }],
                conditions: [{ field: 'status', operator: 'equals', value: 'active' }],
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.matched.getValue()).toHaveLength(2)
                        expect(ast.matched.getValue().every((item: any) => item.status === 'active')).toBe(true)
                        resolve()
                    },
                })
            })
        })

        it('notEquals 操作符', async () => {
            const ast = createMockAst({
                items: [{ status: 'active' }, { status: 'inactive' }],
                conditions: [{ field: 'status', operator: 'notEquals', value: 'active' }],
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.matched.getValue()).toHaveLength(1)
                        expect(ast.matched.getValue()[0].status).toBe('inactive')
                        resolve()
                    },
                })
            })
        })
    })

    describe('条件过滤 - 数值比较', () => {
        it('gt (大于)', async () => {
            const ast = createMockAst({
                items: [{ score: 50 }, { score: 80 }, { score: 90 }],
                conditions: [{ field: 'score', operator: 'gt', value: 70 }],
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.matched.getValue()).toHaveLength(2)
                        resolve()
                    },
                })
            })
        })

        it('gte (大于等于)', async () => {
            const ast = createMockAst({
                items: [{ score: 70 }, { score: 80 }],
                conditions: [{ field: 'score', operator: 'gte', value: 70 }],
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.matched.getValue()).toHaveLength(2)
                        resolve()
                    },
                })
            })
        })

        it('lt (小于)', async () => {
            const ast = createMockAst({
                items: [{ score: 50 }, { score: 80 }],
                conditions: [{ field: 'score', operator: 'lt', value: 70 }],
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.matched.getValue()).toHaveLength(1)
                        expect(ast.matched.getValue()[0].score).toBe(50)
                        resolve()
                    },
                })
            })
        })

        it('lte (小于等于)', async () => {
            const ast = createMockAst({
                items: [{ score: 70 }, { score: 80 }],
                conditions: [{ field: 'score', operator: 'lte', value: 70 }],
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.matched.getValue()).toHaveLength(1)
                        resolve()
                    },
                })
            })
        })
    })

    describe('条件过滤 - 字符串操作', () => {
        it('contains', async () => {
            const ast = createMockAst({
                items: [{ name: 'hello world' }, { name: 'goodbye' }],
                conditions: [{ field: 'name', operator: 'contains', value: 'hello' }],
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.matched.getValue()).toHaveLength(1)
                        resolve()
                    },
                })
            })
        })

        it('startsWith', async () => {
            const ast = createMockAst({
                items: [{ name: 'hello world' }, { name: 'world hello' }],
                conditions: [{ field: 'name', operator: 'startsWith', value: 'hello' }],
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.matched.getValue()).toHaveLength(1)
                        expect(ast.matched.getValue()[0].name).toBe('hello world')
                        resolve()
                    },
                })
            })
        })

        it('endsWith', async () => {
            const ast = createMockAst({
                items: [{ name: 'hello world' }, { name: 'world hello' }],
                conditions: [{ field: 'name', operator: 'endsWith', value: 'hello' }],
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.matched.getValue()).toHaveLength(1)
                        expect(ast.matched.getValue()[0].name).toBe('world hello')
                        resolve()
                    },
                })
            })
        })

        it('regex', async () => {
            const ast = createMockAst({
                items: [{ email: 'test@example.com' }, { email: 'invalid' }],
                conditions: [{ field: 'email', operator: 'regex', value: '^[\\w]+@[\\w]+\\.[\\w]+$' }],
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.matched.getValue()).toHaveLength(1)
                        resolve()
                    },
                })
            })
        })
    })

    describe('条件过滤 - 空值检查', () => {
        it('isEmpty', async () => {
            const ast = createMockAst({
                items: [{ value: '' }, { value: 'hello' }, { value: null }, { value: [] }],
                conditions: [{ field: 'value', operator: 'isEmpty' }],
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.matched.getValue()).toHaveLength(3)
                        resolve()
                    },
                })
            })
        })

        it('isNotEmpty', async () => {
            const ast = createMockAst({
                items: [{ value: '' }, { value: 'hello' }, { value: null }],
                conditions: [{ field: 'value', operator: 'isNotEmpty' }],
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.matched.getValue()).toHaveLength(1)
                        expect(ast.matched.getValue()[0].value).toBe('hello')
                        resolve()
                    },
                })
            })
        })
    })

    describe('多条件组合', () => {
        it('AND 逻辑', async () => {
            const ast = createMockAst({
                items: [
                    { status: 'active', score: 80 },
                    { status: 'active', score: 50 },
                    { status: 'inactive', score: 90 },
                ],
                conditions: [
                    { field: 'status', operator: 'equals', value: 'active' },
                    { field: 'score', operator: 'gt', value: 60 },
                ],
                logic: 'and',
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.matched.getValue()).toHaveLength(1)
                        expect(ast.matched.getValue()[0]).toEqual({ status: 'active', score: 80 })
                        resolve()
                    },
                })
            })
        })

        it('OR 逻辑', async () => {
            const ast = createMockAst({
                items: [
                    { status: 'active', score: 50 },
                    { status: 'inactive', score: 90 },
                    { status: 'inactive', score: 50 },
                ],
                conditions: [
                    { field: 'status', operator: 'equals', value: 'active' },
                    { field: 'score', operator: 'gt', value: 80 },
                ],
                logic: 'or',
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.matched.getValue()).toHaveLength(2)
                        resolve()
                    },
                })
            })
        })
    })

    describe('表达式过滤', () => {
        it('简单表达式', async () => {
            const ast = createMockAst({
                items: [{ score: 50 }, { score: 80 }, { score: 90 }],
                expression: 'item.score > 70',
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.matched.getValue()).toHaveLength(2)
                        resolve()
                    },
                })
            })
        })

        it('复杂表达式', async () => {
            const ast = createMockAst({
                items: [
                    { status: 'active', count: 10 },
                    { status: 'active', count: 5 },
                    { status: 'inactive', count: 20 },
                ],
                expression: 'item.status === "active" && item.count > 8',
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.matched.getValue()).toHaveLength(1)
                        resolve()
                    },
                })
            })
        })

        it('使用 index 参数', async () => {
            const ast = createMockAst({
                items: ['a', 'b', 'c', 'd', 'e'],
                expression: 'index % 2 === 0',
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.matched.getValue()).toEqual(['a', 'c', 'e'])
                        resolve()
                    },
                })
            })
        })

        it('无效表达式返回空数组', async () => {
            const ast = createMockAst({
                items: [1, 2, 3],
                expression: 'invalid syntax {{{{',
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.matched.getValue()).toEqual([])
                        resolve()
                    },
                })
            })
        })
    })

    describe('嵌套字段访问', () => {
        it('支持点号访问嵌套字段', async () => {
            const ast = createMockAst({
                items: [
                    { user: { profile: { age: 25 } } },
                    { user: { profile: { age: 35 } } },
                ],
                conditions: [{ field: 'user.profile.age', operator: 'gt', value: 30 }],
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.matched.getValue()).toHaveLength(1)
                        expect(ast.matched.getValue()[0].user.profile.age).toBe(35)
                        resolve()
                    },
                })
            })
        })
    })

    describe('状态流转', () => {
        it('正确的状态变化', async () => {
            const ast = createMockAst({ items: [1, 2, 3] })
            const states: string[] = []

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    next: (node: any) => states.push(node.state),
                    complete: () => {
                        expect(states).toContain('running')
                        expect(states).toContain('success')
                        expect(states[states.length - 1]).toBe('success')
                        resolve()
                    },
                })
            })
        })
    })
})
