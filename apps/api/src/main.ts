import "reflect-metadata";
import "dotenv/config";
import "@sker/workflow";
import "@sker/workflow-ast";
import "@sker/workflow-run";

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { root } from '@sker/core';
import { entitiesProviders } from "@sker/entities";
import { startPostNLPConsumer } from "@sker/workflow-run";
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { NotFoundExceptionFilter } from './filters/not-found.filter';
import { logger } from './utils/logger';

async function bootstrap() {
    root.set([
        ...entitiesProviders
    ])
    await root.init();

    logger.info('Starting post NLP consumer');
    startPostNLPConsumer();
    logger.info('Post NLP consumer started successfully');

    const app = await NestFactory.create(AppModule);

    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new NotFoundExceptionFilter());

    app.enableCors({
        origin: [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:3002',
            'http://localhost:3003',
            'http://localhost:5173',
            'http://localhost:80',
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
        maxAge: 86400,
    });
    await app.listen(3000, '0.0.0.0');
    logger.info('API server started', { url: 'http://localhost:3000' });

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
