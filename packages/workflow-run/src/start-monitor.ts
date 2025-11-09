import { root } from '@sker/core';
import { registerMonitorDependencies } from './monitor-dependencies';
import { MonitorStarter } from './MonitorStarter';

/**
 * 监控系统启动脚本
 *
 * 存在即合理：
 * - 提供独立的监控启动入口
 * - 支持命令行参数配置
 * - 优雅的错误处理和退出
 *
 * 优雅即简约：
 * - 清晰的启动流程
 * - 完整的日志记录
 * - 优雅的信号处理
 */

async function main() {
  console.log('🚀 微博实时监控系统启动中...');
  console.log('──────────────────────────────');

  try {
    // 1. 注册依赖
    registerMonitorDependencies();

    // 2. 获取监控启动器
    const monitorStarter = root.get(MonitorStarter);

    // 3. 启动完整监控系统
    await monitorStarter.startCompleteMonitoring();

    console.log('✅ 微博实时监控系统启动成功！');
    console.log('📊 系统将持续监控热门时间线并自动处理新帖子');
    console.log('──────────────────────────────');

    // 4. 设置优雅退出
    setupGracefulShutdown(monitorStarter);

    // 5. 保持进程运行
    await keepAlive();

  } catch (error) {
    console.error('❌ 监控系统启动失败:', error);
    process.exit(1);
  }
}

/**
 * 设置优雅退出
 *
 * 优雅设计：
 * - 捕获系统信号安全停止
 * - 清理资源避免内存泄漏
 * - 提供清晰的退出日志
 */
function setupGracefulShutdown(monitorStarter: MonitorStarter): void {
  const shutdown = async (signal: string) => {
    console.log(`\n📡 收到 ${signal} 信号，开始优雅关闭...`);

    try {
      await monitorStarter.stopCompleteMonitoring();
      console.log('✅ 监控系统已安全停止');
      process.exit(0);
    } catch (error) {
      console.error('❌ 监控系统停止失败:', error);
      process.exit(1);
    }
  };

  // 捕获系统信号
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  console.log('📡 优雅退出处理程序已设置');
}

/**
 * 保持进程运行
 *
 * 性能即艺术：
 * - 轻量级的保持运行机制
 * - 避免不必要的资源消耗
 * - 支持手动停止
 */
async function keepAlive(): Promise<void> {
  return new Promise((resolve) => {
    console.log('💤 监控系统运行中，按 Ctrl+C 停止...');

    // 这里可以添加定期状态报告
    const statusInterval = setInterval(() => {
      console.log('📊 监控系统运行正常...');
    }, 60000); // 每分钟报告一次

    // 清理定时器（虽然进程退出时会自动清理）
    process.on('exit', () => {
      clearInterval(statusInterval);
    });
  });
}

/**
 * 命令行参数处理
 *
 * 优雅设计：
 * - 支持简单的命令行参数
 * - 清晰的参数说明
 * - 优雅的错误提示
 */
function parseCommandLineArgs(): {
  help: boolean;
  version: boolean;
} {
  const args = process.argv.slice(2);
  const result = {
    help: args.includes('--help') || args.includes('-h'),
    version: args.includes('--version') || args.includes('-v'),
  };

  if (result.help) {
    showHelp();
    process.exit(0);
  }

  if (result.version) {
    showVersion();
    process.exit(0);
  }

  return result;
}

/**
 * 显示帮助信息
 *
 * 优雅即简约：
 * - 清晰的命令行说明
 * - 易于理解的参数描述
 * - 友好的用户界面
 */
function showHelp(): void {
  console.log(`
微博实时监控系统

用法: node start-monitor.js [选项]

选项:
  -h, --help     显示此帮助信息
  -v, --version  显示版本信息

功能:
  • 持续监控微博热门时间线
  • 自动检测新帖子
  • 推送新帖子到 NLP 分析队列
  • 支持优雅停止和重启

示例:
  node start-monitor.js          # 启动监控系统
  node start-monitor.js --help   # 显示帮助
  `);
}

/**
 * 显示版本信息
 *
 * 存在即合理：
 * - 提供版本追踪
 * - 支持系统识别
 * - 清晰的版本格式
 */
function showVersion(): void {
  console.log('微博实时监控系统 v1.0.0');
  console.log('基于 @sker/workflow-run 构建');
}

// 启动应用
if (require.main === module) {
  const args = parseCommandLineArgs();
  main().catch(error => {
    console.error('❌ 应用启动失败:', error);
    process.exit(1);
  });
}

export { main };