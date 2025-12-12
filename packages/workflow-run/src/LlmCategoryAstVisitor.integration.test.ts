import { describe, it, expect, beforeAll } from 'vitest'
import { LlmCategoryAstVisitor } from './LlmCategoryAstVisitor'
import { ROUTE_SKIPPED } from '@sker/workflow'
import { BehaviorSubject } from 'rxjs'

// 环境变量由 vitest.config.ts 加载

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
            isStatic?: boolean
        }>
    }
    [key: string]: any
}

const createAst = (overrides: Partial<MockLlmCategoryAst> = {}): MockLlmCategoryAst => ({
    context: ['测试文本'],
    system: '你是一个文本分类专家。根据用户提供的文本，判断其所属类别。',
    temperature: 0,
    model: 'deepseek-ai/DeepSeek-V3',
    output_default: new BehaviorSubject<any>(undefined),
    state: 'pending',
    count: 0,
    metadata: {
        outputs: [
            { property: 'output_default', title: 'Default', isRouter: true, isStatic: true }
        ]
    },
    ...overrides,
})

describe('LlmCategoryAstVisitor 集成测试', () => {
    let visitor: LlmCategoryAstVisitor

    beforeAll(() => {
        visitor = new LlmCategoryAstVisitor()
    })

    it('demo-02: "我想要一张小猫的照片" 应走图片分支', async () => {
        const image = new BehaviorSubject<any>(undefined)
        const video = new BehaviorSubject<any>(undefined)

        const ast = createAst({
            context: ['我想要一张小猫的照片'],
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

        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('超时')), 30000)

            visitor.handler(ast as any, {} as any).subscribe({
                complete: () => {
                    clearTimeout(timeout)

                    console.log('LLM 分类结果:')
                    console.log('  image:', image.getValue())
                    console.log('  video:', video.getValue())
                    console.log('  default:', ast.output_default.getValue())

                    expect(image.getValue()).toEqual(['我想要一张小猫的照片'])
                    expect(video.getValue()).toBe(ROUTE_SKIPPED)
                    expect(ast.output_default.getValue()).toBe(ROUTE_SKIPPED)
                    expect(ast.state).toBe('success')
                    resolve()
                },
                error: (e) => {
                    clearTimeout(timeout)
                    reject(e)
                }
            })
        })
    }, 30000)

    it('"生成一个宣传视频" 应走视频分支', async () => {
        const image = new BehaviorSubject<any>(undefined)
        const video = new BehaviorSubject<any>(undefined)

        const ast = createAst({
            context: ['生成一个宣传视频'],
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

        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('超时')), 30000)

            visitor.handler(ast as any, {} as any).subscribe({
                complete: () => {
                    clearTimeout(timeout)

                    console.log('LLM 分类结果:')
                    console.log('  image:', image.getValue())
                    console.log('  video:', video.getValue())
                    console.log('  default:', ast.output_default.getValue())

                    expect(video.getValue()).toEqual(['生成一个宣传视频'])
                    expect(image.getValue()).toBe(ROUTE_SKIPPED)
                    expect(ast.output_default.getValue()).toBe(ROUTE_SKIPPED)
                    expect(ast.state).toBe('success')
                    resolve()
                },
                error: (e) => {
                    clearTimeout(timeout)
                    reject(e)
                }
            })
        })
    }, 30000)

    it('"今天天气怎么样" 应走 Default 分支', async () => {
        const image = new BehaviorSubject<any>(undefined)
        const video = new BehaviorSubject<any>(undefined)

        const ast = createAst({
            context: ['今天天气怎么样'],
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

        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('超时')), 30000)

            visitor.handler(ast as any, {} as any).subscribe({
                complete: () => {
                    clearTimeout(timeout)

                    console.log('LLM 分类结果:')
                    console.log('  image:', image.getValue())
                    console.log('  video:', video.getValue())
                    console.log('  default:', ast.output_default.getValue())

                    expect(ast.output_default.getValue()).toEqual(['今天天气怎么样'])
                    expect(image.getValue()).toBe(ROUTE_SKIPPED)
                    expect(video.getValue()).toBe(ROUTE_SKIPPED)
                    expect(ast.state).toBe('success')
                    resolve()
                },
                error: (e) => {
                    clearTimeout(timeout)
                    reject(e)
                }
            })
        })
    }, 30000)
})
