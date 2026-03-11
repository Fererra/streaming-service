import { Global, Module } from '@nestjs/common';
import { UsersService } from './services/users.service';
import { DatabaseModule } from '../../database/database.module';
import { UsersController } from './users.controller';
import { StorageModule } from '../storage/storage.module';
import { UsersMediaService } from './services/users-media.service';
import { PaymentApiModule } from '../payment/payment-api.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Global()
@Module({
  imports: [
    DatabaseModule,
    StorageModule,
    PaymentApiModule,
    SubscriptionModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersMediaService],
  exports: [UsersService],
})
export class UsersModule {}
