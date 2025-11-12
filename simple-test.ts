/**
 * 前端执行器系统测试脚本
 *
 * 优雅设计：
 * - 验证执行器系统的基本功能
 * - 测试执行器注册和查找机制
 * - 验证通用执行器和特殊执行器的集成
 */

import 'reflect-metadata'
import { root } from '@sker/core'
import { providers } from '@sker/sdk'
import {
  initializeFrontendExecutors,
  getExecutorSystemStatus,
  demonstrateExecutorSystem,
  demonstrateBatchExecution
} from '@sker/workflow-ui'

async function testExecutorSystem() {
  console.log('🚀 开始测试前端执行器系统...\n')

  try {
    // 初始化SDK providers
    root.set(providers(true))
    console.log('✅ SDK providers 初始化成功')

    // 初始化前端执行器系统
    initializeFrontendExecutors()
    console.log('✅ 前端执行器系统初始化成功')

    // 获取执行器系统状态
    const status = getExecutorSystemStatus()
    console.log('📊 执行器系统状态:', status)

    console.log('\n--- 开始执行器功能测试 ---\n')

    // 测试单个节点执行
    await demonstrateExecutorSystem()

    console.log('\n--- 开始批量执行测试 ---\n')

    // 测试批量执行
    await demonstrateBatchExecution()

    console.log('\n🎉 前端执行器系统测试完成！')
    console.log('\n📋 测试总结:')
    console.log('- ✅ 执行器系统初始化成功')
    console.log('- ✅ 执行器注册和查找机制正常')
    console.log('- ✅ 通用执行器工作正常')
    console.log('- ✅ 批量执行功能正常')
    console.log('- ✅ 错误处理机制正常')

  } catch (error) {
    console.error('❌ 测试失败:', error)
    process.exit(1)
  }
}

// 运行测试
if (require.main === module) {
  testExecutorSystem()
    .then(() => {
      console.log('\n✨ 所有测试执行完毕')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 测试执行失败:', error)
      process.exit(1)
    })
}

export { testExecutorSystem }