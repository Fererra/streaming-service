import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSubscriptionEntity } from './entities/user-subscription.entity';
import { USER_SUBSCRIPTION_REPOSITORY } from './constants/constant';
import { UserSubscriptionRepository } from './repositories/user-subscription.repository';

@Module({
  imports: [TypeOrmModule.forFeature([UserSubscriptionEntity])],
  providers: [
    {
      provide: USER_SUBSCRIPTION_REPOSITORY,
      useClass: UserSubscriptionRepository,
    },
  ],
  exports: [TypeOrmModule, USER_SUBSCRIPTION_REPOSITORY],
})
export class UserSubscriptionPersistenceModule {}
