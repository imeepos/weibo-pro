import { Injectable } from '@sker/core'
import { Handler, NodeEvent, setAstError } from '@sker/workflow'
import { QualityCheckerAst, type QualityResult, type QualityDimension } from '@sker/workflow-ast'
import { Observable, from } from 'rxjs'
import { concatMap, mergeMap } from 'rxjs/operators'
import { useLlmModel } from './llm-client'
import { ErrorHandlerOperators } from './utils/error-handler.util'

/**
 * 质量检查器节点执行器
 *
 * 职责：
 * - 使用 LLM 评估内容质量（多维度评分）
 * - 输出质量分数和改进建议
 * - 支持与循环节点配合实现质量反馈
 *
 * 优雅设计：
 * - 可配置评估维度和权重
 * - 结构化输出，便于下游节点使用
 * - 支持自定义质量阈值
 */
@Injectable()
export class QualityCheckerAstVisitor {
    @Handler(QualityCheckerAst)
    visit(ast: QualityCheckerAst, input$: Observable<Record<string, unknown>>) {
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

                    // 构建质量检查提示词
                    const dimensionDescriptions = (ast.dimensions || []).map(d => {
                        return `- ${d.name}（权重 ${(d.weight * 100).toFixed(0)}%）：${d.description}`
                    }).join('\n')

                    const systemPrompt = `你是一个专业的内容质量评估专家。你的任务是按照指定维度评估内容质量，给出客观、准确的评分。

评估流程：
1. 仔细阅读待评估内容
2. 按照每个维度独立评分（0-100分）
3. 综合各维度得分，计算加权总分
4. 列出具体问题和改进建议

输出格式（JSON）：
{
  "dimensions": [
    { "name": "维度名", "score": 85, "issues": ["问题1", "问题2"] }
  ],
  "score": 82,
  "issues": ["总体问题1", "总体问题2"],
  "suggestions": ["建议1", "建议2"]
}`

                    const userPrompt = `请评估以下内容的质量：

**评估维度：**
${dimensionDescriptions}

**最低及格分：** ${ast.minScore} 分

**待评估内容：**
\`\`\`
${JSON.stringify(ast.chapter, null, 2)}
\`\`\`

请按照指定的 JSON 格式输出评估结果。`

                    // 调用 LLM
                    const llmModel = useLlmModel({
                        model: ast.model,
                        temperature: ast.temperature
                    })

                    const messages = [
                        { role: 'system', content: systemPrompt },
                        { role: 'human', content: userPrompt }
                    ]

                    const result = await llmModel.invoke(messages)
                    const resultText = typeof result.content === 'string' ? result.content : JSON.stringify(result.content)

                    // 解析 JSON 结果
                    let assessment: any
                    try {
                        // 尝试提取 JSON（可能包含在 markdown 代码块中）
                        const jsonMatch = resultText.match(/```json\s*([\s\S]*?)\s*```/) ||
                                         resultText.match(/```\s*([\s\S]*?)\s*```/) ||
                                         [null, resultText]
                        assessment = JSON.parse(jsonMatch[1])
                    } catch (_error) {
                        // JSON 解析失败，创建默认结果
                        assessment = {
                            dimensions: (ast.dimensions || []).map(d => ({
                                name: d.name,
                                score: 75,
                                issues: ['无法解析评估结果']
                            })),
                            score: 75,
                            issues: ['评估结果解析失败'],
                            suggestions: ['请重试']
                        }
                    }

                    // 构建质量结果
                    const dimensions: QualityDimension[] = (assessment.dimensions || []).map((d: any) => ({
                        name: d.name,
                        score: d.score || 0,
                        weight: (ast.dimensions || []).find((dim: any) => dim.name === d.name)?.weight || 0,
                        issues: d.issues || []
                    }))

                    // 计算加权总分
                    let totalScore = 0
                    let totalWeight = 0
                    dimensions.forEach(dim => {
                        totalScore += dim.score * dim.weight
                        totalWeight += dim.weight
                    })
                    const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0

                    const qualityResult: QualityResult = {
                        score: finalScore,
                        passed: finalScore >= ast.minScore,
                        dimensions,
                        issues: assessment.issues || [],
                        suggestions: assessment.suggestions || [],
                        timestamp: new Date().toISOString(),
                        chapter: ast.chapter
                    }

                    // 更新输出
                    ast.result = qualityResult
                    ast.score = finalScore
                    ast.passed = finalScore >= ast.minScore

                    return [
                        { type: 'node_emit' as const, id: ast.id, data: { emitCount: ast.emitCount } },
                        { type: 'node_emit' as const, id: ast.id, data: { result: ast.result } },
                        { type: 'node_emit' as const, id: ast.id, data: { score: ast.score } },
                        { type: 'node_emit' as const, id: ast.id, data: { passed: ast.passed } }
                    ]
                }),
                ErrorHandlerOperators.createRetryOperator(ast, { logPrefix: '[QualityCheckerAstVisitor]' }),
                ErrorHandlerOperators.createCatchErrorOperator(ast, { logPrefix: '[QualityCheckerAstVisitor]' }),
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
