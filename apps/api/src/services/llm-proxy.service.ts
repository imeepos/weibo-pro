import { Injectable } from '@sker/core';
import { useEntityManager, LlmModelProvider, LlmProvider, LlmChatLog } from '@sker/entities';
import { Brackets } from 'typeorm';
import {
  createClaudeToOpenaiStreamConverter,
  createOpenaiToClaudeStreamConverter,
  type ClaudeResponse,
  type OpenAIResponse,
  type ClaudeStreamEvent,
  type OpenAIStreamResponse,
} from '@sker/openai2anthropic';
import {
  ToCodexVisitor,
  ToOpenAiVisitor,
  ToAnthropicVisitor,
  OpenAiRequestAst,
  ClaudeRequestAst,
  CodexRequestAst,
  CodexResponseAst,
  OpenAIResponseAst,
  ClaudeResponseAst,
  OpenAIStreamResponseAst,
  ClaudeStreamEventAst,
  type CodexRequest,
  type CodexResponse,
  Ast
} from '@sker/openai2anthropic';

interface ProviderInfo {
  providerId: string
  baseUrl: string
  apiKey: string
  modelName: string
  standardModelName?: string
  providerProtocol: string
}

interface ProxyResult {
  success: boolean
  response?: Response
  error?: string
}

const TIMEOUT_MS = 1000 * 3 * 60;
const MAX_RETRIES = 3

/**
 * SSE 行解析流：处理跨 chunk 的行缓冲
 */
function createSSELineStream() {
  let buffer = ''
  const decoder = new TextDecoder()

  return new TransformStream<Uint8Array, string>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      lines.forEach(line => controller.enqueue(line))
    },
    flush(controller) {
      if (buffer) controller.enqueue(buffer)
    }
  })
}

/**
 * SSE 数据提取流：data: 前缀处理
 */
function createSSEDataStream() {
  return new TransformStream<string, string>({
    transform(line, controller) {
      if (!line.startsWith('data:')) return
      const data = line.slice(5).trim()
      if (data) controller.enqueue(data)
    }
  })
}

/**
 * JSON 解析流：容错处理
 */
function createJSONParseStream<T = any>() {
  return new TransformStream<string, T>({
    transform(jsonStr, controller) {
      if (jsonStr === '[DONE]') {
        controller.enqueue('[DONE]' as any)
        return
      }

      try {
        controller.enqueue(JSON.parse(jsonStr))
      } catch (err) {
        console.warn(`[SSE] JSON 解析失败: ${jsonStr.slice(0, 100)}...`)
      }
    }
  })
}

@Injectable({ providedIn: 'root' })
export class LlmProxyService {
  private toCodexVisitor = new ToCodexVisitor();
  private toOpenAiVisitor = new ToOpenAiVisitor();
  private toAnthropicVisitor = new ToAnthropicVisitor();

  /**
   * 选择流式转换器
   * @param needsConversion 是否需要转换
   * @param fromProtocol 源协议（Provider 的协议）
   * @param toProtocol 目标协议（客户端期望的协议）
   * @returns 流式转换器函数或 null
   */
  private selectStreamConverter(needsConversion: boolean, fromProtocol: string, toProtocol: string): any {
    if (!needsConversion) {
      return null
    }

    // 直接转换器（OpenAI ↔ Anthropic）
    if (fromProtocol === 'anthropic' && toProtocol === 'openai') {
      console.log('[LlmProxy] 使用流式转换器: Anthropic → OpenAI')
      return createClaudeToOpenaiStreamConverter()
    }

    if (fromProtocol === 'openai' && toProtocol === 'anthropic') {
      console.log('[LlmProxy] 使用流式转换器: OpenAI → Anthropic')
      return createOpenaiToClaudeStreamConverter()
    }

    // Codex 相关的转换尚未实现
    if (fromProtocol === 'codex' || toProtocol === 'codex') {
      console.warn(`[LlmProxy] Codex 流式转换尚未实现: ${fromProtocol} → ${toProtocol}`)
      return null
    }

    console.warn(`[LlmProxy] 不支持的流式转换: ${fromProtocol} → ${toProtocol}`)
    return null
  }

  /**
   * 请求协议转换（使用 Visitor 模式一步完成）
   * @param fromProtocol 源协议
   * @param toProtocol 目标协议
   * @param request 请求体
   * @returns 转换后的请求体
   */
  private convertRequest(fromProtocol: string, toProtocol: string, request: any): any {
    // 协议相同，无需转换
    if (fromProtocol === toProtocol) {
      return request
    }

    // 创建源协议的 AST
    let ast: Ast
    if (fromProtocol === 'openai') {
      const openaiAst = new OpenAiRequestAst()
      openaiAst.request = request
      ast = openaiAst
    } else if (fromProtocol === 'anthropic') {
      const claudeAst = new ClaudeRequestAst()
      claudeAst.request = request
      ast = claudeAst
    } else if (fromProtocol === 'codex') {
      const codexAst = new CodexRequestAst()
      codexAst.request = request
      ast = codexAst
    } else {
      console.error(`[convertRequest] 不支持的源协议: ${fromProtocol}`)
      return null
    }

    // 使用目标协议的 Visitor 一步完成转换
    try {
      if (toProtocol === 'openai') {
        return this.toOpenAiVisitor.visit(ast, {})
      } else if (toProtocol === 'anthropic') {
        return this.toAnthropicVisitor.visit(ast, {})
      } else if (toProtocol === 'codex') {
        return this.toCodexVisitor.visit(ast, {})
      } else {
        console.error(`[convertRequest] 不支持的目标协议: ${toProtocol}`)
        return null
      }
    } catch (error) {
      console.error(`[convertRequest] 转换失败 ${fromProtocol} → ${toProtocol}:`, error)
      return null
    }
  }

  /**
   * 响应协议转换（使用 Visitor 模式一步完成）
   * @param fromProtocol 源协议（Provider 的协议）
   * @param toProtocol 目标协议（客户端期望的协议）
   * @param response 响应体
   * @returns 转换后的响应体
   */
  private convertResponse(fromProtocol: string, toProtocol: string, response: any): any {
    // 协议相同，无需转换
    if (fromProtocol === toProtocol) {
      return response
    }

    // 创建源协议的 AST
    let ast: Ast
    if (fromProtocol === 'openai') {
      const openaiAst = new OpenAIResponseAst()
      openaiAst.response = response as OpenAIResponse
      ast = openaiAst
    } else if (fromProtocol === 'anthropic') {
      const claudeAst = new ClaudeResponseAst()
      claudeAst.response = response as ClaudeResponse
      ast = claudeAst
    } else if (fromProtocol === 'codex') {
      const codexAst = new CodexResponseAst()
      codexAst.response = response as CodexResponse
      ast = codexAst
    } else {
      console.error(`[convertResponse] 不支持的源协议: ${fromProtocol}`)
      return null
    }

    // 使用目标协议的 Visitor 一步完成转换
    try {
      if (toProtocol === 'openai') {
        return this.toOpenAiVisitor.visit(ast, {})
      } else if (toProtocol === 'anthropic') {
        return this.toAnthropicVisitor.visit(ast, {})
      } else if (toProtocol === 'codex') {
        return this.toCodexVisitor.visit(ast, {})
      } else {
        console.error(`[convertResponse] 不支持的目标协议: ${toProtocol}`)
        return null
      }
    } catch (error) {
      console.error(`[convertResponse] 转换失败 ${fromProtocol} → ${toProtocol}:`, error)
      console.error(`[convertResponse] 原始响应:`, JSON.stringify(response).slice(0, 1000))
      // 重新抛出异常，让调用方知道转换失败
      throw error
    }
  }

  /**
   * 负载均衡选择器：在同一 Tier 内按健康分数加权随机选择
   * @param candidates 已排序的候选列表（按 score DESC）
   * @returns 选中的 provider，如果无候选则返回 undefined
   */
  private selectProviderWithLoadBalancing(candidates: any[]): any | undefined {
    if (candidates.length === 0) return undefined
    if (candidates.length === 1) return candidates[0]

    // 加权随机：健康分数越高，被选中概率越大
    // score 必须 > 0，否则跳过（前面的过滤条件已确保 score > 0）
    const totalScore = candidates.reduce((sum, c) => sum + c.provider_score, 0)

    if (totalScore === 0) {
      // 所有分数都是0，随机选择一个
      const randomIndex = Math.floor(Math.random() * candidates.length)
      return candidates[randomIndex]
    }

    // 加权随机选择
    let randomValue = Math.random() * totalScore
    for (const candidate of candidates) {
      randomValue -= candidate.provider_score
      if (randomValue <= 0) {
        const probability = ((candidate.provider_score / totalScore) * 100).toFixed(1)
        console.log(`[findProvider] 负载均衡: 从 ${candidates.length} 个候选中选择 (概率 ${probability}%)`)
        return candidate
      }
    }

    // fallback（理论上不会到这里）
    return candidates[0]
  }

  async findProvider(requestedModel: string, protocol: string, excludeIds: Set<string> = new Set(), requiresThinking: boolean = false): Promise<ProviderInfo | null> {
    if (!requestedModel) return null

    console.log(`[findProvider] 查询参数: model="${requestedModel}", protocol="${protocol}", thinking=${requiresThinking}, 排除=${excludeIds.size}个`)

    return useEntityManager(async m => {
      // 模型名匹配条件：供应商模型名 或 标准模型名
      const modelMatchCondition = new Brackets(qb => {
        qb.where('mp.modelName = :requestedModel', { requestedModel })
          .orWhere('model.name = :requestedModel', { requestedModel })
      })

      // 构建基础查询条件
      const buildBaseConditions = (qb: any) => {
        qb.andWhere('provider.score > 0')
          .andWhere('mp.enabled = true')
        if (requiresThinking) {
          qb.andWhere('mp.supportsThinking = :supportsThinking', { supportsThinking: true })
        }
        if (excludeIds.size > 0) {
          qb.andWhere('provider.id NOT IN (:...excludeIds)', { excludeIds: [...excludeIds] })
        }
      }

      // 1. 获取所有可用梯队
      const tierQuery = m.createQueryBuilder(LlmModelProvider, 'mp')
        .innerJoin('mp.provider', 'provider')
        .leftJoin('mp.model', 'model')
        .select('DISTINCT mp.tierLevel', 'tier')
        .where(modelMatchCondition)
      buildBaseConditions(tierQuery)

      const availableTiers = await tierQuery.orderBy('tier', 'ASC').getRawMany()

      if (availableTiers.length === 0) {
        console.warn(`[findProvider] 未找到任何可用梯队`)
        return null
      }

      console.log(`[findProvider] 可用梯队: ${availableTiers.map(t => `Tier ${t.tier}`).join(', ')}`)

      // 2. 逐层查找最优 provider（优先相同协议，其次跨协议）
      for (const { tier } of availableTiers) {
        const providerQuery = m.createQueryBuilder(LlmModelProvider, 'mp')
          .innerJoin('mp.provider', 'provider')
          .leftJoin('mp.model', 'model')
          .select('provider.id', 'provider_id')
          .addSelect('provider.base_url', 'provider_base_url')
          .addSelect('provider.api_key', 'provider_api_key')
          .addSelect('provider.protocol', 'provider_protocol')
          .addSelect('provider.score', 'provider_score')
          .addSelect('mp.model_name', 'mp_model_name')
          .addSelect('model.name', 'standard_model_name')
          .where(modelMatchCondition)
          .andWhere('mp.tierLevel = :tier', { tier })
        buildBaseConditions(providerQuery)

        // 获取当前层所有可用 providers（按健康分数排序）
        const allCandidates = await providerQuery
          .addSelect(`CASE WHEN provider.protocol = :protocol THEN 0 ELSE 1 END`, 'protocol_priority')
          .setParameter('protocol', protocol)
          .orderBy('provider.score', 'DESC')
          .getRawMany()

        if (allCandidates.length > 0) {
          console.log(`[findProvider] Tier ${tier}: 找到 ${allCandidates.length} 个候选 provider:`)
          allCandidates.forEach((candidate, index) => {
            const protocolMatch = candidate.provider_protocol === protocol ? '✓协议匹配' : '✗需转换'
            const scoreInfo = `score=${candidate.provider_score}`
            const modelInfo = candidate.standard_model_name
              ? `${candidate.standard_model_name} -> ${candidate.mp_model_name}`
              : candidate.mp_model_name
            console.log(`  ${index + 1}. [${protocolMatch}] [${scoreInfo}] ${modelInfo} (${candidate.provider_base_url})`)
          })
        }

        // 负载均衡：在最优协议组中按健康分数加权随机选择
        const result = this.selectProviderWithLoadBalancing(allCandidates)

        if (result?.provider_id) {
          const modelName = result.mp_model_name
          if (!modelName) {
            console.warn(`[findProvider] provider ${result.provider_id} 的 modelName 为空，跳过`)
            continue
          }

          // 诊断：检测是否缺少标准模型名配置
          if (!result.standard_model_name) {
            console.warn(`[findProvider] 警告: modelProvider ${result.provider_id} 未关联标准模型，请检查数据配置`)
          }

          // 打印选择原因
          const protocolReason = result.provider_protocol === protocol
            ? '协议匹配'
            : `协议转换 (${result.provider_protocol} -> ${protocol})`
          const scoreReason = `健康分数 ${result.provider_score}`
          const tierReason = `第${tier}梯队`
          const balanceInfo = allCandidates.length > 1 ? ` | 负载均衡(${allCandidates.length}选1)` : ''

          console.log(`[findProvider] ✓ 选择: ${result.provider_base_url}`)
          console.log(`[findProvider]   理由: ${tierReason} | ${protocolReason} | ${scoreReason}${balanceInfo}`)

          return {
            providerId: result.provider_id,
            baseUrl: result.provider_base_url,
            apiKey: result.provider_api_key,
            modelName,
            standardModelName: result.standard_model_name,
            providerProtocol: result.provider_protocol
          }
        }
      }

      return null
    })
  }

  async updateScore(providerId: string, delta: number): Promise<void> {
    await useEntityManager(async m => {
      await m.createQueryBuilder()
        .update(LlmProvider)
        .set({ score: () => `GREATEST(0, score + ${delta})` })
        .where('id = :providerId', { providerId })
        .execute()
    })
  }

  async setScoreToZero(providerId: string): Promise<void> {
    await useEntityManager(async m => {
      await m.createQueryBuilder()
        .update(LlmProvider)
        .set({ score: 0 })
        .where('id = :providerId', { providerId })
        .execute()
    })
  }

  async disableThinkingSupport(providerId: string, modelName: string): Promise<void> {
    await useEntityManager(async m => {
      await m.createQueryBuilder()
        .update(LlmModelProvider)
        .set({ supportsThinking: false })
        .where('providerId = :providerId', { providerId })
        .andWhere('modelName = :modelName', { modelName })
        .execute()
    })
    console.warn(`已自动禁用 thinking 支持: provider=${providerId}, model=${modelName}`)
  }

  private calcPenalty(responseMs: number, contentLength: number): number {
    const len = Math.max(contentLength, 100)
    const raw = Math.ceil(responseMs / len * 0.1)
    return Math.min(10, Math.max(1, raw))
  }

  async proxyRequest(protocol: string, apiPath: string, body: any, headers: Record<string, string>, contentLength: number): Promise<ProxyResult> {
    if (!body || typeof body !== 'object') {
      return { success: false, error: '请求体不能为空' }
    }

    if (!body.model) {
      return { success: false, error: '缺少必需参数: model' }
    }

    const triedProviders = new Set<string>()
    const requestedModel = body.model

    // 检测请求是否需要 thinking 模式
    const requiresThinking = !!(body.extended_thinking || body.thinking || body.enable_thinking)

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const provider = await this.findProvider(requestedModel, protocol, triedProviders, requiresThinking)
      if (!provider) {
        const thinkingHint = requiresThinking ? ' (需要 thinking 模式支持)' : ''
        return { success: false, error: `无可用 provider: ${requestedModel} (${protocol})${thinkingHint}` }
      }
      triedProviders.add(provider.providerId)

      // 确保 model 字段不为空，优先使用 provider.modelName，否则 fallback 到原始请求的 model
      const targetModel = provider.modelName || requestedModel
      if (!targetModel) {
        console.error(`[proxyRequest] model 字段为空，跳过 provider ${provider.providerId}`)
        continue
      }

      // 【请求前转换】从 protocol → provider.providerProtocol
      const needsConversion = protocol !== provider.providerProtocol
      let proxyBody: any = { ...body, model: targetModel }
      let proxyPath = apiPath

      if (needsConversion) {
        console.log(`[LlmProxy] 请求转换: ${protocol} → ${provider.providerProtocol}`)
        proxyBody = this.convertRequest(protocol, provider.providerProtocol, { ...body, model: targetModel })

        // 设置对应的 API 路径
        if (provider.providerProtocol === 'openai') {
          proxyPath = '/chat/completions'
        } else if (provider.providerProtocol === 'anthropic') {
          proxyPath = '/messages'
        } else if (provider.providerProtocol === 'codex') {
          // codex 使用原始路径
        }

        if (!proxyBody) {
          console.error(`[LlmProxy] 请求转换失败: ${protocol} → ${provider.providerProtocol}`)
          continue
        }
      }

      // 修复 tool 消息序列问题：如果最后一条消息是 tool 角色，添加提示消息
      // 某些 API（如 DeepSeek）不接受以 tool 角色结尾的消息序列
      if (proxyBody.messages && Array.isArray(proxyBody.messages)) {
        const lastMessage = proxyBody.messages[proxyBody.messages.length - 1]
        if (lastMessage?.role === 'tool') {
          console.warn(`[LlmProxy] 检测到消息序列以 tool 结尾，添加继续生成提示以兼容 API`)
          proxyBody.messages.push({
            role: 'user',
            content: '请基于上述工具调用结果继续生成回复。'
          })
        }
      }

      // 清理工具参数中的 $schema 字段（OpenAI API 不支持）
      if (proxyBody.tools && Array.isArray(proxyBody.tools) && provider.providerProtocol === 'openai') {
        proxyBody.tools = proxyBody.tools.map((tool: any) => {
          if (tool.function?.parameters) {
            const cleanParameters = (params: any): any => {
              if (typeof params !== 'object' || params === null) return params

              const cleaned = { ...params }
              delete cleaned.$schema

              // 递归清理嵌套对象
              if (cleaned.properties) {
                cleaned.properties = Object.fromEntries(
                  Object.entries(cleaned.properties).map(([key, value]) => [
                    key,
                    cleanParameters(value)
                  ])
                )
              }

              if (cleaned.items) {
                cleaned.items = cleanParameters(cleaned.items)
              }

              return cleaned
            }

            return {
              ...tool,
              function: {
                ...tool.function,
                parameters: cleanParameters(tool.function.parameters)
              }
            }
          }
          return tool
        })
      }

      // 转换 thinking 参数为 Claude API 期望的格式
      if (requiresThinking) {
        // 移除旧格式的参数
        delete proxyBody.extended_thinking
        delete proxyBody.enable_thinking

        // 如果 thinking 不是对象或格式不正确，转换为标准格式
        if (typeof proxyBody.thinking !== 'object' || !proxyBody.thinking?.type) {
          proxyBody.thinking = {
            type: 'enabled',
            budget_tokens: 10000
          }
        }
      }

      console.log(`[${provider.standardModelName || requestedModel}] -> [${provider.modelName}] via ${provider.baseUrl}${requiresThinking ? ' (thinking)' : ''}`)

      const reqHeaders: Record<string, string> = {}
      for (const [key, value] of Object.entries(headers)) {
        const lowerKey = key.toLowerCase()
        if (lowerKey !== 'authorization' && lowerKey !== 'host' && typeof value === 'string') {
          reqHeaders[key] = value
        }
      }
      const startTime = Date.now()

      try {
        const url = `${provider.baseUrl}${proxyPath}`
        const requestHeaders = {
          Authorization: `Bearer ${provider.apiKey}`,
          connection: `keep-alive`,
          'content-type': reqHeaders['content-type'] || 'application/json',
        }
        const requestBody = JSON.stringify(proxyBody)

        const response = await fetch(url, {
          method: 'POST',
          headers: requestHeaders,
          body: requestBody,
          signal: AbortSignal.timeout(TIMEOUT_MS)
        })
        const durationMs = Date.now() - startTime

        // 记录响应状态
        if (!response.ok) {
          console.error(`[LlmProxy] HTTP ${response.status} 错误:`, {
            provider: provider.providerId,
            url,
            method: 'POST',
            headers: {
              Authorization: `Bearer ${provider.apiKey.slice(0, 10)}...`,
              connection: 'keep-alive',
              'content-type': reqHeaders['content-type'] || 'application/json',
            },
            requestBody: requestBody.slice(0, 500),
            statusCode: response.status,
            statusText: response.statusText,
            durationMs
          })
        }

        if (response.status === 403 || response.status === 401) {
          await this.setScoreToZero(provider.providerId)
          console.warn(`${response.status} 权限错误，健康分清零: ${provider.providerId}`)
        } else if (response.status === 404) {
          await this.setScoreToZero(provider.providerId)
          console.warn(`404 配置错误，健康分清零: ${provider.providerId}`)
        } else if (response.status === 429 || response.status === 400) {
          await this.updateScore(provider.providerId, -500)
        } else if (response.status === 500) {
          await this.updateScore(provider.providerId, -1000)
        } else if (response.status >= 500) {
          await this.updateScore(provider.providerId, -800)
        } else if (response.status >= 400) {
          await this.updateScore(provider.providerId, -300)
        } else if (response.ok) {
          const penalty = this.calcPenalty(durationMs, contentLength)
          await this.updateScore(provider.providerId, -penalty)
        }
        if (!response.body) {
          return { success: true, response }
        }

        const isStreaming = body.stream === true
        console.log(`[LlmProxy] isStreaming=${isStreaming}, body.stream=${body.stream}, response.ok=${response.ok}`)
        let usage: { input_tokens?: number; output_tokens?: number } | undefined

        if (!isStreaming) {
          const responseData = await response.json()
          usage = responseData.usage

          // 验证响应格式（仅在成功状态下）
          if (response.ok) {
            // 检查 OpenAI 响应格式
            if (protocol === 'openai' && !responseData.choices && responseData.object !== 'error') {
              console.error(`[LlmProxy] 检测到不完整的 OpenAI 响应:`, {
                provider: provider.baseUrl,
                hasChoices: !!responseData.choices,
                hasObject: !!responseData.object,
                hasModel: !!responseData.model,
                responseKeys: Object.keys(responseData)
              })

              // 如果是 Codex 格式但不完整，返回错误
              if (responseData.object === 'response' && !responseData.output) {
                return {
                  success: false,
                  response: new Response(JSON.stringify({
                    error: {
                      message: 'Provider returned incomplete response (missing output field)',
                      type: 'api_error',
                      code: 'incomplete_response'
                    }
                  }), {
                    status: 502,
                    headers: { 'Content-Type': 'application/json' }
                  })
                }
              }
            }
          }

          // 记录响应体（仅在非成功状态下）
          if (!response.ok) {
            console.error(`[LlmProxy] 响应体:`, {
              statusCode: response.status,
              responseData: JSON.stringify(responseData, null, 2) // 完整输出，便于调试
            })
          }

          // 检测 400 错误中的 thinking 模式不支持错误
          if (response.status === 400) {
            const errorMessage = responseData?.error?.message || JSON.stringify(responseData)
            const isThinkingError =
              errorMessage.includes('thinking') &&
              (errorMessage.includes('Expected `thinking`') ||
                errorMessage.includes('redacted_thinking') ||
                errorMessage.includes('thinking block') ||
                errorMessage.includes('thinking: Field required'))

            if (isThinkingError) {
              await this.disableThinkingSupport(provider.providerId, provider.modelName)
              console.error(`检测到 thinking 模式不支持错误，已自动禁用: ${provider.modelName}`)
            }
          }

          await this.saveLog({
            providerId: provider.providerId,
            modelName: requestedModel,
            request: proxyBody,
            durationMs,
            isSuccess: response.ok,
            statusCode: response.status,
            usage,
            error: response.ok ? undefined : JSON.stringify(responseData)
          })

          // 【响应后转换】从 provider.providerProtocol → protocol
          let finalResponse = responseData
          if (needsConversion && response.ok) {
            try {
              console.log(`[LlmProxy] 响应转换: ${provider.providerProtocol} → ${protocol}`)
              finalResponse = this.convertResponse(provider.providerProtocol, protocol, responseData)

              if (!finalResponse) {
                console.error(`[LlmProxy] 响应转换返回 null: ${provider.providerProtocol} → ${protocol}`)
                console.error(`[LlmProxy] 使用原始响应数据作为降级方案`)
                finalResponse = responseData
              }
            } catch (conversionError) {
              console.error(`[LlmProxy] 响应转换异常:`, conversionError)
              console.error(`[LlmProxy] Provider: ${provider.baseUrl}, 协议: ${provider.providerProtocol} → ${protocol}`)

              // 检查是否是 BigModel 的非标准错误响应
              if ((responseData as any).code && (responseData as any).success === false) {
                console.warn(`[LlmProxy] 检测到 BigModel 非标准错误格式，将其转换为标准错误响应`)
                // 转换为标准的 OpenAI 错误格式
                return {
                  success: false,
                  response: new Response(JSON.stringify({
                    error: {
                      message: (responseData as any).msg || 'Unknown error',
                      type: 'api_error',
                      code: (responseData as any).code
                    }
                  }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                  })
                }
              }

              // 其他转换错误：返回原始数据
              console.error(`[LlmProxy] 使用原始响应数据作为降级方案`)
              finalResponse = responseData
            }
          }

          return {
            success: true,
            response: new Response(JSON.stringify(finalResponse), {
              status: response.status,
              headers: { 'Content-Type': 'application/json' }
            })
          }
        }

        const logId = await this.saveLog({
          providerId: provider.providerId,
          modelName: requestedModel,
          request: proxyBody,
          durationMs,
          isSuccess: response.ok,
          statusCode: response.status
        })

        const encoder = new TextEncoder()
        let thinkingErrorDetected = false

        // 【流式响应转换】选择流式转换器
        const streamConverter = this.selectStreamConverter(needsConversion, provider.providerProtocol, protocol)

        // 流式处理管道：行解析 -> 数据提取 -> JSON 解析 -> 协议转换 -> 监控
        const monitoredBody = response.body
          .pipeThrough(createSSELineStream())
          .pipeThrough(createSSEDataStream())
          .pipeThrough(createJSONParseStream())
          .pipeThrough(new TransformStream({
            transform: (data, controller) => {
              // [DONE] 标记直接透传
              if (data === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                return
              }

              // 检测流式响应中的 thinking 错误
              if (!thinkingErrorDetected && response.status === 400 && requiresThinking && data.error) {
                const errorMessage = data.error.message || JSON.stringify(data.error)
                const isThinkingError =
                  errorMessage.includes('thinking') &&
                  (errorMessage.includes('Expected `thinking`') ||
                    errorMessage.includes('redacted_thinking') ||
                    errorMessage.includes('thinking block') ||
                    errorMessage.includes('thinking: Field required'))

                if (isThinkingError) {
                  thinkingErrorDetected = true
                  this.disableThinkingSupport(provider.providerId, provider.modelName).catch(console.error)
                  console.error(`检测到 thinking 模式不支持错误（流式），已自动禁用: ${provider.modelName}`)
                }
              }

              // 提取 usage 信息
              if (data.usage) {
                if (!usage) usage = {}
                if (data.usage.input_tokens) usage.input_tokens = data.usage.input_tokens
                if (data.usage.output_tokens) usage.output_tokens = data.usage.output_tokens
              }

              // 协议转换
              if (streamConverter) {
                if (protocol === 'openai' && provider.providerProtocol === 'anthropic') {
                  const converted = (streamConverter as ReturnType<typeof createClaudeToOpenaiStreamConverter>)(data as ClaudeStreamEvent)
                  if (converted) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(converted)}\n\n`))
                  }
                } else if (protocol === 'anthropic' && provider.providerProtocol === 'openai') {
                  const events = (streamConverter as ReturnType<typeof createOpenaiToClaudeStreamConverter>)(data as OpenAIStreamResponse)
                  for (const event of events) {
                    controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`))
                  }
                }
              } else {
                // 无需转换，直接输出
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
              }
            },
            flush: async () => {
              if (logId && usage) {
                const totalTokens = (usage.input_tokens || 0) + (usage.output_tokens || 0)
                if (totalTokens > 0) {
                  await this.updateLog(logId, usage)
                }
              }
            }
          }))

        return {
          success: true,
          response: new Response(monitoredBody, {
            status: response.status,
            headers: response.headers
          })
        }
      } catch (error) {
        const durationMs = Date.now() - startTime
        const isTimeout = error instanceof Error && error.name === 'TimeoutError'

        console.error(`[LlmProxy] 请求失败（重试 ${attempt + 1}/${MAX_RETRIES}）:`, {
          provider: provider.providerId,
          url: `${provider.baseUrl}${proxyPath}`,
          method: 'POST',
          headers: {
            Authorization: `Bearer ${provider.apiKey.slice(0, 10)}...`,
            connection: 'keep-alive',
            'content-type': reqHeaders['content-type'] || 'application/json',
          },
          body: JSON.stringify(proxyBody).slice(0, 500),
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          isTimeout
        })

        await this.updateScore(provider.providerId, isTimeout ? -100 : -1000)

        await this.saveLog({
          providerId: provider.providerId,
          modelName: requestedModel,
          request: proxyBody,
          durationMs,
          isSuccess: false,
          statusCode: 0,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    return { success: false, error: '所有 provider 均失败' }
  }

  private async saveLog(params: {
    providerId: string
    modelName: string
    request: any
    durationMs: number
    isSuccess: boolean
    statusCode: number
    usage?: { input_tokens?: number; output_tokens?: number }
    error?: string
  }): Promise<string | undefined> {
    try {
      return await useEntityManager(async m => {
        const log = await m.save(LlmChatLog, {
          providerId: params.providerId,
          modelName: params.modelName,
          request: params.request,
          durationMs: params.durationMs,
          isSuccess: params.isSuccess,
          statusCode: params.statusCode,
          promptTokens: params.usage?.input_tokens,
          completionTokens: params.usage?.output_tokens,
          totalTokens: params.usage ? (params.usage.input_tokens || 0) + (params.usage.output_tokens || 0) : undefined,
          error: params.error
        })
        return log.id
      })
    } catch (err) {
      console.error('日志记录失败:', err)
      return undefined
    }
  }

  private async updateLog(logId: string, usage: { input_tokens?: number; output_tokens?: number }): Promise<void> {
    try {
      await useEntityManager(async m => {
        await m.update(LlmChatLog, logId, {
          promptTokens: usage.input_tokens,
          completionTokens: usage.output_tokens,
          totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0)
        })
      })
    } catch (err) {
      console.error('更新 token 失败:', err)
    }
  }
}
