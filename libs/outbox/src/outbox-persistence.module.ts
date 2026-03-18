import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxEntity } from './entities/outbox.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OutboxEntity])],
})
export class OutboxPersistenceModule {}
