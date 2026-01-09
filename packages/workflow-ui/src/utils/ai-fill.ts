import { ChatController } from '@sker/sdk'
import { root } from '@sker/core'
import { parse } from '@sker/json-harmony'

const PRESET_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'
]

export interface AiFillResult {
  name?: string
  description?: string
  color?: string
  tags?: string[]
}

const SYSTEM_PROMPT = `你是一个工作流命名专家。分析工作流结构，生成简洁的名称、描述、标签和颜色。

规则：
- 名称：简洁有力，10字内，体现核心功能
- 描述：1-2句话说明用途和价值
- 颜色：从预选色中选择，匹配功能特性
- 标签：3-5个关键词，包括领域、技术、用途

必须返回纯 JSON 格式，不要有任何额外文字。`

export async function generateWorkflowSettings(workflowJson: string): Promise<AiFillResult> {
  const prompt = `${SYSTEM_PROMPT}

预选颜色列表：${PRESET_COLORS.join(', ')}

工作流结构：
${workflowJson}

请分析并返回 JSON：
{
  "name": "工作流名称",
  "description": "工作流描述",
  "color": "#hexcolor",
  "tags": ["标签1", "标签2", "标签3"]
}`

  const chatCtrl = root.get(ChatController)
  const response = await chatCtrl.chat({
    messages: [{ role: 'user', content: prompt }]
  })

  const content = typeof response === 'string' ? response : JSON.stringify(response)

  const parseResult = parse<AiFillResult>(content)

  if (typeof parseResult.data !== 'object' || parseResult.data === null) {
    throw new Error('AI 返回的格式无效')
  }

  return parseResult.data
}
