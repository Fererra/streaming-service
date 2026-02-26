import { Module } from '@nestjs/common';
import { UserSubscriptionPersistenceModule } from './user-subscription-persistence.module';
import { UserSubscriptionService } from './services/user-subscription.service';

@Module({
  imports: [UserSubscriptionPersistenceModule],
  providers: [UserSubscriptionService],
  exports: [UserSubscriptionPersistenceModule, UserSubscriptionService],
})
export class UserSubscriptionModule {}
