/**
 * @sker/cli - Claude Agent SDK Hello World
 *
 * 这是一个最小的 "Hello World" 示例，展示如何使用 Claude Agent SDK
 * 创建一个简单的编程 Agent。
 */
import { query } from '@anthropic-ai/claude-agent-sdk'

async function main() {
  console.log('🤖 @sker/cli - Claude Agent SDK Hello World\n')

  try {
    // 使用 Agent SDK 进行简单的查询
    const userQuery = '什么是 TypeScript？请简要解释。'
    console.log(`查询: ${userQuery}\n`)

    const agentQuery = query({
      prompt: userQuery,
      options: {
        model: 'sonnet',
        settingSources: ['project', 'user', 'local'],
        systemPrompt: `hello world`,
      }
    })

    let response = ''

    // query 返回一个 AsyncGenerator，需要迭代获取消息
    for await (const message of agentQuery) {
      if (message.type === 'result' && message.subtype === 'success') {
        response = message.result
        break
      } else if (message.type === 'result' && message.subtype?.startsWith('error')) {
        console.error('Agent 错误:', message.errors?.join(', '))
        process.exit(1)
      }
    }

    console.log('Claude 回答:')
    console.log('---')
    console.log(response)
    console.log('---\n')
    console.log('Agent 运行成功!')
  } catch (error) {
    console.error('Agent 运行失败:', error)
    process.exit(1)
  }
}

// 运行主函数
main().catch(console.error)
