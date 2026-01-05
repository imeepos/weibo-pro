import 'dotenv/config';
import "reflect-metadata";
import "@sker/workflow";
import "@sker/workflow-ast";
import "@sker/workflow-run";
import { WorkflowGraphAst, executeWorkflow, fromJson } from '@sker/workflow'
import { readFileSync } from 'fs'
import { join } from 'path'
import { root } from '@sker/core'
import { entitiesProviders } from '@sker/entities'
import { EdgeModeStrategyProviders } from '@sker/workflow'

async function main() {
  // 初始化 DI 容器
  root.set([...entitiesProviders, ...EdgeModeStrategyProviders]);
  await root.init();

  const filePath = join(__dirname, 'test.json')
  const fileContent = readFileSync(filePath, 'utf-8')
  const workflowData = JSON.parse(fileContent)

  // 重置工作流状态
  workflowData.workflow.state = 'pending'
  workflowData.workflow.nodes.forEach((node: any) => {
    node.state = 'pending'
    node.count = 0
    node.emitCount = 0
  })

  const ast = fromJson(workflowData.workflow) as WorkflowGraphAst

  console.log(`\n=== 开始执行工作流 ===`)
  console.log(`节点数量: ${ast.nodes.length}`)

  // 统计每个节点的执行次数（通过事件收集）
  const nodeStats = new Map<string, {
    type: string;
    inputCount: number;      // 节点被调用的次数（ast.emitCount）
    dataEmitCount: number;   // 真实数据发射次数（排除计数事件）
    totalEmitCount: number;  // 所有 node_emit 事件次数（包括计数事件）
  }>()

  // 初始化统计
  ast.nodes.forEach(node => {
    nodeStats.set(node.id, { type: node.type, inputCount: 0, dataEmitCount: 0, totalEmitCount: 0 })
  })

  const startTime = Date.now()

  // 打印统计信息的函数（无论成功还是失败都要调用）
  const printStats = () => {
    console.log(`\n=== 📊 节点执行统计 ===`)
    nodeStats.forEach((stats, nodeId) => {
      if (stats.totalEmitCount > 0 || stats.inputCount > 0) {
        console.log(`\n[${stats.type}]:`)
        console.log(`  ✅ ast.emitCount (节点运行次数): ${stats.inputCount}`)
        console.log(`  📤 数据发射次数: ${stats.dataEmitCount}`)
        console.log(`  🔢 总发射次数: ${stats.totalEmitCount}`)
      }
    })

    const nlpStats = Array.from(nodeStats.values()).find(s => s.type === 'PostNLPAnalyzerAst')
    if (nlpStats) {
      console.log(`\n🎯 NLP 节点汇总:`)
      console.log(`   ast.emitCount: ${nlpStats.inputCount}`)
      console.log(`   数据发射次数: ${nlpStats.dataEmitCount}`)
      console.log(`   总发射次数: ${nlpStats.totalEmitCount}`)
      console.log(`   失败率: ${nlpStats.inputCount > 0 ? ((nlpStats.inputCount - nlpStats.dataEmitCount) / nlpStats.inputCount * 100).toFixed(1) : 0}%`)
    }
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const subscription = executeWorkflow(ast, {}).subscribe({
        next: (event) => {
          const stats = nodeStats.get(event.id)
          if (!stats) return

          // 统计 node_emit 事件
          if (event.type === 'node_emit') {
            stats.totalEmitCount++

            const eventData = (event as any).data

            // 如果事件数据中只包含 emitCount，说明这是计数事件（不是真实数据）
            const isCountEvent = eventData?.emitCount !== undefined && Object.keys(eventData).length === 1

            if (isCountEvent) {
              // 这是计数事件，更新 inputCount
              stats.inputCount = eventData.emitCount
            } else {
              // 这是真实数据事件
              stats.dataEmitCount++
            }

            // 打印 NLP 节点的执行日志
            if (stats.type === 'PostNLPAnalyzerAst') {
              console.log(`[NLP] 第 ${stats.totalEmitCount} 次 emit 事件 (ast.emitCount: ${stats.inputCount}, ${isCountEvent ? '计数事件' : '数据事件'})`)
            }
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime
          console.error(`\n❌ 工作流执行失败，耗时: ${duration}ms`)
          console.error(`[Error] ${error}`)
          printStats()
          reject(error)
        },
        complete: () => {
          const duration = Date.now() - startTime
          console.log(`\n✅ 工作流执行完成，耗时: ${duration}ms`)
          printStats()
          resolve()
        }
      })

      // 超时处理
      setTimeout(() => {
        subscription.unsubscribe()
        printStats()
        reject(new Error('工作流执行超时'))
      }, 120000)
    })
  } catch (error) {
    // 确保即使有异常也能输出统计
    if (!nodeStats.get(ast.id)?.totalEmitCount) {
      printStats()
    }
    throw error
  }

  process.exit(0)
}

main().catch(err => {
  console.error('执行失败:', err)
  process.exit(1)
})
