import "reflect-metadata";
import { config } from "dotenv";

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { root } from '@sker/core';
import { entitiesProviders } from "@sker/entities";

async function bootstrap() {
    config();
    root.set([
        ...entitiesProviders
    ])
    await root.init();
    const app = await NestFactory.create(AppModule);

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
            'Accept',
            'Origin'
        ],
        credentials: true,
        maxAge: 86400, // 24小时缓存
    });

    await app.listen(3000);
    console.log(`API服务已启动: http://localhost:3000`);
}

bootstrap();
