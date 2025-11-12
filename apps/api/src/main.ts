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
import { killPortProcess } from 'kill-port-process';

async function bootstrap() {
  const PORT = 9001;
  try {

    root.set([
      ...entitiesProviders
    ])
    await root.init();
    await killPortProcess(PORT);
    logger.info(`端口 ${PORT} 清理完成`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn(`端口 ${PORT} 清理失败: ${errorMessage}`);
  }
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
});

bootstrap();
