import { Injectable, logger } from '@sker/core';
import { useEntityManager, LlmModelProvider, LlmProvider, LlmChatLog } from '@sker/entities';
import { Brackets } from 'typeorm';
import {
  type ClaudeResponse,
  type OpenAIResponse,
  type ClaudeStreamEvent,
  type OpenAIStreamResponse,
  type ClaudeRequest,
  type OpenAIRequest,
} from '@sker/llm-protocol';
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
  CodexStreamEventAst,
  type CodexRequest,
  type CodexResponse,
  type CodexResponseEvent,
  Ast
} from '@sker/llm-protocol';

interface ProviderInfo {
  providerId: string
  baseUrl?: string
  apiKey?: string
  modelName: string
  standardModelName?: string
  providerProtocol?: string
}

interface ProxyResult {
  success: boolean
  response?: Response
  error?: string
}

const TIMEOUT_MS = 1000 * 10 * 60; // 10 分钟超时
const MAX_RETRIES = 3
const RATE_LIMIT_COOLDOWN_MS = 60 * 1000 // 429 冷却时间：1 分钟

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
function createJSONParseStream<T = unknown>() {
  return new TransformStream<string, T>({
    transform(jsonStr, controller) {
      if (jsonStr === '[DONE]') {
        controller.enqueue('[DONE]' as T)
        return
      }

      try {
        controller.enqueue(JSON.parse(jsonStr))
      } catch (err) {
        logger.warn(`SSE JSON 解析失败`, { snippet: jsonStr.slice(0, 100) })
      }
    }
  })
}

@Injectable({ providedIn: 'root' })
export class LlmProxyService {
  private toCodexVisitor = new ToCodexVisitor();
  private toOpenAiVisitor = new ToOpenAiVisitor();
  private toAnthropicVisitor = new ToAnthropicVisitor();

  /** 被限流的 provider，value 为解锁时间戳 */
  private rateLimitedProviders = new Map<string, number>();

  private isRateLimited(providerId: string): boolean {
    const unlockTime = this.rateLimitedProviders.get(providerId)
    if (!unlockTime) return false
    if (Date.now() >= unlockTime) {
      this.rateLimitedProviders.delete(providerId)
      logger.info(`Provider ${providerId} 冷却结束，已解锁`)
      return false
    }
    return true
  }

  private setRateLimited(providerId: string): void {
    const unlockTime = Date.now() + RATE_LIMIT_COOLDOWN_MS
    this.rateLimitedProviders.set(providerId, unlockTime)
    logger.warn(`Provider ${providerId} 被限流`, { unlockTime: new Date(unlockTime).toLocaleTimeString() })
  }

  /**
   * 使用 Visitor 转换流式事件
   * @param needsConversion 是否需要转换
   * @param fromProtocol 源协议（Provider 的协议）
   * @param toProtocol 目标协议（客户端期望的协议）
   * @param data 流式事件数据
   * @param ctx 上下文对象（用于维护流式状态）
   * @returns 转换后的事件（可能是单个事件或事件数组）
   */
  private convertStreamEvent(
    needsConversion: boolean,
    fromProtocol: string,
    toProtocol: string,
    data: unknown,
    ctx: Record<string, unknown>
  ): unknown {
    if (!needsConversion) {
      return data
    }

    // 创建源协议的流式 AST
    let ast: Ast
    if (fromProtocol === 'openai') {
      const openaiAst = new OpenAIStreamResponseAst()
      openaiAst.streamEvent = data as OpenAIStreamResponse
      ast = openaiAst
    } else if (fromProtocol === 'anthropic') {
      const claudeAst = new ClaudeStreamEventAst()
      claudeAst.streamEvent = data as ClaudeStreamEvent
      ast = claudeAst
    } else if (fromProtocol === 'codex') {
      const codexAst = new CodexStreamEventAst()
      codexAst.streamEvent = data as CodexResponseEvent
      ast = codexAst
    } else {
      logger.warn(`不支持的源协议`, { protocol: fromProtocol })
      return data
    }

    // 使用目标协议的 Visitor 转换
    try {
      if (toProtocol === 'openai') {
        return this.toOpenAiVisitor.visit(ast, ctx)
      } else if (toProtocol === 'anthropic') {
        return this.toAnthropicVisitor.visit(ast, ctx)
      } else if (toProtocol === 'codex') {
        return this.toCodexVisitor.visit(ast, ctx)
      } else {
        logger.warn(`不支持的目标协议`, { protocol: toProtocol })
        return data
      }
    } catch (error) {
      logger.error(`流式转换失败`, { from: fromProtocol, to: toProtocol, error })
      return data
    }
  }

  /**
   * 将 Codex 流式事件重建为完整响应
   * @param chunks 流式事件数组
   * @returns 完整的 Codex 响应对象
   */
  private buildCodexResponseFromStream(chunks: unknown[]): Record<string, unknown> {
    if (chunks.length === 0) {
      throw new Error('No stream chunks to build response from')
    }

    // 查找包含完整响应的事件（通常是最后一个 response.completed 事件）
    const completedEvent = chunks.find((chunk: unknown) => (chunk as { type?: string }).type === 'response.completed')

    // 收集所有文本内容
    const textChunks: string[] = []
    let responseId = ''
    let tokenUsage: Record<string, unknown> | null = null

    for (const chunk of chunks) {
      const c = chunk as { type?: string; response_id?: string; delta?: string; token_usage?: Record<string, unknown> }
      if (c.type === 'response.created' || c.type === 'response.output_item.added') {
        // 初始化事件，可能包含 response_id
        if (c.response_id) {
          responseId = c.response_id
        }
      } else if (c.type === 'response.output_text.delta') {
        // 文本增量
        if (c.delta) {
          textChunks.push(c.delta)
        }
      } else if (c.type === 'response.completed') {
        // 完成事件，包含 token usage
        if (c.response_id) {
          responseId = c.response_id
        }
        if (c.token_usage) {
          tokenUsage = c.token_usage
        }
      }
    }

    // 构建完整响应
    const fullText = textChunks.join('')

    return {
      id: responseId || `resp_${Date.now()}`,
      object: 'response',
      created_at: Date.now(),
      status: 'completed',
      output: [
        {
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: fullText
            }
          ]
        }
      ],
      usage: tokenUsage || {
        input_tokens: 0,
        cached_input_tokens: 0,
        output_tokens: 0,
        reasoning_output_tokens: 0,
        total_tokens: 0
      }
    }
  }

  /**
   * 请求协议转换（使用 Visitor 模式一步完成）
   * @param fromProtocol 源协议
   * @param toProtocol 目标协议
   * @param request 请求体
   * @returns 转换后的请求体
   */
  private convertRequest(fromProtocol: string, toProtocol: string, request: Record<string, unknown>): Record<string, unknown> | null {
    // 协议相同，无需转换
    if (fromProtocol === toProtocol) {
      return request
    }

    // 创建源协议的 AST
    let ast: Ast
    if (fromProtocol === 'openai') {
      const openaiAst = new OpenAiRequestAst()
      openaiAst.request = request as unknown as OpenAIRequest
      ast = openaiAst
    } else if (fromProtocol === 'anthropic') {
      const claudeAst = new ClaudeRequestAst()
      claudeAst.request = request as unknown as ClaudeRequest
      ast = claudeAst
    } else if (fromProtocol === 'codex') {
      const codexAst = new CodexRequestAst()
      codexAst.request = request as unknown as CodexRequest
      ast = codexAst
    } else {
      logger.error(`不支持的源协议`, { protocol: fromProtocol })
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
        logger.error(`不支持的目标协议`, { protocol: toProtocol })
        return null
      }
    } catch (error) {
      logger.error(`转换失败`, { from: fromProtocol, to: toProtocol, error })
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
  private convertResponse(fromProtocol: string, toProtocol: string, response: Record<string, unknown>): Record<string, unknown> | null {
    // 协议相同，无需转换
    if (fromProtocol === toProtocol) {
      return response
    }

    // 创建源协议的 AST
    let ast: Ast
    if (fromProtocol === 'openai') {
      const openaiAst = new OpenAIResponseAst()
      openaiAst.response = response as unknown as OpenAIResponse
      ast = openaiAst
    } else if (fromProtocol === 'anthropic') {
      const claudeAst = new ClaudeResponseAst()
      claudeAst.response = response as unknown as ClaudeResponse
      ast = claudeAst
    } else if (fromProtocol === 'codex') {
      const codexAst = new CodexResponseAst()
      codexAst.response = response as unknown as CodexResponse
      ast = codexAst
    } else {
      logger.error(`不支持的源协议`, { protocol: fromProtocol })
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
        logger.error(`不支持的目标协议`, { protocol: toProtocol })
        return null
      }
    } catch (error) {
      logger.error(`转换失败`, { from: fromProtocol, to: toProtocol, error, response: JSON.stringify(response).slice(0, 1000) })
      // 重新抛出异常，让调用方知道转换失败
      throw error
    }
  }

  /**
   * 负载均衡选择器：在同一 Tier 内按健康分数加权随机选择
   * @param candidates 已排序的候选列表（按 score DESC）
   * @returns 选中的 provider，如果无候选则返回 undefined
   */
  private selectProviderWithLoadBalancing(candidates: {
    provider_score: number;
    provider_id: string;
    mp_model_name?: string;
    standard_model_name?: string;
    provider_base_url?: string;
    provider_api_key?: string;
    provider_protocol?: string;
  }[]): {
    provider_score: number;
    provider_id: string;
    mp_model_name?: string;
    standard_model_name?: string;
    provider_base_url?: string;
    provider_api_key?: string;
    provider_protocol?: string;
  } | undefined {
    if (candidates.length === 0) return undefined
    if (candidates.length === 1) return candidates[0]

    const totalScore = candidates.reduce((sum, c) => sum + c.provider_score, 0)

    if (totalScore === 0) {
      const randomIndex = Math.floor(Math.random() * candidates.length)
      return candidates[randomIndex]
    }

    let randomValue = Math.random() * totalScore
    for (const candidate of candidates) {
      randomValue -= candidate.provider_score
      if (randomValue <= 0) {
        return candidate
      }
    }

    return candidates[0]
  }

  async findProvider(requestedModel: string, protocol: string, excludeIds: Set<string> = new Set(), requiresThinking: boolean = false): Promise<ProviderInfo | null> {
    if (!requestedModel) return null

    return useEntityManager(async m => {
      // 通过 llm_models.name 匹配请求的模型，mp.modelName 是调用 provider 时使用的模型名
      const modelMatchCondition = 'model.name = :requestedModel'

      // 收集被限流的 provider ID
      const rateLimitedIds = [...this.rateLimitedProviders.keys()].filter(id => this.isRateLimited(id))

      const buildBaseConditions = (qb: { andWhere: (condition: string, params?: Record<string, unknown>) => { andWhere: (condition: string, params?: Record<string, unknown>) => any; orderBy: (column: string, direction: string) => any; getRawMany: () => Promise<{ tier: number }[]> } }) => {
        qb.andWhere('provider.score > 0')
          .andWhere('mp.enabled = true')
        if (requiresThinking) {
          qb.andWhere('mp.supportsThinking = :supportsThinking', { supportsThinking: true })
        }
        const allExcludeIds = [...excludeIds, ...rateLimitedIds]
        if (allExcludeIds.length > 0) {
          qb.andWhere('provider.id NOT IN (:...excludeIds)', { excludeIds: allExcludeIds })
        }
      }

      const tierQuery = m.createQueryBuilder(LlmModelProvider, 'mp')
        .innerJoin('mp.provider', 'provider')
        .innerJoin('mp.model', 'model')
        .select('DISTINCT mp.tierLevel', 'tier')
        .where(modelMatchCondition, { requestedModel })
      buildBaseConditions(tierQuery)

      const availableTiers = await tierQuery.orderBy('tier', 'ASC').getRawMany()

      if (availableTiers.length === 0) {
        logger.warn(`未找到可用 provider`, { model: requestedModel, protocol })
        return null
      }

      for (const { tier } of availableTiers) {
        const providerQuery = m.createQueryBuilder(LlmModelProvider, 'mp')
          .innerJoin('mp.provider', 'provider')
          .innerJoin('mp.model', 'model')
          .select('provider.id', 'provider_id')
          .addSelect('provider.base_url', 'provider_base_url')
          .addSelect('provider.api_key', 'provider_api_key')
          .addSelect('provider.protocol', 'provider_protocol')
          .addSelect('provider.score', 'provider_score')
          .addSelect('mp.model_name', 'mp_model_name')
          .addSelect('model.name', 'standard_model_name')
          .where(modelMatchCondition, { requestedModel })
          .andWhere('mp.tierLevel = :tier', { tier })
        buildBaseConditions(providerQuery)

        const allCandidates = await providerQuery
          .addSelect(`CASE WHEN provider.protocol = :protocol THEN 0 ELSE 1 END`, 'protocol_priority')
          .setParameter('protocol', protocol)
          .orderBy('provider.score', 'DESC')
          .getRawMany()

        const result = this.selectProviderWithLoadBalancing(allCandidates)

        if (result?.provider_id) {
          const modelName = result.mp_model_name
          if (!modelName) {
            logger.warn(`provider 的 modelName 为空，跳过`, { providerId: result.provider_id })
            continue
          }

          if (!result.standard_model_name) {
            logger.warn(`modelProvider 未关联标准模型`, { providerId: result.provider_id })
          }

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
    logger.warn(`已自动禁用 thinking 支持`, { providerId, modelName })
  }

  private calcPenalty(responseMs: number, contentLength: number): number {
    const len = Math.max(contentLength, 100)
    const raw = Math.ceil(responseMs / len * 0.1)
    return Math.min(10, Math.max(1, raw))
  }

  async proxyRequest(protocol: string, apiPath: string, body: Record<string, unknown> & { model?: string }, headers: Record<string, string>, contentLength: number): Promise<ProxyResult> {
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
        logger.error(`model 字段为空，跳过 provider`, { providerId: provider.providerId })
        continue
      }

      // 【请求前转换】从 protocol → provider.providerProtocol
      const needsConversion = protocol !== provider.providerProtocol
      let proxyBody: Record<string, unknown> = { ...body, model: targetModel }
      let proxyPath = apiPath

      if (needsConversion) {
        const convertedBody = this.convertRequest(protocol, provider.providerProtocol || 'openai', { ...body, model: targetModel })

        if (provider.providerProtocol === 'openai') {
          proxyPath = '/chat/completions'
        } else if (provider.providerProtocol === 'anthropic') {
          proxyPath = '/v1/messages'  // BigModel 等 Anthropic 兼容接口使用 /v1/messages
        } else if (provider.providerProtocol === 'codex') {
          proxyPath = '/responses'
        }

        if (!convertedBody) {
          logger.error(`请求转换失败`, { from: protocol, to: provider.providerProtocol })
          continue
        }
        proxyBody = convertedBody
      }

      // 修复 tool 消息序列问题：如果最后一条消息是 tool 角色，添加提示消息
      // 某些 API（如 DeepSeek）不接受以 tool 角色结尾的消息序列
      if (proxyBody.messages && Array.isArray(proxyBody.messages)) {
        const lastMessage = proxyBody.messages[proxyBody.messages.length - 1]
        if (lastMessage?.role === 'tool') {
          proxyBody.messages.push({
            role: 'user',
            content: '请基于上述工具调用结果继续生成回复。'
          })
        }
      }

      // 清理工具参数中的 $schema 字段（仅 OpenAI 协议需要）
      // Codex 和 Anthropic 协议不受影响
      if (proxyBody.tools && Array.isArray(proxyBody.tools) && provider.providerProtocol === 'openai') {
        proxyBody.tools = proxyBody.tools.map((tool: { function?: { parameters?: Record<string, unknown> } }) => {
          if (tool.function?.parameters) {
            const cleanParameters = (params: Record<string, unknown>): Record<string, unknown> => {
              if (typeof params !== 'object' || params === null) return params

              const cleaned: Record<string, unknown> = { ...params }
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
                cleaned.items = cleanParameters(cleaned.items as Record<string, unknown>)
              }

              return cleaned
            }

            return {
              ...tool,
              function: {
                ...tool.function,
                parameters: cleanParameters(tool.function.parameters as Record<string, unknown>) as Record<string, unknown>
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
        if (typeof proxyBody.thinking !== 'object' || proxyBody.thinking === null || !(proxyBody.thinking as Record<string, unknown>).type) {
          proxyBody.thinking = {
            type: 'enabled',
            budget_tokens: 10000
          }
        }
      }

      // Codex 协议特殊处理：非流式模式不稳定，需要强制改为流式
      let originalStreamMode = proxyBody.stream
      let forceStreamForCodex = false
      if (provider.providerProtocol === 'codex' && proxyBody.stream === false) {
        proxyBody.stream = true
        forceStreamForCodex = true
      }

      const reqHeaders: Record<string, string> = {}
      for (const [key, value] of Object.entries(headers)) {
        const lowerKey = key.toLowerCase()
        if (lowerKey !== 'authorization' && lowerKey !== 'host' && typeof value === 'string') {
          reqHeaders[key] = value
        }
      }
      const startTime = Date.now()

      try {
        let baseUrl = (provider.baseUrl || '').trim().replace(/\/+$/, '')
        let path = proxyPath.startsWith('/') ? proxyPath : `/${proxyPath}`

        // 检查 baseUrl 是否以 /v1 结尾，避免路径重复
        if (baseUrl.endsWith('/v1') && path.startsWith('/v1/')) {
          path = path.slice(3) // 去掉 /v1 前缀
        } else if (baseUrl === '/v1' && path.startsWith('/v1/')) {
          path = path.slice(3)
        }

        const url = `${baseUrl}${path}`
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

        if (response.status === 403 || response.status === 401) {
          await this.setScoreToZero(provider.providerId)
          logger.warn(`权限错误，健康分清零`, { status: response.status, providerId: provider.providerId })
        } else if (response.status === 404) {
          await this.setScoreToZero(provider.providerId)
          logger.warn(`404 配置错误，健康分清零`, { providerId: provider.providerId })
        } else if (response.status === 429) {
          this.setRateLimited(provider.providerId)
          // 打印 429 错误的详细信息
          const url = `${baseUrl}${path}`
          const bodyStr = JSON.stringify(proxyBody)
          const bodyPreview = bodyStr.length > 100
            ? `${bodyStr.slice(0, 50)}...${bodyStr.slice(-50)}`
            : bodyStr
          logger.error(`429 限流错误`, { url, auth: provider.apiKey ? `Bearer ${provider.apiKey.slice(0, 20)}...` : 'N/A', body: bodyPreview })
        } else if (response.status === 400) {
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

        // 使用实际发送的请求体判断是否流式（考虑 Codex 强制流式的情况）
        const isStreaming = proxyBody.stream === true
        let usage: { input_tokens?: number; output_tokens?: number } | undefined

        if (!isStreaming) {
          const responseData = await response.json()
          usage = responseData.usage

          if (response.ok) {
            if (protocol === 'openai' && !responseData.choices && responseData.object !== 'error') {
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
            logger.error(`响应体`, {
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
              logger.error(`检测到 thinking 模式不支持错误，已自动禁用`, { modelName: provider.modelName })
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

          let finalResponse = responseData
          if (needsConversion && response.ok) {
            try {
              finalResponse = this.convertResponse(provider.providerProtocol || 'openai', protocol, responseData)

              if (!finalResponse) {
                logger.error(`响应转换返回 null`, { from: provider.providerProtocol, to: protocol })
                finalResponse = responseData
              }
            } catch (conversionError) {
              logger.error(`响应转换异常`, { error: conversionError, url, model: proxyBody.model, protocol: `${provider.providerProtocol} → ${protocol}` })

              // 检查是否是 BigModel 的非标准错误响应
              if ((responseData as { code?: unknown; success?: boolean }).code && (responseData as { code?: unknown; success?: boolean }).success === false) {
                logger.warn(`检测到非标准错误格式`, { url, model: proxyBody.model })
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

              finalResponse = responseData
            }
          }
          // 提取并打印文本内容
          let textContent = ''
          if (finalResponse.choices?.[0]?.message?.content) {
            // OpenAI 格式
            textContent = finalResponse.choices[0].message.content
          } else if (finalResponse.output?.[0]?.content?.[0]?.text) {
            // Codex 格式
            textContent = finalResponse.output[0].content[0].text
          } else if (finalResponse.content?.[0]?.text) {
            // Claude 格式
            textContent = finalResponse.content[0].text
          }
          const responseBody = JSON.stringify(finalResponse)
          return {
            success: true,
            response: new Response(responseBody, {
              status: 200,
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

        // Codex 强制流式模式：收集完整响应后转为非流式
        if (forceStreamForCodex) {
          // 如果响应失败（HTTP 4xx/5xx），直接收集错误并返回
          if (!response.ok) {
            logger.error('Codex 流式请求返回错误状态', { status: response.status })

            const chunks: unknown[] = []
            const reader = response.body
              .pipeThrough(createSSELineStream())
              .pipeThrough(createSSEDataStream())
              .pipeThrough(createJSONParseStream())
              .getReader()

            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                if (value && value !== '[DONE]') {
                  chunks.push(value)
                }
              }

              // 查找错误事件
              const errorEvent = chunks.find((chunk: unknown) => (chunk as { type?: string; error?: unknown }).type === 'error' || (chunk as { error?: unknown }).error)
              const errorMessage = (errorEvent as { message?: string; error?: { message?: string } })?.message || (errorEvent as { error?: { message?: string } })?.error?.message || 'Unknown error'

              logger.error('Codex 错误', { message: errorMessage })

              // 返回错误响应，让外层重试逻辑处理
              throw new Error(errorMessage)
            } catch (streamError) {
              logger.error('Codex 错误流收集失败', { error: streamError })
              throw streamError
            }
          }

          const chunks: unknown[] = []
          const reader = response.body
            .pipeThrough(createSSELineStream())
            .pipeThrough(createSSEDataStream())
            .pipeThrough(createJSONParseStream())
            .getReader()

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              if (value && value !== '[DONE]') {
                chunks.push(value)
                const v = value as { usage?: { input_tokens?: number; output_tokens?: number } }
                if (v.usage) {
                  if (!usage) usage = {}
                  if (v.usage.input_tokens) usage.input_tokens = v.usage.input_tokens
                  if (v.usage.output_tokens) usage.output_tokens = v.usage.output_tokens
                }
              }
            }

            // 将流式事件重建为完整响应
            const fullResponse = this.buildCodexResponseFromStream(chunks)

            // 如果需要协议转换，则转换
            let finalResponse = fullResponse
            if (needsConversion) {
              const converted = this.convertResponse(provider.providerProtocol || 'openai', protocol, fullResponse)
              if (converted) {
                finalResponse = converted
              }
            }

            // 打印最终响应预览
            const finalResponseStr = JSON.stringify(finalResponse)
            const finalPreview = finalResponseStr.length > 100
              ? `${finalResponseStr.slice(0, 50)}...${finalResponseStr.slice(-50)}`
              : finalResponseStr

            // 提取并打印文本内容
            let textContent = ''
            const resp = finalResponse as Record<string, unknown>
            if (resp.choices && Array.isArray(resp.choices) && resp.choices[0]) {
              const choice0 = resp.choices[0] as { message?: { content?: string } }
              if (choice0.message?.content) {
                textContent = choice0.message.content
              }
            } else if (resp.output && Array.isArray(resp.output) && resp.output[0]) {
              const output0 = resp.output[0] as { content?: Array<{ text?: string }> }
              if (output0.content && output0.content[0]?.text) {
                textContent = output0.content[0].text
              }
            } else if (resp.content && Array.isArray(resp.content) && resp.content[0]) {
              const content0 = resp.content[0] as { text?: string }
              if (content0.text) {
                textContent = content0.text
              }
            }
            if (textContent) {
              const textPreview = textContent.length > 100
                ? `${textContent.slice(0, 100)}...${textContent.slice(-100)}`
                : textContent
              logger.info(`返回文本`, { preview: textPreview })
            }

            await this.saveLog({
              providerId: provider.providerId,
              modelName: requestedModel,
              request: { ...proxyBody, stream: originalStreamMode }, // 记录原始 stream 模式
              durationMs,
              isSuccess: true,
              statusCode: 200,
              usage
            })

            return {
              success: true,
              response: new Response(JSON.stringify(finalResponse), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              })
            }
          } catch (streamError) {
            logger.error('Codex 流式响应收集失败', { error: streamError })
            throw streamError
          }
        }

        // 【流式响应转换】使用 Visitor 转换
        const conversionCtx = {} // 上下文对象，用于维护流式状态

        // 流式处理管道：行解析 -> 数据提取 -> JSON 解析 -> 协议转换 -> 监控
        const monitoredBody = response.body
          .pipeThrough(createSSELineStream())
          .pipeThrough(createSSEDataStream())
          .pipeThrough(createJSONParseStream())
          .pipeThrough(new TransformStream({
            transform: (data: unknown, controller) => {
              // 打印流数据概览（前10 + ... + 后10字符）
              if (data && typeof data === 'object') {
                const dataStr = JSON.stringify(data)
                const preview = dataStr.length > 20
                  ? `${dataStr.slice(0, 50)}...${dataStr.slice(-50)}`
                  : dataStr
              }

              // [DONE] 标记直接透传
              if (data === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                return
              }

              const d = data as Record<string, unknown>

              // 检测流式响应中的 thinking 错误
              if (!thinkingErrorDetected && response.status === 400 && requiresThinking && d.error) {
                const errorObj = d.error as { message?: string } | string
                const errorMessage = typeof errorObj === 'string' ? errorObj : (errorObj.message || JSON.stringify(errorObj))
                const isThinkingError =
                  errorMessage.includes('thinking') &&
                  (errorMessage.includes('Expected `thinking`') ||
                    errorMessage.includes('redacted_thinking') ||
                    errorMessage.includes('thinking block') ||
                    errorMessage.includes('thinking: Field required'))

                if (isThinkingError) {
                  thinkingErrorDetected = true
                  this.disableThinkingSupport(provider.providerId, provider.modelName).catch((err: unknown) => logger.error('禁用 thinking 支持失败', { error: err }))
                  logger.error(`检测到 thinking 模式不支持错误（流式），已自动禁用`, { modelName: provider.modelName })
                }
              }

              // 提取 usage 信息
              if (d.usage) {
                const usageObj = d.usage as { input_tokens?: number; output_tokens?: number }
                if (!usage) usage = {}
                if (usageObj.input_tokens) usage.input_tokens = usageObj.input_tokens
                if (usageObj.output_tokens) usage.output_tokens = usageObj.output_tokens
              }

              // 协议转换（使用 Visitor）
              const converted = this.convertStreamEvent(needsConversion, provider.providerProtocol || 'openai', protocol, data, conversionCtx)

              // 输出转换后的事件
              if (converted !== null && converted !== undefined) {
                if (Array.isArray(converted)) {
                  // anthropic 返回的是事件数组
                  for (const event of converted) {
                    controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`))
                  }
                } else {
                  // openai/codex 返回单个事件
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(converted)}\n\n`))
                }
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

        const url = `${provider.baseUrl}${proxyPath}`
        const bodyStr = JSON.stringify(proxyBody)
        const bodyPreview = bodyStr.length > 100
          ? `${bodyStr.slice(0, 50)}...${bodyStr.slice(-50)}`
          : bodyStr

        logger.error(`请求失败（重试 ${attempt + 1}/${MAX_RETRIES}）`, {
          url,
          auth: provider.apiKey ? `Bearer ${provider.apiKey.slice(0, 20)}...` : 'N/A',
          body: bodyPreview,
          error: error instanceof Error ? error.message : String(error),
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
    request: Record<string, unknown>
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
      logger.error('日志记录失败', { error: err })
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
      logger.error('更新 token 失败', { error: err })
    }
  }
}
