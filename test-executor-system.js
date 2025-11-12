/**
 * 前端执行器系统验证脚本
 * 通过浏览器控制台测试执行器系统功能
 */

// 测试函数 - 在浏览器控制台中运行
async function testExecutorSystem() {
  console.log('🚀 开始测试前端执行器系统...')

  try {
    // 检查执行器系统是否可用
    if (typeof window !== 'undefined' && window.ExecutorManager) {
      console.log('✅ ExecutorManager 可用')
    } else {
      console.log('❌ ExecutorManager 不可用')
      return
    }

    // 检查初始化函数是否可用
    if (typeof initializeFrontendExecutors === 'function') {
      console.log('✅ initializeFrontendExecutors 可用')
      initializeFrontendExecutors()
    } else {
      console.log('❌ initializeFrontendExecutors 不可用')
      return
    }

    // 检查状态获取函数是否可用
    if (typeof getExecutorSystemStatus === 'function') {
      const status = getExecutorSystemStatus()
      console.log('📊 执行器系统状态:', status)
    } else {
      console.log('❌ getExecutorSystemStatus 不可用')
      return
    }

    // 检查AST节点是否可用
    if (typeof WeiboKeywordSearchAst === 'function') {
      console.log('✅ WeiboKeywordSearchAst 可用')
    } else {
      console.log('❌ WeiboKeywordSearchAst 不可用')
      return
    }

    console.log('🎉 前端执行器系统验证通过！')

  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
}

// 运行测试
testExecutorSystem()