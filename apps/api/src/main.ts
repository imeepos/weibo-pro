import "reflect-metadata";
import { config } from "dotenv";

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { root } from '@sker/core';
import { entitiesProviders } from "@sker/entities";
import { startPostNLPConsumer } from "@sker/workflow-run";
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { logger } from './utils/logger';

async function bootstrap() {
    config();
    root.set([
        ...entitiesProviders
    ])
    await root.init();

    logger.info('Starting post NLP consumer');
    startPostNLPConsumer();
    logger.info('Post NLP consumer started successfully');

    const app = await NestFactory.create(AppModule);

    app.useGlobalInterceptors(new ResponseInterceptor());

    app.enableCors({
        origin: [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:3002',
            'http://localhost:3003',
            'http://localhost:5173',
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

    await app.listen(3000);
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

bootstrap();
