import 'reflect-metadata';

/**
 * 开发环境启动脚本
 *
 * 存在即合理：
 * - 提供开发环境的快速启动
 * - 清晰的启动日志和错误处理
 * - 便于调试和测试
 */

async function startDev() {
  console.log('🚀 启动Broker开发服务器...');
  console.log('──────────────────────────────');

  try {
    // 检查环境变量
    const requiredEnvVars = ['DB_HOST', 'DB_USERNAME', 'DB_PASSWORD', 'DB_NAME'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      console.warn('⚠️  缺少环境变量:', missingVars.join(', '));
      console.log('💡 提示: 请设置以下环境变量:');
      console.log('  DB_HOST=localhost');
      console.log('  DB_USERNAME=postgres');
      console.log('  DB_PASSWORD=password');
      console.log('  DB_NAME=sker_broker');
      console.log('  PORT=3001');
    }

    // 导入主应用
    const { bootstrap } = await import('./src/main');

    // 启动应用
    await bootstrap();

  } catch (error) {
    console.error('❌ 开发服务器启动失败:', error);
    process.exit(1);
  }
}

// 启动开发服务器
if (require.main === module) {
  startDev();
}