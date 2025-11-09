import { config } from 'dotenv';
config();

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrokerController } from './controllers/broker.controller';
import { StatusController } from './controllers/status.controller';
import { TaskSchedulerService } from './services/task-scheduler.service';
import { QueueManagerService } from './services/queue-manager.service';
import { TaskRouterService } from './services/task-router.service';
import { WorkflowAdapterService } from './services/workflow-adapter.service';
import { MonitorIntegratorService } from './services/monitor-integrator.service';
import { ConfigManagerService } from './services/config-manager.service';
import { CrawlTaskEntity } from './entities/crawl-task.entity';
import { TaskExecutionEntity } from './entities/task-execution.entity';

/**
 * Broker应用主模块
 *
 * 存在即合理：
 * - 统一管理所有应用组件
 * - 清晰的依赖注入结构
 * - 模块化的服务组织
 */
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'sker_broker',
      entities: [CrawlTaskEntity, TaskExecutionEntity],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV !== 'production',
    }),
    TypeOrmModule.forFeature([CrawlTaskEntity, TaskExecutionEntity]),
  ],
  controllers: [BrokerController, StatusController],
  providers: [
    TaskSchedulerService,
    QueueManagerService,
    TaskRouterService,
    WorkflowAdapterService,
    MonitorIntegratorService,
    ConfigManagerService,
  ],
})
export class AppModule {}