import 'reflect-metadata'

// 设置环境变量
process.env.REDIS_URL = 'redis://:Redis2025Complex@43.240.223.138:6379'
process.env.DATABASE_URL = 'postgresql://postgres:Postgres2025Secure@43.240.223.138:5432/vectordb'
process.env.OPENAI_BASE_URL = 'https://api.siliconflow.cn/v1'
process.env.OPENAI_API_KEY = 'sk-smyexxqrjjkstwhrkcijnimvadoaghvomzhtvsdbssarvyjx'

import { WorkflowGraphAst, executeAst } from '@sker/workflow'
import { readFileSync } from 'fs'
import { join } from 'path'

// 导入所有 visitors 以确保它们被注册
import './PostNLPAnalyzerVisitor'
import './EventAstVisitor'
import './WeiboKeywordSearchAstVisitor'
import './WeiboAjaxStatusesShowAstVisitor'
import './PostContextCollectorVisitor'

async function main() {
  // 读取工作流 JSON
  const workflowPath = join(__dirname, '../workflow-default-3-1767353379768.json')
  console.log('读取工作流文件:', workflowPath)

  const workflowData = JSON.parse(readFileSync(workflowPath, 'utf-8'))

  // 构造工作流 AST
  const ast = new WorkflowGraphAst()
  Object.assign(ast, workflowData.workflow)

  console.log('========================================')
  console.log('工作流名称:', ast.name)
  console.log('节点数量:', ast.nodes.length)
  console.log('入口节点:', ast.entryNodeIds)
  console.log('结束节点:', ast.endNodeIds)
  console.log('========================================\n')

  // 打印节点信息
  ast.nodes.forEach((node: any, index: number) => {
    console.log(`节点 ${index + 1}:`, node.type, `(${node.id})`)
    if (node.type === 'PostNLPAnalyzerAst') {
      console.log('  - NLP 节点状态:', node.state)
      console.log('  - failedCount:', node.failedCount)
      console.log('  - emitCount:', node.emitCount)
    }
  })
  console.log('\n========================================')
  console.log('开始执行工作流...')
  console.log('========================================\n')

  // 执行工作流
  const result$ = executeAst(ast, ast as WorkflowGraphAst)

  let nodeEventCount = 0
  let nlpNodeEmitCount = 0

  result$.subscribe({
    next: (event: any) => {
      nodeEventCount++

      // 找到节点信息
      const node = ast.nodes.find((n: any) => n.id === event.id)
      const nodeType = node?.type || 'unknown'

      console.log(`[${nodeEventCount}] 事件: ${event.type} | 节点: ${nodeType}`)

      if (event.type === 'node_emit' && nodeType === 'PostNLPAnalyzerAst') {
        nlpNodeEmitCount++
        console.log(`  ✓ NLP 节点第 ${nlpNodeEmitCount} 次发射`)
      }

      if (event.data) {
        const dataStr = JSON.stringify(event.data)
        console.log(`  数据: ${dataStr.substring(0, 150)}${dataStr.length > 150 ? '...' : ''}`)
      }

      if (event.error) {
        console.log(`  ❌ 错误: ${event.error}`)
      }
    },
    error: (error) => {
      console.error('\n========================================')
      console.error('❌ 工作流执行失败')
      console.error('========================================')
      console.error(error)
      process.exit(1)
    },
    complete: () => {
      console.log('\n========================================')
      console.log('✓ 工作流执行完成')
      console.log('========================================')
      console.log('总事件数:', nodeEventCount)
      console.log('NLP 节点发射次数:', nlpNodeEmitCount)

      // 检查 NLP 节点最终状态
      const nlpNode = ast.nodes.find((n: any) => n.type === 'PostNLPAnalyzerAst')
      if (nlpNode) {
        console.log('\nNLP 节点最终状态:')
        console.log('  - state:', (nlpNode as any).state)
        console.log('  - emitCount:', (nlpNode as any).emitCount)
        console.log('  - failedCount:', (nlpNode as any).failedCount)

        if ((nlpNode as any).failedCount > 0) {
          console.log('\n❌ NLP 节点有失败记录')
          console.log('错误详情:', (nlpNode as any).errors)
        } else {
          console.log('\n✓ NLP 节点运行正常')
        }
      }

      process.exit(0)
    }
  })
}

main().catch((error) => {
  console.error('启动失败:', error)
  process.exit(1)
})
