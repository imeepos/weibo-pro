import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { root } from '@sker/core';

async function bootstrap() {
  await root.init();
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  console.log(`http://localhost:3000`);
}

bootstrap();
