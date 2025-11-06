import { Module } from '@nestjs/common';
import { HelloController } from './hello.controller';
import { OverviewController } from './controllers/overview.controller';
import { EventsController } from './controllers/events.controller';
import { KeywordsController } from './controllers/keywords.controller';

@Module({
  controllers: [
    HelloController,
    OverviewController,
    EventsController,
    KeywordsController
  ],
})
export class AppModule {}
