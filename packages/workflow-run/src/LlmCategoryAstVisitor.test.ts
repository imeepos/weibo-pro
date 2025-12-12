import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LlmCategoryAstVisitor } from './LlmCategoryAstVisitor'
import { ROUTE_SKIPPED } from '@sker/workflow'
import { BehaviorSubject } from 'rxjs'

// Mock ChatOpenAI
vi.mock('@langchain/openai', () => ({
    ChatOpenAI: vi.fn().mockImplementation(() => ({
        invoke: vi.fn()
    }))
}))

import { ChatOpenAI } from '@langchain/openai'

interface MockLlmCategoryAst {
    context: string[]
    system: string
    temperature: number
    model: string
    output_default: BehaviorSubject<any>
    state?: string
    count: number
    error?: any
    metadata: {
        outputs: Array<{
            property: string
            title?: string
            description?: string
            isRouter?: boolean
        }>
    }
    [key: string]: any
}

const createMockAst = (overrides: Partial<MockLlmCategoryAst> = {}): MockLlmCategoryAst => ({
    context: ['这是一条测试文本'],
    system: '你是一个文本分类专家',
    temperature: 0,
    model: 'test-model',
    output_default: new BehaviorSubject<any>(undefined),
    state: 'pending',
    count: 0,
    metadata: {
        outputs: [
            { property: 'output_default', title: 'Default', isRouter: true }
        ]
    },
    ...overrides,
})

describe('LlmCategoryAstVisitor', () => {
    let visitor: LlmCategoryAstVisitor
    let mockInvoke: ReturnType<typeof vi.fn>

    beforeEach(() => {
        visitor = new LlmCategoryAstVisitor()
        mockInvoke = vi.fn()
        vi.mocked(ChatOpenAI).mockImplementation(() => ({
            invoke: mockInvoke
        }) as any)
    })

    describe('无分类输出时', () => {
        it('直接走 default 分支', async () => {
            const ast = createMockAst()

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {} as any).subscribe({
                    complete: () => {
                        expect(ast.output_default.getValue()).toEqual(['这是一条测试文本'])
                        expect(ast.state).toBe('success')
                        expect(mockInvoke).not.toHaveBeenCalled()
                        resolve()
                    },
                })
            })
        })
    })

    describe('有分类输出时', () => {
        it('LLM 匹配到分类时，激活对应分支', async () => {
            const output_positive = new BehaviorSubject<any>(undefined)
            const output_negative = new BehaviorSubject<any>(undefined)

            const ast = createMockAst({
                context: ['这个产品真的很棒！'],
                output_positive,
                output_negative,
                metadata: {
                    outputs: [
                        { property: 'output_default', title: 'Default', isRouter: true },
                        { property: 'output_positive', title: '正面', description: '积极正面的评价', isRouter: true },
                        { property: 'output_negative', title: '负面', description: '消极负面的评价', isRouter: true },
                    ]
                }
            })

            mockInvoke.mockResolvedValue({ content: '正面' })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {} as any).subscribe({
                    complete: () => {
                        expect(output_positive.getValue()).toEqual(['这个产品真的很棒！'])
                        expect(output_negative.getValue()).toBe(ROUTE_SKIPPED)
                        expect(ast.output_default.getValue()).toBe(ROUTE_SKIPPED)
                        expect(ast.state).toBe('success')
                        resolve()
                    },
                })
            })
        })

        it('LLM 选择 Default 分类时，走 default 分支', async () => {
            const output_positive = new BehaviorSubject<any>(undefined)
            const output_negative = new BehaviorSubject<any>(undefined)

            const ast = createMockAst({
                context: ['今天天气不错'],
                output_positive,
                output_negative,
                metadata: {
                    outputs: [
                        { property: 'output_default', title: 'Default', description: '其他类型', isRouter: true },
                        { property: 'output_positive', title: '正面', isRouter: true },
                        { property: 'output_negative', title: '负面', isRouter: true },
                    ]
                }
            })

            // LLM 选择了 Default
            mockInvoke.mockResolvedValue({ content: 'Default' })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {} as any).subscribe({
                    complete: () => {
                        expect(output_positive.getValue()).toBe(ROUTE_SKIPPED)
                        expect(output_negative.getValue()).toBe(ROUTE_SKIPPED)
                        expect(ast.output_default.getValue()).toEqual(['今天天气不错'])
                        resolve()
                    },
                })
            })
        })

        it('LLM 返回无法匹配时，fallback 到 default', async () => {
            const output_positive = new BehaviorSubject<any>(undefined)

            const ast = createMockAst({
                context: ['测试文本'],
                output_positive,
                metadata: {
                    outputs: [
                        { property: 'output_default', title: 'Default', isRouter: true },
                        { property: 'output_positive', title: '正面', isRouter: true },
                    ]
                }
            })

            // LLM 返回了无法匹配的内容
            mockInvoke.mockResolvedValue({ content: '无法确定' })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {} as any).subscribe({
                    complete: () => {
                        expect(output_positive.getValue()).toBe(ROUTE_SKIPPED)
                        expect(ast.output_default.getValue()).toEqual(['测试文本'])
                        resolve()
                    },
                })
            })
        })

        it('多值输入正确传递', async () => {
            const output_spam = new BehaviorSubject<any>(undefined)

            const ast = createMockAst({
                context: ['广告文本1', '广告文本2', '广告文本3'],
                output_spam,
                metadata: {
                    outputs: [
                        { property: 'output_default', title: 'Default', isRouter: true },
                        { property: 'output_spam', title: '垃圾信息', isRouter: true },
                    ]
                }
            })

            mockInvoke.mockResolvedValue({ content: '垃圾信息' })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {} as any).subscribe({
                    complete: () => {
                        expect(output_spam.getValue()).toEqual(['广告文本1', '广告文本2', '广告文本3'])
                        expect(ast.output_default.getValue()).toBe(ROUTE_SKIPPED)
                        resolve()
                    },
                })
            })
        })
    })

    describe('Prompt 构建', () => {
        it('包含所有分类、约束和示例', async () => {
            const output_cat = new BehaviorSubject<any>(undefined)

            const ast = createMockAst({
                output_cat,
                metadata: {
                    outputs: [
                        { property: 'output_default', title: 'Default', description: '其他类型', isRouter: true },
                        { property: 'output_cat', title: '科技新闻', description: '关于科技、互联网的新闻', isRouter: true },
                    ]
                }
            })

            mockInvoke.mockResolvedValue({ content: '科技新闻' })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {} as any).subscribe({
                    complete: () => {
                        const callArgs = mockInvoke.mock.calls[0][0]
                        const systemContent = callArgs[0].content
                        expect(systemContent).toContain('Default')
                        expect(systemContent).toContain('其他类型')
                        expect(systemContent).toContain('科技新闻')
                        expect(systemContent).toContain('关于科技、互联网的新闻')
                        expect(systemContent).toContain('必须选择一个')
                        expect(systemContent).toContain('【重要约束】')
                        expect(systemContent).toContain('你只能输出以下类别名称之一')
                        expect(systemContent).toContain('【示例】')
                        resolve()
                    },
                })
            })
        })
    })

    describe('模糊匹配', () => {
        it('LLM 返回带空格时仍能匹配', async () => {
            const output_image = new BehaviorSubject<any>(undefined)

            const ast = createMockAst({
                context: ['生成一张猫的图片'],
                output_image,
                metadata: {
                    outputs: [
                        { property: 'output_default', title: 'Default', isRouter: true },
                        { property: 'output_image', title: '图片', description: '生成图片', isRouter: true },
                    ]
                }
            })

            mockInvoke.mockResolvedValue({ content: '  图片  ' })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {} as any).subscribe({
                    complete: () => {
                        expect(output_image.getValue()).toEqual(['生成一张猫的图片'])
                        expect(ast.output_default.getValue()).toBe(ROUTE_SKIPPED)
                        resolve()
                    },
                })
            })
        })

        it('LLM 返回包含类别名称时能匹配', async () => {
            const output_video = new BehaviorSubject<any>(undefined)

            const ast = createMockAst({
                context: ['生成一个视频'],
                output_video,
                metadata: {
                    outputs: [
                        { property: 'output_default', title: 'Default', isRouter: true },
                        { property: 'output_video', title: '视频', description: '生成视频', isRouter: true },
                    ]
                }
            })

            mockInvoke.mockResolvedValue({ content: '应该选择视频类别' })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {} as any).subscribe({
                    complete: () => {
                        expect(output_video.getValue()).toEqual(['生成一个视频'])
                        expect(ast.output_default.getValue()).toBe(ROUTE_SKIPPED)
                        resolve()
                    },
                })
            })
        })

        it('忽略大小写匹配', async () => {
            const output_image = new BehaviorSubject<any>(undefined)

            const ast = createMockAst({
                context: ['test'],
                output_image,
                metadata: {
                    outputs: [
                        { property: 'output_default', title: 'Default', isRouter: true },
                        { property: 'output_image', title: 'Image', isRouter: true },
                    ]
                }
            })

            mockInvoke.mockResolvedValue({ content: 'image' })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {} as any).subscribe({
                    complete: () => {
                        expect(output_image.getValue()).toEqual(['test'])
                        resolve()
                    },
                })
            })
        })
    })

    describe('实际场景测试', () => {
        it('demo-02 工作流：小猫照片请求应走图片分支', async () => {
            const image = new BehaviorSubject<any>(undefined)
            const video = new BehaviorSubject<any>(undefined)

            const ast = createMockAst({
                context: ['我想要一张小猫的照片'],
                system: '你是一个文本分类专家。根据用户提供的文本，判断其所属类别。',
                temperature: 0,
                model: 'deepseek-ai/DeepSeek-V3.2-Exp',
                image,
                video,
                metadata: {
                    outputs: [
                        { property: 'output_default', title: 'Default', isRouter: true, isStatic: true },
                        { property: 'image', title: '图片', description: '生成图片', isRouter: true, isStatic: false },
                        { property: 'video', title: '视频', description: '生成视频', isRouter: true, isStatic: false },
                    ]
                }
            })

            mockInvoke.mockResolvedValue({ content: '图片' })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {} as any).subscribe({
                    complete: () => {
                        expect(image.getValue()).toEqual(['我想要一张小猫的照片'])
                        expect(video.getValue()).toBe(ROUTE_SKIPPED)
                        expect(ast.output_default.getValue()).toBe(ROUTE_SKIPPED)
                        expect(ast.state).toBe('success')
                        resolve()
                    },
                })
            })
        })

        it('图片/视频分类场景 - 匹配图片', async () => {
            const output_image = new BehaviorSubject<any>(undefined)
            const output_video = new BehaviorSubject<any>(undefined)

            const ast = createMockAst({
                context: ['帮我生成一张猫咪的图片'],
                output_image,
                output_video,
                metadata: {
                    outputs: [
                        { property: 'output_default', title: 'Default', isRouter: true, isStatic: true },
                        { property: 'output_image', title: '图片', description: '生成图片', isRouter: true, isStatic: false },
                        { property: 'output_video', title: '视频', description: '生成视频', isRouter: true, isStatic: false },
                    ]
                }
            })

            mockInvoke.mockResolvedValue({ content: '图片' })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {} as any).subscribe({
                    complete: () => {
                        expect(output_image.getValue()).toEqual(['帮我生成一张猫咪的图片'])
                        expect(output_video.getValue()).toBe(ROUTE_SKIPPED)
                        expect(ast.output_default.getValue()).toBe(ROUTE_SKIPPED)
                        expect(ast.state).toBe('success')
                        resolve()
                    },
                })
            })
        })

        it('图片/视频分类场景 - 空输入走 default', async () => {
            const output_image = new BehaviorSubject<any>(undefined)
            const output_video = new BehaviorSubject<any>(undefined)

            const ast = createMockAst({
                context: ['\u200B'],  // 零宽空格
                output_image,
                output_video,
                metadata: {
                    outputs: [
                        { property: 'output_default', title: 'Default', isRouter: true },
                        { property: 'output_image', title: '图片', description: '生成图片', isRouter: true },
                        { property: 'output_video', title: '视频', description: '生成视频', isRouter: true },
                    ]
                }
            })

            // LLM 对空输入可能返回无法分类的响应
            mockInvoke.mockResolvedValue({ content: '无法确定分类' })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {} as any).subscribe({
                    complete: () => {
                        expect(output_image.getValue()).toBe(ROUTE_SKIPPED)
                        expect(output_video.getValue()).toBe(ROUTE_SKIPPED)
                        expect(ast.output_default.getValue()).toEqual(['\u200B'])
                        resolve()
                    },
                })
            })
        })
    })

    describe('错误处理', () => {
        it('LLM 调用失败时状态变为 fail', async () => {
            const ast = createMockAst({
                metadata: {
                    outputs: [
                        { property: 'output_default', title: 'Default', isRouter: true },
                        { property: 'output_test', title: '测试', isRouter: true },
                    ]
                }
            })

            mockInvoke.mockRejectedValue(new Error('API 调用失败'))

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {} as any).subscribe({
                    complete: () => {
                        expect(ast.state).toBe('fail')
                        expect(ast.error).toBeDefined()
                        resolve()
                    },
                })
            })
        })
    })

    describe('状态流转', () => {
        it('正确的状态变化: pending -> running -> success', async () => {
            const ast = createMockAst({
                metadata: {
                    outputs: [
                        { property: 'output_default', title: 'Default', isRouter: true },
                        { property: 'output_test', title: '测试', isRouter: true },
                    ]
                }
            })
            const states: string[] = []

            mockInvoke.mockResolvedValue({ content: '测试' })

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {} as any).subscribe({
                    next: (node: any) => {
                        if (node.state && !states.includes(node.state)) {
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

        it('count 递增', async () => {
            const ast = createMockAst()
            const initialCount = ast.count

            await new Promise<void>(resolve => {
                visitor.handler(ast as any, {} as any).subscribe({
                    complete: () => {
                        expect(ast.count).toBe(initialCount + 1)
                        resolve()
                    },
                })
            })
        })
    })
})
