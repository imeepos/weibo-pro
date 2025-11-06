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
import { CacheService } from './services/cache.service';
import { OverviewService } from './services/data/overview.service';
import { EventsService } from './services/data/events.service';
import { KeywordsService } from './services/data/keywords.service';
import { ChartsService } from './services/data/charts.service';
import { UsersService } from './services/data/users.service';
import { SystemService } from './services/data/system.service';
import { SentimentService } from './services/data/sentiment.service';

@Module({
  controllers: [
    HelloController,
    OverviewController,
    EventsController,
    KeywordsController,
    ChartsController,
    UsersController,
    SystemController,
    SentimentController
  ],
  providers: [
    {
      provide: RedisClient,
      useFactory: () => new RedisClient(redisConfigFactory())
    },
    CacheService,
    OverviewService,
    EventsService,
    KeywordsService,
    ChartsService,
    UsersService,
    SystemService,
    SentimentService
  ],
})
export class AppModule {}
