import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSubscriptionEntity } from '../entities/user-subscription.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserSubscriptionEntity])],
  exports: [TypeOrmModule],
})
export class UserSubscriptionPersistenceModule {}
