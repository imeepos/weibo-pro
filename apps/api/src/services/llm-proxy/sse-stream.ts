import { logger } from '@sker/core';

/**
 * SSE 行解析流：处理跨 chunk 的行缓冲
 */
export function createSSELineStream() {
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
export function createSSEDataStream() {
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
export function createJSONParseStream<T = unknown>() {
  return new TransformStream<string, T>({
    transform(jsonStr, controller) {
      if (jsonStr === '[DONE]') {
        controller.enqueue('[DONE]' as T)
        return
      }

      try {
        controller.enqueue(JSON.parse(jsonStr))
      } catch (_err) {
        logger.warn(`SSE JSON 解析失败`, { snippet: jsonStr.slice(0, 100) })
      }
    }
  })
}
