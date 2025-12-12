import { describe, it, expect, beforeEach } from 'vitest'
import { MergeAstVisitor } from './MergeAstVisitor'
import { BehaviorSubject } from 'rxjs'

interface MockMergeAst {
    inputs: any[]
    mode: 'append' | 'combine' | 'chooseBranch' | 'wait'
    result: BehaviorSubject<any[]>
    totalCount: BehaviorSubject<number>
    state?: string
}

const createMockAst = (overrides: Partial<MockMergeAst> = {}): MockMergeAst => ({
    inputs: [],
    mode: 'append',
    result: new BehaviorSubject<any[]>([]),
    totalCount: new BehaviorSubject<number>(0),
    ...overrides,
})

describe('MergeAstVisitor', () => {
    let visitor: MergeAstVisitor

    beforeEach(() => {
        visitor = new MergeAstVisitor()
    })

    describe('append 模式', () => {
        it('合并多个数组', async () => {
            const ast = createMockAst({
                inputs: [[1, 2], [3, 4], [5]],
                mode: 'append',
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.result.getValue()).toEqual([1, 2, 3, 4, 5])
                        expect(ast.totalCount.getValue()).toBe(5)
                        resolve()
                    },
                })
            })
        })

        it('处理空数组', async () => {
            const ast = createMockAst({
                inputs: [[], [1, 2], []],
                mode: 'append',
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.result.getValue()).toEqual([1, 2])
                        resolve()
                    },
                })
            })
        })

        it('处理单个元素（非数组）', async () => {
            const ast = createMockAst({
                inputs: [1, 2, 3],
                mode: 'append',
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.result.getValue()).toEqual([1, 2, 3])
                        resolve()
                    },
                })
            })
        })

        it('处理混合输入', async () => {
            const ast = createMockAst({
                inputs: [[1, 2], 3, [4, 5]],
                mode: 'append',
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.result.getValue()).toEqual([1, 2, 3, 4, 5])
                        resolve()
                    },
                })
            })
        })

        it('处理对象数组', async () => {
            const ast = createMockAst({
                inputs: [[{ id: 1 }], [{ id: 2 }]],
                mode: 'append',
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.result.getValue()).toEqual([{ id: 1 }, { id: 2 }])
                        resolve()
                    },
                })
            })
        })
    })

    describe('combine 模式', () => {
        it('按索引配对合并', async () => {
            const ast = createMockAst({
                inputs: [['a1', 'a2'], ['b1', 'b2']],
                mode: 'combine',
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        const result = ast.result.getValue()
                        expect(result).toHaveLength(2)
                        expect(result[0]).toEqual({ 0: 'a1', 1: 'b1' })
                        expect(result[1]).toEqual({ 0: 'a2', 1: 'b2' })
                        resolve()
                    },
                })
            })
        })

        it('处理不等长数组', async () => {
            const ast = createMockAst({
                inputs: [['a1', 'a2', 'a3'], ['b1']],
                mode: 'combine',
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        const result = ast.result.getValue()
                        expect(result).toHaveLength(3)
                        expect(result[0]).toEqual({ 0: 'a1', 1: 'b1' })
                        expect(result[1]).toEqual({ 0: 'a2' })
                        expect(result[2]).toEqual({ 0: 'a3' })
                        resolve()
                    },
                })
            })
        })

        it('处理空输入', async () => {
            const ast = createMockAst({
                inputs: [],
                mode: 'combine',
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.result.getValue()).toEqual([])
                        resolve()
                    },
                })
            })
        })

        it('处理非数组输入', async () => {
            const ast = createMockAst({
                inputs: ['a', 'b'],
                mode: 'combine',
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        const result = ast.result.getValue()
                        expect(result).toHaveLength(1)
                        expect(result[0]).toEqual({ 0: 'a', 1: 'b' })
                        resolve()
                    },
                })
            })
        })
    })

    describe('chooseBranch 模式', () => {
        it('选择第一个非空分支', async () => {
            const ast = createMockAst({
                inputs: [[], [1, 2], [3, 4]],
                mode: 'chooseBranch',
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.result.getValue()).toEqual([1, 2])
                        resolve()
                    },
                })
            })
        })

        it('选择第一个有效数据的分支', async () => {
            const ast = createMockAst({
                inputs: [[null, null], [1, 2]],
                mode: 'chooseBranch',
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.result.getValue()).toEqual([1, 2])
                        resolve()
                    },
                })
            })
        })

        it('所有分支都为空时返回空数组', async () => {
            const ast = createMockAst({
                inputs: [[], []],
                mode: 'chooseBranch',
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.result.getValue()).toEqual([])
                        resolve()
                    },
                })
            })
        })

        it('第一个分支非空时直接选择', async () => {
            const ast = createMockAst({
                inputs: [[1], [2, 3, 4]],
                mode: 'chooseBranch',
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.result.getValue()).toEqual([1])
                        resolve()
                    },
                })
            })
        })
    })

    describe('wait 模式', () => {
        it('等待模式默认使用 append 行为', async () => {
            const ast = createMockAst({
                inputs: [[1, 2], [3, 4]],
                mode: 'wait',
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.result.getValue()).toEqual([1, 2, 3, 4])
                        resolve()
                    },
                })
            })
        })
    })

    describe('边界情况', () => {
        it('处理 undefined inputs', async () => {
            const ast = createMockAst({
                inputs: undefined as any,
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.result.getValue()).toEqual([])
                        resolve()
                    },
                })
            })
        })

        it('处理非数组 inputs', async () => {
            const ast = createMockAst({
                inputs: 'single-value' as any,
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.result.getValue()).toEqual(['single-value'])
                        resolve()
                    },
                })
            })
        })

        it('处理大数据集', async () => {
            const largeArray1 = Array.from({ length: 5000 }, (_, i) => i)
            const largeArray2 = Array.from({ length: 5000 }, (_, i) => i + 5000)
            const ast = createMockAst({
                inputs: [largeArray1, largeArray2],
                mode: 'append',
            })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {}).subscribe({
                    complete: () => {
                        expect(ast.result.getValue()).toHaveLength(10000)
                        expect(ast.totalCount.getValue()).toBe(10000)
                        resolve()
                    },
                })
            })
        })
    })

    describe('状态流转', () => {
        it('正确的状态变化', async () => {
            const ast = createMockAst({ inputs: [[1], [2]] })
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
