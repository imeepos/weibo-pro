import { Module } from '@nestjs/common';
import { RedisClient, redisConfigFactory } from '@sker/redis';
import { HelloController } from './hello.controller';
import { OverviewController } from './controllers/overview.controller';
import { EventsController } from './controllers/events.controller';
import { KeywordsController } from './controllers/keywords.controller';
import { ChartsController } from './controllers/charts.controller';
import { UsersController } from './controllers/users.controller';
import { SystemController } from './controllers/system.controller';
import { SentimentController } from './controllers/sentiment.controller';
import { WorkflowController } from './controllers/workflow.controller';
import { LayoutController } from './controllers/layout.controller';
import { CacheService } from './services/cache.service';
import { OverviewService } from './services/data/overview.service';
import { EventsService } from './services/data/events.service';
import { KeywordsService } from './services/data/keywords.service';
import { ChartsService } from './services/data/charts.service';
import { UsersService } from './services/data/users.service';
import { SystemService } from './services/data/system.service';
import { SentimentService } from './services/data/sentiment.service';
import { LayoutService } from './services/data/layout.service';
import { AppWebSocketGateway } from './gateways/websocket.gateway';
import { root } from '@sker/core';

@Module({
  controllers: [
    HelloController,
    OverviewController,
    EventsController,
    KeywordsController,
    ChartsController,
    UsersController,
    SystemController,
    SentimentController,
    WorkflowController,
    LayoutController
  ],
  providers: [
    {
      provide: RedisClient,
      useFactory: () => root.get(RedisClient)
    },
    CacheService,
    OverviewService,
    EventsService,
    KeywordsService,
    ChartsService,
    UsersService,
    SystemService,
    SentimentService,
    LayoutService,
    AppWebSocketGateway
  ],
})
export class AppModule {}
