import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { LoopAstVisitor } from './LoopAstVisitor'
import { BehaviorSubject } from 'rxjs'

interface MockLoopAst {
    items: any[]
    batchSize: number
    delay: number
    current: BehaviorSubject<any>
    index: BehaviorSubject<number>
    total: BehaviorSubject<number>
    done: BehaviorSubject<boolean>
    state?: string
}

const createMockAst = (overrides: Partial<MockLoopAst> = {}): MockLoopAst => ({
    items: [],
    batchSize: 1,
    delay: 0,
    current: new BehaviorSubject<any>(undefined),
    index: new BehaviorSubject<number>(0),
    total: new BehaviorSubject<number>(0),
    done: new BehaviorSubject<boolean>(false),
    ...overrides,
})

describe('LoopAstVisitor', () => {
    let visitor: LoopAstVisitor

    beforeEach(() => {
        visitor = new LoopAstVisitor()
    })

    describe('基础循环', () => {
        it('逐个发射数组元素', async () => {
            const ast = createMockAst({
                items: ['a', 'b', 'c'],
                batchSize: 1,
            })

            const emittedItems: any[] = []
            const emittedIndices: number[] = []
            let lastValue: any

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    next: () => {
                        const current = ast.current.getValue()
                        if (current !== undefined && current !== lastValue) {
                            lastValue = current
                            emittedItems.push(current)
                            emittedIndices.push(ast.index.getValue())
                        }
                    },
                    complete: () => {
                        expect(emittedItems).toEqual(['a', 'b', 'c'])
                        expect(emittedIndices).toEqual([0, 1, 2])
                        expect(ast.total.getValue()).toBe(3)
                        expect(ast.done.getValue()).toBe(true)
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
                        expect(ast.total.getValue()).toBe(0)
                        expect(ast.done.getValue()).toBe(true)
                        resolve()
                    },
                })
            })
        })

        it('处理单元素数组', async () => {
            const ast = createMockAst({
                items: ['only-one'],
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.current.getValue()).toBe('only-one')
                        expect(ast.total.getValue()).toBe(1)
                        expect(ast.done.getValue()).toBe(true)
                        resolve()
                    },
                })
            })
        })

        it('过滤 null/undefined 值', async () => {
            const ast = createMockAst({
                items: [1, null, 2, undefined, 3],
            })

            const emittedItems: any[] = []
            let lastValue: any

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    next: () => {
                        const current = ast.current.getValue()
                        if (current !== undefined && current !== lastValue) {
                            lastValue = current
                            emittedItems.push(current)
                        }
                    },
                    complete: () => {
                        expect(emittedItems).toEqual([1, 2, 3])
                        expect(ast.total.getValue()).toBe(3)
                        resolve()
                    },
                })
            })
        })

        it('展平嵌套数组', async () => {
            const ast = createMockAst({
                items: [[1, 2], [3, 4]],
            })

            const emittedItems: any[] = []
            let lastValue: any

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    next: () => {
                        const current = ast.current.getValue()
                        if (current !== undefined && current !== lastValue) {
                            lastValue = current
                            emittedItems.push(current)
                        }
                    },
                    complete: () => {
                        expect(emittedItems).toEqual([1, 2, 3, 4])
                        resolve()
                    },
                })
            })
        })
    })

    describe('批量处理', () => {
        it('batchSize=2 时返回批次数组', async () => {
            const ast = createMockAst({
                items: [1, 2, 3, 4, 5],
                batchSize: 2,
            })

            const batches: any[] = []
            let lastBatch: any

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    next: () => {
                        const current = ast.current.getValue()
                        if (current !== undefined && JSON.stringify(current) !== JSON.stringify(lastBatch)) {
                            lastBatch = current
                            batches.push(current)
                        }
                    },
                    complete: () => {
                        expect(batches).toEqual([[1, 2], [3, 4], [5]])
                        resolve()
                    },
                })
            })
        })

        it('batchSize 大于数组长度时返回整个数组', async () => {
            const ast = createMockAst({
                items: [1, 2, 3],
                batchSize: 10,
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.current.getValue()).toEqual([1, 2, 3])
                        resolve()
                    },
                })
            })
        })

        it('batchSize=0 或负数时使用默认值 1', async () => {
            const ast = createMockAst({
                items: [1, 2, 3],
                batchSize: 0,
            })

            const emittedItems: any[] = []
            let lastValue: any

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    next: () => {
                        const current = ast.current.getValue()
                        if (current !== undefined && current !== lastValue) {
                            lastValue = current
                            emittedItems.push(current)
                        }
                    },
                    complete: () => {
                        expect(emittedItems).toEqual([1, 2, 3])
                        resolve()
                    },
                })
            })
        })
    })

    describe('延迟处理', () => {
        beforeEach(() => {
            vi.useFakeTimers()
        })

        afterEach(() => {
            vi.useRealTimers()
        })

        it('delay > 0 时使用 setTimeout', async () => {
            const ast = createMockAst({
                items: [1, 2, 3],
                delay: 100,
            })

            const emittedItems: any[] = []
            let lastValue: any

            const promise = new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    next: () => {
                        const current = ast.current.getValue()
                        if (current !== undefined && current !== lastValue) {
                            lastValue = current
                            emittedItems.push(current)
                        }
                    },
                    complete: () => {
                        expect(emittedItems).toEqual([1, 2, 3])
                        resolve()
                    },
                })
            })

            // 第一个立即发射
            expect(emittedItems).toContain(1)

            // 推进时间
            await vi.advanceTimersByTimeAsync(100)
            await vi.advanceTimersByTimeAsync(100)

            await promise
        })

        it('delay=0 时同步执行', async () => {
            vi.useRealTimers() // 这个测试不需要 fake timers
            const ast = createMockAst({
                items: [1, 2, 3],
                delay: 0,
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.done.getValue()).toBe(true)
                        resolve()
                    },
                })
            })
        })
    })

    describe('索引跟踪', () => {
        it('正确跟踪当前索引', async () => {
            const ast = createMockAst({
                items: ['a', 'b', 'c', 'd'],
            })

            const indices: number[] = []
            let lastIndex = -1

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    next: () => {
                        const idx = ast.index.getValue()
                        if (ast.current.getValue() !== undefined && idx !== lastIndex) {
                            lastIndex = idx
                            indices.push(idx)
                        }
                    },
                    complete: () => {
                        expect(indices).toEqual([0, 1, 2, 3])
                        resolve()
                    },
                })
            })
        })

        it('批量模式下索引按批次跳跃', async () => {
            const ast = createMockAst({
                items: [1, 2, 3, 4, 5, 6],
                batchSize: 2,
            })

            const indices: number[] = []
            let lastIndex = -1

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    next: () => {
                        const idx = ast.index.getValue()
                        const current = ast.current.getValue()
                        if (current !== undefined && idx !== lastIndex) {
                            lastIndex = idx
                            indices.push(idx)
                        }
                    },
                    complete: () => {
                        expect(indices).toEqual([0, 2, 4])
                        resolve()
                    },
                })
            })
        })
    })

    describe('对象数组处理', () => {
        it('正确处理对象数组', async () => {
            const ast = createMockAst({
                items: [{ id: 1 }, { id: 2 }, { id: 3 }],
            })

            const emittedItems: any[] = []
            let lastId: any

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    next: () => {
                        const current = ast.current.getValue()
                        if (current !== undefined && current?.id !== lastId) {
                            lastId = current.id
                            emittedItems.push(current)
                        }
                    },
                    complete: () => {
                        expect(emittedItems).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
                        resolve()
                    },
                })
            })
        })
    })

    describe('边界情况', () => {
        it('处理 undefined items', async () => {
            const ast = createMockAst({
                items: undefined as any,
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.total.getValue()).toBe(0)
                        expect(ast.done.getValue()).toBe(true)
                        resolve()
                    },
                })
            })
        })

        it('处理非数组 items', async () => {
            const ast = createMockAst({
                items: 'single-value' as any,
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.current.getValue()).toBe('single-value')
                        expect(ast.total.getValue()).toBe(1)
                        resolve()
                    },
                })
            })
        })
    })

    describe('状态流转', () => {
        it('正确的状态变化', async () => {
            const ast = createMockAst({ items: [1, 2] })
            const states: string[] = []

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    next: (node: any) => {
                        if (!states.includes(node.state)) {
                            states.push(node.state)
                        }
                    },
                    complete: () => {
                        expect(states).toContain('running')
                        expect(states).toContain('success')
                        resolve()
                    },
                })
            })
        })
    })
})
