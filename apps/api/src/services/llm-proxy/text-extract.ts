/**
 * 从响应体中提取文本内容，兼容 OpenAI / Codex / Claude 三种格式
 * @param finalResponse 转换后的响应体
 * @returns 提取到的文本内容，未匹配时返回空字符串
 */
export function extractTextContent(finalResponse: Record<string, unknown>): string {
  const choices = finalResponse.choices
  if (Array.isArray(choices) && choices[0]) {
    const choice0 = choices[0] as { message?: { content?: string } }
    if (choice0.message?.content) {
      return choice0.message.content
    }
  }
  const output = finalResponse.output
  if (Array.isArray(output) && output[0]) {
    const output0 = output[0] as { content?: Array<{ text?: string }> }
    if (output0.content && output0.content[0]?.text) {
      return output0.content[0].text
    }
  }
  const content = finalResponse.content
  if (Array.isArray(content) && content[0]) {
    const content0 = content[0] as { text?: string }
    if (content0.text) {
      return content0.text
    }
  }
  return ''
}
