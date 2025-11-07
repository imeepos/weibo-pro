import "reflect-metadata";
import { config } from "dotenv";

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { root } from '@sker/core';
import { entitiesProviders } from "@sker/entities";
import { startPostNLPConsumer } from "@sker/workflow-run";
import { ResponseInterceptor } from './interceptors/response.interceptor';

async function bootstrap() {
    config();
    root.set([
        ...entitiesProviders
    ])
    await root.init();

    // 优雅地启动爬虫工作流消费者
    console.log('🚀 启动爬虫工作流消费者...');
    startPostNLPConsumer();
    console.log('✅ 爬虫工作流消费者已启动');

    const app = await NestFactory.create(AppModule);

    // 全局响应拦截器：统一 API 响应格式
    app.useGlobalInterceptors(new ResponseInterceptor());

    // 跨域配置：优雅而必要的安全边界
    app.enableCors({
        origin: [
            'http://localhost:3000',    // 前端开发环境
            'http://localhost:3001',    // 大屏应用
            'http://localhost:3002',    // 前端应用开发环境
            'http://localhost:3003',    // 前端应用备用端口
            'http://localhost:5173',    // Vite开发服务器
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
            'X-Request-ID',
            'Accept',
            'Origin'
        ],
        credentials: true,
        maxAge: 86400, // 24小时缓存
    });

    await app.listen(3000);
    console.log(`API服务已启动: http://localhost:3000`);
}

// 优雅关闭处理：确保端口完全释放
process.on('SIGTERM', () => {
  console.log('🛑 收到 SIGTERM 信号，优雅关闭中...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 收到 SIGINT 信号，优雅关闭中...');
  process.exit(0);
});

bootstrap();
