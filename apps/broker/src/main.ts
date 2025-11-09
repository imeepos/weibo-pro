import { config } from 'dotenv';
config();

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * Broker应用主入口
 *
 * 存在即合理：
 * - 统一的应用启动入口
 * - 优雅的错误处理和日志
 * - 清晰的启动过程
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 配置全局前缀
  app.setGlobalPrefix('api/broker');

  // 启用CORS
  app.enableCors();

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Broker应用已启动，端口: ${port}`);
  console.log(`📊 API文档: http://localhost:${port}/api/broker`);
}

bootstrap().catch(error => {
  console.error('❌ Broker应用启动失败:', error);
  process.exit(1);
});