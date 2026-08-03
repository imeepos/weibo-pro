/**
 * 批量 LLM 调用器（带重试）
 *
 * 从 StreamingLlmInvoker.ts 抽取的 invokeModel / isRetryableError / sleep 逻辑：
 * - invokeModel：批量调用模型，失败时指数退避重试
 * - isRetryableError：判断错误是否可重试
 */
import { ChatModel, LlmResponse, MessageContent, ToolMessage } from './streaming-llm.types';

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

export class LlmRetryInvoker {
  /**
   * 调用模型（批量）- 带重试逻辑
   */
  async invokeModel(
    model: ChatModel,
    messages: Array<MessageContent | LlmResponse | ToolMessage>,
    signal: AbortSignal
  ): Promise<LlmResponse> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (signal.aborted) {
        throw new Error('请求已取消')
      }

      try {
        const response = await (model.invoke as any)(messages, { signal })
        return response as LlmResponse
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        const isRetryable = this.isRetryableError(lastError)

        // 增强 LangChain 错误信息，便于调试
        const messagesStr = JSON.stringify(messages).slice(0, 200)
        console.error(`[StreamingLlmInvoker] invokeModel 失败 (尝试 ${attempt + 1}/${MAX_RETRIES}):`)
        console.error('  消息预览:', messagesStr.length > 200 ? `${messagesStr.slice(0, 100)}...${messagesStr.slice(-100)}` : messagesStr)
        console.error('  错误:', lastError.message)
        if (lastError.cause) {
          console.error('  原因:', lastError.cause)
        }

        if (!isRetryable || attempt === MAX_RETRIES - 1) {
          throw lastError
        }

        // 等待后重试
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt) // 指数退避
        console.log(`[StreamingLlmInvoker] ${delay}ms 后重试...`)
        await this.sleep(delay)
      }
    }

    throw lastError || new Error('invokeModel 失败')
  }

  /**
   * 判断错误是否可重试
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message || ''
    // LangChain 内部错误（如 generations 为空）
    if (message.includes("Cannot read properties of undefined (reading 'message')")) {
      return true
    }
    // 网络错误
    if (message.includes('fetch failed') || message.includes('ECONNRESET') || message.includes('ETIMEDOUT')) {
      return true
    }
    // 服务端错误
    if (message.includes('503') || message.includes('502') || message.includes('500')) {
      return true
    }
    // 速率限制
    if (message.includes('429') || message.includes('rate limit')) {
      return true
    }
    return false
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
