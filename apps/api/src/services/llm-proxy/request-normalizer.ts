/**
 * 请求体标准化：修复 tool 消息序列、清理 $schema、转换 thinking 参数、强制 Codex 流式
 */

/**
 * 修复 tool 消息序列问题：如果最后一条消息是 tool 角色，添加提示消息
 * 某些 API（如 DeepSeek）不接受以 tool 角色结尾的消息序列
 */
export function fixToolMessageSequence(proxyBody: Record<string, unknown>): void {
  if (proxyBody.messages && Array.isArray(proxyBody.messages)) {
    const lastMessage = proxyBody.messages[proxyBody.messages.length - 1]
    if (lastMessage?.role === 'tool') {
      proxyBody.messages.push({
        role: 'user',
        content: '请基于上述工具调用结果继续生成回复。'
      })
    }
  }
}

/**
 * 清理工具参数中的 $schema 字段（仅 OpenAI 协议需要）
 * Codex 和 Anthropic 协议不受影响
 */
export function cleanOpenAiToolSchemas(proxyBody: Record<string, unknown>): void {
  if (!proxyBody.tools || !Array.isArray(proxyBody.tools)) return

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

/**
 * 转换 thinking 参数为 Claude API 期望的格式
 */
export function normalizeThinkingParams(proxyBody: Record<string, unknown>): void {
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

/**
 * Codex 协议特殊处理：非流式模式不稳定，需要强制改为流式
 * @returns 原始 stream 模式与是否强制流式
 */
export function forceStreamForCodexIfNeeded(
  proxyBody: Record<string, unknown>,
  providerProtocol?: string
): { originalStreamMode: unknown; forceStreamForCodex: boolean } {
  const originalStreamMode = proxyBody.stream
  let forceStreamForCodex = false
  if (providerProtocol === 'codex' && proxyBody.stream === false) {
    proxyBody.stream = true
    forceStreamForCodex = true
  }
  return { originalStreamMode, forceStreamForCodex }
}

/**
 * 请求体标准化入口：按固定顺序应用所有请求前修正
 */
export function normalizeProxyRequest(
  proxyBody: Record<string, unknown>,
  requiresThinking: boolean,
  providerProtocol?: string
): { originalStreamMode: unknown; forceStreamForCodex: boolean } {
  fixToolMessageSequence(proxyBody)

  if (providerProtocol === 'openai') {
    cleanOpenAiToolSchemas(proxyBody)
  }

  if (requiresThinking) {
    normalizeThinkingParams(proxyBody)
  }

  return forceStreamForCodexIfNeeded(proxyBody, providerProtocol)
}

/**
 * 构建上游请求头：过滤掉 authorization / host，避免覆盖鉴权信息
 */
export function buildUpstreamHeaders(headers: Record<string, string>): Record<string, string> {
  const reqHeaders: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase()
    if (lowerKey !== 'authorization' && lowerKey !== 'host' && typeof value === 'string') {
      reqHeaders[key] = value
    }
  }
  return reqHeaders
}
