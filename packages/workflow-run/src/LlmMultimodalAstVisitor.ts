import { Injectable } from '@sker/core'
import { Handler, NodeEvent, setAstError } from '@sker/workflow'
import {
    LlmImageToTextAst,
    LlmVideoToTextAst,
    LlmTextToAudioAst,
    LlmTextToVideoAst,
    LlmTextImageToVideoAst,
    LlmTextImage2ToVideoAst,
    LlmTextToImageAst
} from '@sker/workflow-ast'
import { Observable, from } from 'rxjs'
import { concatMap, mergeMap } from 'rxjs/operators'
import { useLlmModel } from './llm-client'
import { ErrorHandlerOperators } from './utils/error-handler.util'

/**
 * 多模态 LLM 节点执行器
 *
 * 职责：
 * - 图生文：将图片转换为文字描述
 * - 视频解析：将视频转换为文字描述
 * - 文生音频：将文字转换为语音
 * - 文生视频：将文字转换为视频
 * - 多图生视频：使用多张图片和文字生成视频
 * - 首尾帧视频：使用首尾帧图片和文字生成视频
 * - 文生图：将文字转换为图片
 *
 * 优雅设计：
 * - 使用统一的多模态 LLM 接口
 * - 支持流式输出和批量处理
 * - 错误重试和降级策略
 *
 * 注意：
 * - 多模态功能依赖具体的 LLM 提供商支持
 * - 不同模型可能有不同的输入输出格式
 * - 需要根据实际 API 调整实现
 */
@Injectable()
export class LlmMultimodalAstVisitor {
    /**
     * 图生文节点
     *
     * 输入：图片 URL 列表
     * 输出：图片描述文字
     */
    @Handler(LlmImageToTextAst)
    visitImageToText(ast: LlmImageToTextAst, input$: Observable<Record<string, unknown>>) {
        return new Observable<NodeEvent>(obs => {
            const abortController = new AbortController()

            ast.state = 'running'
            obs.next({ type: 'node_runing', id: ast.id })

            const subscription = input$.pipe(
                concatMap(async (inputData) => {
                    ast.emitCount += 1

                    if (inputData) {
                        Object.keys(inputData).forEach(key => {
                            ;(ast as unknown as Record<string, unknown>)[key] = inputData[key]
                        })
                    }

                    if (abortController.signal.aborted) {
                        throw new Error('工作流已取消')
                    }

                    // 构建多模态消息
                    const messages: Array<{ role: string; content: Array<{ type: string; text?: string; image_url?: { url: string } }> }> = []

                    // 构建图片内容
                    const imageContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = []

                    if (ast.images && ast.images.length > 0) {
                        ast.images.forEach(imageUrl => {
                            imageContent.push({
                                type: 'image_url',
                                image_url: { url: imageUrl }
                            })
                        })
                    }

                    // 添加文本提示
                    imageContent.push({
                        type: 'text',
                        text: '请详细描述这张图片的内容'
                    })

                    messages.push({
                        role: 'user',
                        content: imageContent
                    })

                    // 调用支持视觉的 LLM（如 GPT-4o, Claude 3.5 Sonnet）
                    const llmModel = useLlmModel({
                        model: 'openai/gpt-4o', // 使用支持视觉的模型
                        temperature: 0.7
                    })

                    const result = await llmModel.invoke(messages)
                    ast.text = typeof result.content === 'string' ? result.content : JSON.stringify(result.content)

                    return [
                        { type: 'node_emit' as const, id: ast.id, data: { emitCount: ast.emitCount } },
                        { type: 'node_emit' as const, id: ast.id, data: { text: ast.text } }
                    ]
                }),
                ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[LlmMultimodalAstVisitor.ImageToText]' }),
                ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[LlmMultimodalAstVisitor.ImageToText]' }),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => obs.next(event),
                error: (error) => {
                    ast.state = 'fail'
                    setAstError(ast, error)
                    obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message })
                },
                complete: () => {
                    ast.state = 'success'
                    obs.next({ type: 'node_success', id: ast.id })
                    obs.complete()
                }
            })

            return () => {
                subscription.unsubscribe()
                abortController.abort()
                obs.complete()
            }
        })
    }

    /**
     * 视频解析节点
     *
     * 输入：视频 URL 列表
     * 输出：视频描述文字
     *
     * 注意：当前大多数 LLM 不直接支持视频输入
     * 实现方案：
     * 1. 提取视频帧
     * 2. 对关键帧进行图生文
     * 3. 综合多帧描述生成最终描述
     */
    @Handler(LlmVideoToTextAst)
    visitVideoToText(ast: LlmVideoToTextAst, input$: Observable<Record<string, unknown>>) {
        return new Observable<NodeEvent>(obs => {
            const abortController = new AbortController()

            ast.state = 'running'
            obs.next({ type: 'node_runing', id: ast.id })

            const subscription = input$.pipe(
                concatMap(async (inputData) => {
                    ast.emitCount += 1

                    if (inputData) {
                        Object.keys(inputData).forEach(key => {
                            ;(ast as unknown as Record<string, unknown>)[key] = inputData[key]
                        })
                    }

                    if (abortController.signal.aborted) {
                        throw new Error('工作流已取消')
                    }

                    // 视频解析需要提取帧，这里使用简化方案
                    // 实际项目中应该使用视频处理库（如 ffmpeg）提取关键帧
                    // 这里直接返回提示信息

                    ast.text = `视频解析功能需要配置视频帧提取服务。接收到 ${ast.videos?.length || 0} 个视频。`

                    return [
                        { type: 'node_emit' as const, id: ast.id, data: { emitCount: ast.emitCount } },
                        { type: 'node_emit' as const, id: ast.id, data: { text: ast.text } }
                    ]
                }),
                ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[LlmMultimodalAstVisitor.VideoToText]' }),
                ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[LlmMultimodalAstVisitor.VideoToText]' }),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => obs.next(event),
                error: (error) => {
                    ast.state = 'fail'
                    setAstError(ast, error)
                    obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message })
                },
                complete: () => {
                    ast.state = 'success'
                    obs.next({ type: 'node_success', id: ast.id })
                    obs.complete()
                }
            })

            return () => {
                subscription.unsubscribe()
                abortController.abort()
                obs.complete()
            }
        })
    }

    /**
     * 文生音频节点
     *
     * 输入：文本
     * 输出：音频 URL
     *
     * 注意：需要 TTS（文本转语音）服务
     */
    @Handler(LlmTextToAudioAst)
    visitTextToAudio(ast: LlmTextToAudioAst, input$: Observable<Record<string, unknown>>) {
        return new Observable<NodeEvent>(obs => {
            const abortController = new AbortController()

            ast.state = 'running'
            obs.next({ type: 'node_runing', id: ast.id })

            const subscription = input$.pipe(
                concatMap(async (inputData) => {
                    ast.emitCount += 1

                    if (inputData) {
                        Object.keys(inputData).forEach(key => {
                            ;(ast as unknown as Record<string, unknown>)[key] = inputData[key]
                        })
                    }

                    if (abortController.signal.aborted) {
                        throw new Error('工作流已取消')
                    }

                    // TTS 服务集成
                    // 这里返回占位符，实际需要调用 TTS API
                    const textToProcess = Array.isArray(ast.text) ? ast.text.join('\n') : String(ast.text || '')
                    ast.audio = `tts://${encodeURIComponent(textToProcess.substring(0, 100))}`

                    return [
                        { type: 'node_emit' as const, id: ast.id, data: { emitCount: ast.emitCount } },
                        { type: 'node_emit' as const, id: ast.id, data: { audio: ast.audio } }
                    ]
                }),
                ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[LlmMultimodalAstVisitor.TextToAudio]' }),
                ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[LlmMultimodalAstVisitor.TextToAudio]' }),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => obs.next(event),
                error: (error) => {
                    ast.state = 'fail'
                    setAstError(ast, error)
                    obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message })
                },
                complete: () => {
                    ast.state = 'success'
                    obs.next({ type: 'node_success', id: ast.id })
                    obs.complete()
                }
            })

            return () => {
                subscription.unsubscribe()
                abortController.abort()
                obs.complete()
            }
        })
    }

    /**
     * 文生视频节点
     *
     * 输入：文本提示
     * 输出：视频 URL
     *
     * 注意：需要视频生成服务（如 Sora, Runway）
     */
    @Handler(LlmTextToVideoAst)
    visitTextToVideo(ast: LlmTextToVideoAst, input$: Observable<Record<string, unknown>>) {
        return new Observable<NodeEvent>(obs => {
            const abortController = new AbortController()

            ast.state = 'running'
            obs.next({ type: 'node_runing', id: ast.id })

            const subscription = input$.pipe(
                concatMap(async (inputData) => {
                    ast.emitCount += 1

                    if (inputData) {
                        Object.keys(inputData).forEach(key => {
                            ;(ast as unknown as Record<string, unknown>)[key] = inputData[key]
                        })
                    }

                    if (abortController.signal.aborted) {
                        throw new Error('工作流已取消')
                    }

                    // 视频生成服务集成
                    // 这里返回占位符，实际需要调用视频生成 API
                    const promptToProcess = Array.isArray(ast.prompt) ? ast.prompt.join('\n') : String(ast.prompt || '')
                    ast.video = `video://${encodeURIComponent(promptToProcess.substring(0, 100))}`

                    return [
                        { type: 'node_emit' as const, id: ast.id, data: { emitCount: ast.emitCount } },
                        { type: 'node_emit' as const, id: ast.id, data: { video: ast.video } }
                    ]
                }),
                ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[LlmMultimodalAstVisitor.TextToVideo]' }),
                ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[LlmMultimodalAstVisitor.TextToVideo]' }),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => obs.next(event),
                error: (error) => {
                    ast.state = 'fail'
                    setAstError(ast, error)
                    obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message })
                },
                complete: () => {
                    ast.state = 'success'
                    obs.next({ type: 'node_success', id: ast.id })
                    obs.complete()
                }
            })

            return () => {
                subscription.unsubscribe()
                abortController.abort()
                obs.complete()
            }
        })
    }

    /**
     * 多图生视频节点
     */
    @Handler(LlmTextImageToVideoAst)
    visitTextImageToVideo(ast: LlmTextImageToVideoAst, input$: Observable<Record<string, unknown>>) {
        return new Observable<NodeEvent>(obs => {
            const abortController = new AbortController()

            ast.state = 'running'
            obs.next({ type: 'node_runing', id: ast.id })

            const subscription = input$.pipe(
                concatMap(async (inputData) => {
                    ast.emitCount += 1

                    if (inputData) {
                        Object.keys(inputData).forEach(key => {
                            ;(ast as unknown as Record<string, unknown>)[key] = inputData[key]
                        })
                    }

                    if (abortController.signal.aborted) {
                        throw new Error('工作流已取消')
                    }

                    ast.video = `video://multi-image-${ast.images?.length || 0}`

                    return [
                        { type: 'node_emit' as const, id: ast.id, data: { emitCount: ast.emitCount } },
                        { type: 'node_emit' as const, id: ast.id, data: { video: ast.video } }
                    ]
                }),
                ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[LlmMultimodalAstVisitor.TextImageToVideo]' }),
                ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[LlmMultimodalAstVisitor.TextImageToVideo]' }),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => obs.next(event),
                error: (error) => {
                    ast.state = 'fail'
                    setAstError(ast, error)
                    obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message })
                },
                complete: () => {
                    ast.state = 'success'
                    obs.next({ type: 'node_success', id: ast.id })
                    obs.complete()
                }
            })

            return () => {
                subscription.unsubscribe()
                abortController.abort()
                obs.complete()
            }
        })
    }

    /**
     * 首尾帧视频节点
     */
    @Handler(LlmTextImage2ToVideoAst)
    visitTextImage2ToVideo(ast: LlmTextImage2ToVideoAst, input$: Observable<Record<string, unknown>>) {
        return new Observable<NodeEvent>(obs => {
            const abortController = new AbortController()

            ast.state = 'running'
            obs.next({ type: 'node_runing', id: ast.id })

            const subscription = input$.pipe(
                concatMap(async (inputData) => {
                    ast.emitCount += 1

                    if (inputData) {
                        Object.keys(inputData).forEach(key => {
                            ;(ast as unknown as Record<string, unknown>)[key] = inputData[key]
                        })
                    }

                    if (abortController.signal.aborted) {
                        throw new Error('工作流已取消')
                    }

                    ast.video = `video://first-last-frame`

                    return [
                        { type: 'node_emit' as const, id: ast.id, data: { emitCount: ast.emitCount } },
                        { type: 'node_emit' as const, id: ast.id, data: { video: ast.video } }
                    ]
                }),
                ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[LlmMultimodalAstVisitor.TextImage2ToVideo]' }),
                ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[LlmMultimodalAstVisitor.TextImage2ToVideo]' }),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => obs.next(event),
                error: (error) => {
                    ast.state = 'fail'
                    setAstError(ast, error)
                    obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message })
                },
                complete: () => {
                    ast.state = 'success'
                    obs.next({ type: 'node_success', id: ast.id })
                    obs.complete()
                }
            })

            return () => {
                subscription.unsubscribe()
                abortController.abort()
                obs.complete()
            }
        })
    }

    /**
     * 文生图节点
     *
     * 输入：文本提示
     * 输出：图片 URL
     *
     * 注意：需要图像生成服务（如 DALL-E, Midjourney, Stable Diffusion）
     */
    @Handler(LlmTextToImageAst)
    visitTextToImage(ast: LlmTextToImageAst, input$: Observable<Record<string, unknown>>) {
        return new Observable<NodeEvent>(obs => {
            const abortController = new AbortController()

            ast.state = 'running'
            obs.next({ type: 'node_runing', id: ast.id })

            const subscription = input$.pipe(
                concatMap(async (inputData) => {
                    ast.emitCount += 1

                    if (inputData) {
                        Object.keys(inputData).forEach(key => {
                            ;(ast as unknown as Record<string, unknown>)[key] = inputData[key]
                        })
                    }

                    if (abortController.signal.aborted) {
                        throw new Error('工作流已取消')
                    }

                    // 图像生成服务集成
                    // 这里返回占位符，实际需要调用图像生成 API（如 DALL-E）
                    const textToProcess = Array.isArray(ast.text) ? ast.text.join(', ') : String(ast.text || '')
                    ast.image = `image://${encodeURIComponent(textToProcess.substring(0, 100))}`

                    return [
                        { type: 'node_emit' as const, id: ast.id, data: { emitCount: ast.emitCount } },
                        { type: 'node_emit' as const, id: ast.id, data: { image: ast.image } }
                    ]
                }),
                ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[LlmMultimodalAstVisitor.TextToImage]' }),
                ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[LlmMultimodalAstVisitor.TextToImage]' }),
                mergeMap((events: NodeEvent[]) => from(events))
            ).subscribe({
                next: (event: NodeEvent) => obs.next(event),
                error: (error) => {
                    ast.state = 'fail'
                    setAstError(ast, error)
                    obs.next({ type: 'node_fail', id: ast.id, error: ast.error?.message })
                },
                complete: () => {
                    ast.state = 'success'
                    obs.next({ type: 'node_success', id: ast.id })
                    obs.complete()
                }
            })

            return () => {
                subscription.unsubscribe()
                abortController.abort()
                obs.complete()
            }
        })
    }
}
