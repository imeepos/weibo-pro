/**
 * SmartAstV1 提示词构建工具。
 * 负责将输入/输出上下文渲染为系统提示与用户提示。
 */
import { SmartAstV1 } from '@sker/workflow-ast'

export interface MessageContent {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
}

export interface InputContext {
  property: string
  title: string
  description: string
  content: unknown
}

export interface OutputContext {
  property: string
  title: string
  description: string
  type?: string
  defaultValue?: unknown
}

export function buildSystemPrompt(
  ast: SmartAstV1,
  inputContexts: InputContext[],
  outputContexts: OutputContext[]
): string {
  const inputList = inputContexts.map(i =>
    `- ${i.property}:\n  标题: ${i.title}\n  描述: ${i.description || '(无)'}`
  ).join('\n')

  const outputList = outputContexts.map(o =>
    `- ${o.property}:\n  标题: ${o.title}\n  描述: ${o.description || '(无)'}\n  类型: ${o.type || 'any'}`
  ).join('\n')

  const systemTime = new Date().toISOString()
  let prompt = `你是智能数据分发控制决策中心。根据输入数据的要求，为每个输出端口生成合适的内容。

【当前时间】${systemTime}

【输入端口上下文】
${inputList || '(无)'}

【输出端口上下文】
${outputList || '(无)'}

【可用工具】
dispatch 工具支持两种模式：

1. 批量模式（推荐）：一次发射所有输出端口
   dispatch({ outputs: { 端口1: 数据1, 端口2: 数据2, ... } })

2. 单端口模式：只发射一个端口（适合条件分支场景）
   dispatch({ outputPort: "端口名", data: 数据 })

【工作流程】
1. 分析输入数据
2. 根据输出端口的 title、description、type 生成合适的数据
3. 优先使用批量模式，一次性调用 dispatch 分发所有端口数据

【重要】
- 优先使用批量模式，减少工具调用次数
- 输出数据类型应与输出端口的 type 匹配（string 必须是字符串，number 必须是数字）
- 输出数据内容应符合输出端口的 description
- 空字符串 ""、空对象 {}、null 都是有效值，但要根据类型正确输出
`

  // 如果用户提供了自定义 prompt，追加到系统提示
  if (ast.prompt && ast.prompt.trim()) {
    prompt += `\n【用户自定义指令】\n${ast.prompt.trim()}\n`
  }

  return prompt
}

export function buildUserPrompt(
  inputContexts: InputContext[],
  outputContexts: OutputContext[]
): string {
  const inputList = inputContexts.map(i => {
    const contentPreview = preview(i.content, 300)
    return `- **${i.property}** (${i.title}):\n  描述: ${i.description || '(无描述)'}\n  值: ${contentPreview}`
  }).join('\n\n')

  const outputHints = outputContexts.map(o => {
    const typeHint = o.type ? ` [类型: ${o.type}]` : ''
    return `- **${o.property}** (${o.title}): ${o.description || '(无描述)'}${typeHint}`
  }).join('\n')

  return `
【当前输入数据】
${inputList || '(无)'}

【需要生成的输出】
${outputHints || '(无)'}

请分析输入数据，为每个输出端口生成符合要求的数据值，然后使用批量模式一次性调用 dispatch({ outputs: { ... } }) 分发所有端口数据`
}

export function preview(value: unknown, maxLength: number = 200): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'string') {
    return value.length <= maxLength ? value : value.slice(0, maxLength) + '...'
  }
  if (typeof value === 'object') {
    const str = JSON.stringify(value)
    return str.length <= maxLength ? str : str.slice(0, maxLength) + '...'
  }
  return String(value)
}
