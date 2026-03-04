import { Module } from '@nestjs/common';
import { UserSubscriptionService } from '../services/user-subscription.service';
import { SubscriptionLibPersistenceModule } from './subscription-lib-persistence.module';

@Module({
  imports: [SubscriptionLibPersistenceModule],
  providers: [UserSubscriptionService],
  exports: [SubscriptionLibPersistenceModule, UserSubscriptionService],
})
export class SubscriptionLibModule {}
