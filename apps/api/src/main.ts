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
import { createServer } from 'net';

async function killPortProcess(port: number): Promise<void> {
    return new Promise((resolve) => {
        const server = createServer();

        server.once('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
                logger.info(`端口 ${port} 被占用，尝试清理...`);

                const commands = [
                    `lsof -ti:${port} 2>/dev/null`,
                    `netstat -tlnp 2>/dev/null | grep :${port} | awk '{print $7}' | cut -d/ -f1`,
                    `ss -tlnp 2>/dev/null | grep :${port} | grep -oP 'pid=\\K[0-9]+'`
                ];

                for (const cmd of commands) {
                    try {
                        const output = execSync(cmd, { encoding: 'utf-8' }).trim();
                        const pids = output.split('\n').filter(Boolean);

                        if (pids.length > 0) {
                            pids.forEach(pid => {
                                try {
                                    execSync(`kill -9 ${pid}`);
                                    logger.info(`已清理进程 PID: ${pid}`);
                                } catch {}
                            });
                            setTimeout(resolve, 1000);
                            return;
                        }
                    } catch {}
                }

                logger.warn(`无法自动清理端口 ${port}，请手动检查`);
            }
            resolve();
        });

        server.once('listening', () => {
            server.close(() => resolve());
        });

        server.listen(port, '0.0.0.0');
    });
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
