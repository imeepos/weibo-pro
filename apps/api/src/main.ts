import "reflect-metadata";
import "dotenv/config";
import "@sker/workflow";
import "@sker/workflow-ast";
import "@sker/workflow-run";

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { root } from '@sker/core';
import { entitiesProviders } from "@sker/entities";
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { NotFoundExceptionFilter } from './filters/not-found.filter';
import { logger } from './utils/logger';
import { execSync } from 'child_process';

async function killPortProcess(port: number): Promise<void> {
    try {
        const pid = execSync(`lsof -ti:${port}`, { encoding: 'utf-8' }).trim();
        if (pid) {
            execSync(`kill -9 ${pid}`);
            logger.info(`已清理端口 ${port} 占用进程 (PID: ${pid})`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    } catch (error) {
        // 端口未被占用或清理失败，继续执行
    }
}

async function bootstrap() {
    const PORT = 9001;
    await killPortProcess(PORT);
    root.set([
        ...entitiesProviders
    ])
    await root.init();
    const app = await NestFactory.create(AppModule);

    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new NotFoundExceptionFilter());

    app.enableCors({
        origin: true,
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
        maxAge: 86400,
    });
    await app.listen(PORT, '0.0.0.0');
    console.log(`app start at http://localhost:${PORT}`)
}

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM signal, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT signal, shutting down gracefully');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  // 不退出进程，让服务继续运行
});

bootstrap();
