import { NestFactory } from '@nestjs/core';
import { OutboxWorkerModule } from './modules/outbox-worker.module';

async function bootstrap() {
  const app = await NestFactory.create(OutboxWorkerModule);

  await app.init();
}
bootstrap();
