import { Module } from '@nestjs/common';
import { RedisClient } from '@sker/redis';
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
import { WorkflowService } from './services/workflow.service';
import { AppWebSocketGateway } from './gateways/websocket.gateway';
import { EventQueryService } from './services/data/events/event-query.service';
import { EventAnalyticsService } from './services/data/events/event-analytics.service';
import { EventTimelineBuilder } from './services/data/events/event-timeline.builder';
import { DataMockService } from './services/data/events/data-mock.service';
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
    { provide: CacheService, useFactory: () => root.get(CacheService) },
    { provide: OverviewService, useFactory: () => root.get(OverviewService) },
    { provide: EventsService, useFactory: () => root.get(EventsService) },
    { provide: KeywordsService, useFactory: () => root.get(KeywordsService) },
    { provide: ChartsService, useFactory: () => root.get(ChartsService) },
    { provide: UsersService, useFactory: () => root.get(UsersService) },
    { provide: SystemService, useFactory: () => root.get(SystemService) },
    { provide: SentimentService, useFactory: () => root.get(SentimentService) },
    { provide: LayoutService, useFactory: () => root.get(LayoutService) },
    { provide: WorkflowService, useFactory: () => root.get(WorkflowService) },
    AppWebSocketGateway,
    { provide: EventQueryService, useFactory: () => root.get(EventQueryService) },
    { provide: EventAnalyticsService, useFactory: () => root.get(EventAnalyticsService) },
    { provide: EventTimelineBuilder, useFactory: () => root.get(EventTimelineBuilder) },
    { provide: DataMockService, useFactory: () => root.get(DataMockService) },
  ],
})
export class AppModule { }
