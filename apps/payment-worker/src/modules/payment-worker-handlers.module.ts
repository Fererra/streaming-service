import { Module } from '@nestjs/common';
import { ActivatePlanHandler } from '../handlers/commands/activate-plan.handler';
import { DeactivateOfferHandler } from '../handlers/commands/deactivate-offer.handler';
import { DeactivatePlanHandler } from '../handlers/commands/deactivate-plan.handler';
import { DeactivateSubscriptionHandler } from '../handlers/commands/deactivate-subscription.handler';
import { SyncOfferHandler } from '../handlers/commands/sync-offer.handler';
import { SyncPlanHandler } from '../handlers/commands/sync-plan.handler';
import { UpdatePlanHandler } from '../handlers/commands/update-plan.handler';
import { CheckoutCompletedHandler } from '../handlers/events/checkout-completed.handler';
import { CheckoutExpiredHandler } from '../handlers/events/checkout-expired.handler';
import { InvoicePaidHandler } from '../handlers/events/invoice-paid.handler';
import { InvoicePaymentFailedHandler } from '../handlers/events/invoice-payment-failed.handler';
import { PriceCreatedHandler } from '../handlers/events/price-created.handler';
import { PriceUpdatedHandler } from '../handlers/events/price-updated.handler';
import { ProductCreatedHandler } from '../handlers/events/product-created.handler';
import { ProductUpdatedHandler } from '../handlers/events/product-updated.handler';
import { SubscriptionDeletedHandler } from '../handlers/events/subscription-deleted.handler';
import { SubscriptionUpdatedHandler } from '../handlers/events/subscription-updated.handler';
import {
  PAYMENT_COMMAND_HANDLERS,
  PAYMENT_EVENT_HANDLERS,
} from '../constants/constant';
import { CommandType, EventType, PaymentLibModule } from '@app/payment';
import { IPaymentCommandHandler } from '../interfaces/payment-command-handler.interface';
import { IPaymentEventHandler } from '../interfaces/payment-event-handler.interface';
import { SubscriptionLibPersistenceModule } from '@app/subscription';

const COMMAND_HANDLERS = [
  ActivatePlanHandler,
  DeactivateOfferHandler,
  DeactivatePlanHandler,
  DeactivateSubscriptionHandler,
  SyncOfferHandler,
  SyncPlanHandler,
  UpdatePlanHandler,
];

const EVENT_HANDLERS = [
  ProductCreatedHandler,
  ProductUpdatedHandler,
  PriceCreatedHandler,
  PriceUpdatedHandler,
  CheckoutCompletedHandler,
  CheckoutExpiredHandler,
  InvoicePaidHandler,
  InvoicePaymentFailedHandler,
  SubscriptionUpdatedHandler,
  SubscriptionDeletedHandler,
];

@Module({
  imports: [PaymentLibModule, SubscriptionLibPersistenceModule],
  providers: [
    ...COMMAND_HANDLERS,
    {
      provide: PAYMENT_COMMAND_HANDLERS,
      useFactory: (...handlers: IPaymentCommandHandler<CommandType>[]) =>
        handlers,
      inject: COMMAND_HANDLERS,
    },
    ...EVENT_HANDLERS,
    {
      provide: PAYMENT_EVENT_HANDLERS,
      useFactory: (...handlers: IPaymentEventHandler<EventType>[]) => handlers,
      inject: EVENT_HANDLERS,
    },
  ],
  exports: [PAYMENT_COMMAND_HANDLERS, PAYMENT_EVENT_HANDLERS],
})
export class PaymentWorkerHandlersModule {}
