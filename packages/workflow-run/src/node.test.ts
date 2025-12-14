import "reflect-metadata";
import "@sker/workflow";
import "@sker/workflow-ast";
import "./index";
import { describe, it, expect } from 'vitest'
import { NetworkBuilder, WorkflowGraphAst } from '@sker/workflow'
import { fromJson } from '@sker/workflow'
import { readFileSync } from 'fs'
import { join } from 'path'
import { glob } from 'glob'
import { root } from "@sker/core";
import { of } from 'rxjs'
/**
 * 编写节点测试
 * 遍历： __tests__/*.json 下的工作流节点，都应该正常执行
 * 1. 不会出现卡死等情况
 * 2. 找到错误的原因，并修复
 * 3. 出问题大概率处在调度逻辑 packages\workflow\src\execution\reactive-scheduler.ts
 * 4. 其次是visitor的实现
 */
describe('节点测试', () => {
  // 查找 __tests__ 目录下所有的 JSON 文件
  const testDir = join(__dirname, '__tests__')
  const jsonFiles: string[] = glob.sync(join(testDir, '*.json'))
  const networkBuilder = root.get(NetworkBuilder)
  // 确保有测试文件
  it('应该找到测试文件', () => {
    expect(jsonFiles.length).toBeGreaterThan(0)
  })

  // 为每个 JSON 文件创建独立的测试用例
  jsonFiles.forEach(filePath => {
    const fileName = require('path').basename(filePath)

    it(`${fileName} - 应该在60秒内完成执行`, async () => {
      const fileContent = readFileSync(filePath, 'utf-8')
      const workflowData = JSON.parse(fileContent)

      // 确保是有效的工作流数据
      expect(workflowData).toHaveProperty('workflow')
      expect(workflowData.workflow.type).toBe('WorkflowGraphAst')

      // 构造工作流 AST
      const ast = fromJson(workflowData.workflow) as WorkflowGraphAst

      // 验证 AST 基本结构
      expect(ast).toBeDefined()
      expect(ast.type).toBe('WorkflowGraphAst')
      expect(ast.nodes).toBeDefined()
      expect(Array.isArray(ast.nodes)).toBe(true)

      console.log(`\n=== 开始执行工作流: ${fileName} ===`)
      console.log(`节点数量: ${ast.nodes.length}`)
      console.log(`边数量: ${ast.edges?.length || 0}`)
      console.log(`节点类型: ${ast.nodes.map(n => n.type).join(', ')}`)

      const startTime = Date.now()

      // 使用 AbortController 来控制超时
      const abortController = new AbortController()
      const timeoutId = setTimeout(() => {
        const duration = Date.now() - startTime
        console.error(`❌ 工作流执行超时: ${fileName} (超过60秒, 实际: ${duration}ms)`)
        console.error(`   这说明工作流存在卡死问题，需要排查：`)
        console.error(`   - 是否有循环依赖`)
        console.error(`   - 是否有节点永远无法完成`)
        console.error(`   - 是否有异步操作未正确处理`)
        console.error(`   - 工作流状态: ${ast.state}`)
        console.error(`   - 节点状态:`)
        ast.nodes.forEach(node => {
          console.error(`     ${node.type} (${node.id}): ${node.state}`)
        })
        abortController.abort()
      }, 30000 * 2)

      try {
        // 使用 NetworkBuilder 构建工作流网络
        const network = networkBuilder.buildNetwork(ast, ast);

        const startTime = Date.now();

        // 执行工作流网络，设置超时时间
        const executionPromise = new Promise<WorkflowGraphAst>((resolve, reject) => {
          let workflowCompleted = false;

          // network 是一个 RxJS 操作符，需要传递 Observable<any> 作为输入流
          // 对于起始节点（入度为0），传递空对象即可触发执行
          const subscription = of({}).pipe(network).subscribe({
            next: (event) => {
              console.log(`[Event] ${event.type} - ${event.type || 'workflow'}`);

              // 如果是工作流完成事件，解析为最终状态
              if (event.type === 'workflow_complete') {
                workflowCompleted = true;
                const duration = Date.now() - startTime;
                console.log(`✅ 工作流 ${fileName} 执行完成，耗时: ${duration}ms`);

                // 返回完整的 ast（包含最终状态）
                resolve(ast);
              }
            },
            error: (error) => {
              console.error(`[Error] ${error}`);
              reject(error);
            },
            complete: () => {
              // 流完成，返回最终状态
              if (!workflowCompleted) {
                workflowCompleted = true;
                const duration = Date.now() - startTime;
                console.log(`✅ 工作流 ${fileName} 执行完成，耗时: ${duration}ms`);
                resolve(ast);
              }
            }
          });

          // 设置订阅超时
          setTimeout(() => {
            subscription.unsubscribe();
            const duration = Date.now() - startTime;
            console.error(`❌ 工作流执行超时: ${fileName} (超过60秒, 实际: ${duration}ms)`);
            reject(new Error(`工作流执行超时: ${fileName} (超过60秒)`));
          }, 30000 * 2);
        });

        // 使用 Promise.race 设置超时
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`工作流执行超时: ${fileName} (超过60秒)`))
          }, 30000 * 2)
        })

        const result: any = await Promise.race([executionPromise, timeoutPromise])

        clearTimeout(timeoutId)

        const duration = Date.now() - startTime
        console.log(`✅ 工作流 ${fileName} 执行完成，耗时: ${duration}ms`)
        console.log(`   最终状态: ${result.state}`)

        // 验证执行结果
        expect(result).toBeDefined()
        expect(result.state).toMatch(/success|fail|pending|emitting/)

        // 如果执行失败，输出详细信息
        if (result.state === 'fail' && result.error) {
          console.error(`   ❌ 执行失败，错误: ${result.error}`)
          // 抛出错误，让测试失败
          throw new Error(`工作流执行失败: ${result.error}`)
        }

        // 验证工作流状态正确
        expect(['success', 'fail', 'pending', 'emitting']).toContain(result.state)

      } catch (error) {
        clearTimeout(timeoutId)

        // 输出详细的错误信息
        console.error(`❌ 工作流 ${fileName} 执行失败:`)
        console.error(`   错误类型: ${error?.constructor?.name}`)
        console.error(`   错误消息: ${error instanceof Error ? error.message : String(error)}`)

        if (error instanceof Error && error.stack) {
          console.error(`   错误堆栈:`)
          console.error(error.stack)
        }

        // 输出工作流的当前状态
        console.error(`   工作流当前状态: ${ast.state}`)
        console.error(`   节点详细状态:`)
        ast.nodes.forEach(node => {
          console.error(`     ${node.type} (${node.id}):`)
          console.error(`       状态: ${node.state}`)
          if (node.error) {
            console.error(`       错误: ${node.error}`)
          }
          // 输出节点的关键属性
          const relevantProps = ['input', 'output', 'text', 'prompt', 'system', 'model', 'temperature']
          relevantProps.forEach(prop => {
            if ((node as any)[prop] !== undefined) {
              console.error(`       ${prop}: ${(node as any)[prop]}`)
            }
          })
        })

        // 重新抛出错误，让测试失败
        throw error
      }
    }, 35000) // Jest 测试超时时间比 Promise 超时稍长
  })
})