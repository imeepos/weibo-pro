/**
 * 将 Codex 流式事件重建为完整响应
 * @param chunks 流式事件数组
 * @returns 完整的 Codex 响应对象
 */
export function buildCodexResponseFromStream(chunks: unknown[]): Record<string, unknown> {
  if (chunks.length === 0) {
    throw new Error('No stream chunks to build response from')
  }

  // 查找包含完整响应的事件（通常是最后一个 response.completed 事件）
  const _completedEvent = chunks.find((chunk: unknown) => (chunk as { type?: string }).type === 'response.completed')

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
