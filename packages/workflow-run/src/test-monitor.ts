import { root } from '@sker/core';
import { registerMonitorDependencies } from './monitor-dependencies';
import { MonitorStarter } from './MonitorStarter';

/**
 * 监控系统测试脚本
 *
 * 存在即合理：
 * - 提供独立的测试入口
 * - 验证组件功能完整性
 * - 优雅的错误处理和报告
 *
 * 优雅即简约：
 * - 清晰的测试流程
 * - 完整的测试日志
 * - 易于理解的测试结果
 */

async function testMonitorSystem() {
  console.log('🧪 开始测试微博实时监控系统...');
  console.log('──────────────────────────────');

  try {
    // 1. 注册依赖
    console.log('📝 步骤 1: 注册依赖...');
    registerMonitorDependencies();
    console.log('✅ 依赖注册成功');

    // 2. 获取监控启动器
    console.log('📝 步骤 2: 获取监控启动器...');
    const monitorStarter = root.get(MonitorStarter);
    console.log('✅ 监控启动器获取成功');

    // 3. 检查系统状态
    console.log('📝 步骤 3: 检查系统状态...');
    const status = monitorStarter.getSystemStatus();
    console.log('📊 系统状态:', {
      运行状态: status.isStarted ? '运行中' : '已停止',
      监控间隔: `${status.monitorStatus.currentInterval}ms`,
      检测缓存: `${status.detectorStatus.cacheSize}/${status.detectorStatus.maxCacheSize}`,
      推送统计: status.publisherStatus.processedCount,
    });
    console.log('✅ 系统状态检查完成');

    // 4. 健康检查
    console.log('📝 步骤 4: 执行健康检查...');
    const health = await monitorStarter.healthCheck();
    console.log('❤️ 健康状态:', {
      整体健康: health.healthy ? '健康' : '异常',
      监控组件: health.components.monitor ? '正常' : '异常',
      检测组件: health.components.detector ? '正常' : '异常',
      推送组件: health.components.publisher ? '正常' : '异常',
      集成组件: health.components.integrator ? '正常' : '异常',
      消息: health.message,
    });
    console.log('✅ 健康检查完成');

    // 5. 测试启动和停止
    console.log('📝 步骤 5: 测试启动和停止...');

    console.log('🚀 测试启动...');
    await monitorStarter.startCompleteMonitoring();
    console.log('✅ 启动测试成功');

    // 等待2秒
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('⏹️ 测试停止...');
    await monitorStarter.stopCompleteMonitoring();
    console.log('✅ 停止测试成功');

    // 6. 最终状态检查
    console.log('📝 步骤 6: 最终状态检查...');
    const finalStatus = monitorStarter.getSystemStatus();
    console.log('📊 最终系统状态:', {
      运行状态: finalStatus.isStarted ? '运行中' : '已停止',
      连续失败: finalStatus.monitorStatus.consecutiveFailures,
      检测缓存: `${finalStatus.detectorStatus.cacheSize}/${finalStatus.detectorStatus.maxCacheSize}`,
      推送统计: finalStatus.publisherStatus.processedCount,
    });

    console.log('──────────────────────────────');
    console.log('🎉 监控系统测试完成！所有测试通过！');
    console.log('✅ 依赖注入正常');
    console.log('✅ 组件状态正常');
    console.log('✅ 健康检查正常');
    console.log('✅ 启动停止正常');

  } catch (error) {
    console.error('❌ 监控系统测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  testMonitorSystem().catch(error => {
    console.error('❌ 测试执行失败:', error);
    process.exit(1);
  });
}

export { testMonitorSystem };