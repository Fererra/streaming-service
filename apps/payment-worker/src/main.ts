import { NestFactory } from '@nestjs/core';
import { PaymentWorkerModule } from './payment-worker.module';

async function bootstrap() {
  const app = await NestFactory.create(PaymentWorkerModule);

  await app.init();
}
bootstrap();
