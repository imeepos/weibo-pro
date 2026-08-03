import "reflect-metadata";
// 强制使用UTC时区
process.env.TZ = 'UTC';
import "dotenv/config";
import "@sker/sdk";
import "@sker/workflow";
import "@sker/workflow-ast";
import "@sker/workflow-run";
import "./controllers/index";
import "./claude/claude.controller";
import { root, Logger } from '@sker/core';
import { entitiesProviders, seedNuwa, seedSentimentAnalyzer, seedContentAuditor, seedDataValidator, seedProgrammingAssistant, useTranslation } from "@sker/entities";
import { EdgeModeStrategyProviders, DEFAULT_VISITOR, DefaultVisitor } from '@sker/workflow';
import { createProxyProviders } from '@sker/ip-proxy';
import { killPortProcess } from 'kill-port-process';
import { betterAuth } from 'better-auth';
import { createSkerAuthPlugin, BETTER_AUTH } from '@sker/auth';
import { bearer, openAPI } from 'better-auth/plugins';
import { UploadService } from './services/upload.service';
import { DerivedNodeService } from './services/workflow/derived-node.service';
import { BetterAuthWrapper } from './utils/auth-wrapper';
import { validateEnv } from './config/env.config';
import { runStartupChecks } from './config/startup-check';
import { createHonoApp } from './main.hono';
import { createApiServer } from './main.server';

Reflect.set(global, 'window', {
  WebSocket: WebSocket
})
async function bootstrap() {
  const env = validateEnv();
  const PORT = env.PORT;

  const logger = root.get(Logger);
  logger.info('API 启动中', { NODE_ENV: env.NODE_ENV, PORT, TZ: env.TZ });

  await runStartupChecks(env, logger);

  // 初始化 DI 容器
  root.set([
    ...entitiesProviders,
    ...EdgeModeStrategyProviders,
    { provide: DEFAULT_VISITOR, useClass: DefaultVisitor },
    ...createProxyProviders({
      kuaidaili: {
        secretId: env.KUAIDAILI_SECRET_ID!,
        secretKey: env.KUAIDAILI_SECRET_KEY!,
        username: env.KUAIDAILI_USERNAME!,
        password: env.KUAIDAILI_PASSWORD!,
      },
      validator: {
        testUrl: 'https://httpbin.org/ip',
        timeout: 5000,
      },
    })
  ]);
  await root.init();

  // 种子数据初始化
  await useTranslation(async m => {
    await seedNuwa(m);
    await seedSentimentAnalyzer(m);
    await seedContentAuditor(m);
    await seedDataValidator(m);
    await seedProgrammingAssistant(m);
    logger.info('✓ All seed roles initialized');
  });

  // 加载派生节点
  try {
    const derivedNodeService = root.get(DerivedNodeService);
    await derivedNodeService.loadAll();
    logger.info('✓ Derived nodes loaded');
  } catch (error) {
    logger.warn('Failed to load derived nodes', error);
  }

  // 开发环境端口清理
  if (process.env.DEV) {
    try {
      await killPortProcess(PORT);
      logger.info(`端口 ${PORT} 清理完成`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`端口 ${PORT} 清理失败: ${errorMessage}`);
    }
  }

  // Better Auth 初始化
  // 注意：本项目使用 Better Auth 仅作为 API 路由转发器，不使用其认证功能
  // 因此不配置 database，移除不必要的认证插件
  const auth = betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    // 禁用全局限流
    rateLimit: {
      enabled: false,
    },
    trustedOrigins: (request) => {
      const allowedOrigins = [
        'https://',
        'http://',
      ].filter(Boolean) as string[];

      const origin = request?.headers.get('origin') || request?.headers.get('expo-origin');

      if (!origin) return allowedOrigins;

      const isAllowed = allowedOrigins.some(allowed =>
        origin === allowed || origin.startsWith(allowed)
      );

      return isAllowed ? [origin] : allowedOrigins;
    },
    plugins: [
      createSkerAuthPlugin([]),
      bearer(),    // 保留 bearer token 支持（可能需要）
      openAPI()    // 保留 OpenAPI 支持
    ]
  });

  root.set([{ provide: BETTER_AUTH, useValue: auth }])

  // 创建 Better Auth 包装器
  const uploadService = root.get(UploadService);
  const authWrapper = new BetterAuthWrapper(auth, { uploadService, logger });

  // 创建 Hono 应用
  const app = createHonoApp({ logger, authWrapper });

  // 创建 HTTP 服务器（含 Socket.IO）
  const server = createApiServer(app, logger);

  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Server started at http://localhost:${PORT}`);
    logger.info('✓ HTTP API ready');
    logger.info('✓ WebSocket ready at /ws');
    logger.info('✓ Claude Gateway ready for mobile connections');
  });
}

// 进程信号处理
process.on('SIGTERM', () => {
  const logger = root.get(Logger);
  logger.info('Received SIGTERM signal, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  const logger = root.get(Logger);
  logger.info('Received SIGINT signal, shutting down gracefully');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  const logger = root.get(Logger);
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise
  });
});

process.on('uncaughtException', (error) => {
  const logger = root.get(Logger);
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
});

// 全局类型声明
declare global {
  var websocketBroadcast: (message: any) => void;
}

bootstrap();
