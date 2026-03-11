import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { WebhookController } from './webhook.controller';
import { DatabaseModule } from '../../database/database.module';
import {
  PaymentLibModule,
  SUBSCRIPTION_OFFER_RESOLVER,
  USER_RESOLVER,
} from '@app/payment';
import { IUsersRepository } from '../../database/repositories/interfaces/users-repository.interface';
import { USERS_REPOSITORY } from '../../database/repositories/tokens/repository.tokens';
import { PaymentService } from './payment.service';
import {
  ISubscriptionOfferRepository,
  SUBSCRIPTION_OFFER_REPOSITORY,
  SubscriptionLibPersistenceModule,
} from '@app/subscription';

@Module({
  imports: [DatabaseModule, SubscriptionLibPersistenceModule, PaymentLibModule],
  controllers: [PaymentController, WebhookController],
  providers: [
    PaymentService,
    {
      provide: USER_RESOLVER,
      useFactory: (repository: IUsersRepository) => ({
        findEmailById: (userId: string) => repository.findUserEmailById(userId),
      }),
      inject: [USERS_REPOSITORY],
    },
    {
      provide: SUBSCRIPTION_OFFER_RESOLVER,
      useFactory: (repository: ISubscriptionOfferRepository) => ({
        findPriceById: async (offerId: string) =>
          repository.findPriceById(offerId),
      }),
      inject: [SUBSCRIPTION_OFFER_REPOSITORY],
    },
  ],
  exports: [PaymentService],
})
export class PaymentApiModule {}
