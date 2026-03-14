import { CancellationInitiator } from '@app/shared';

export type BaseCommand = { idempotencyKey: string };

export type BasePlanCommand = BaseCommand & { planId: string };
export type BaseOfferCommand = BaseCommand & { offerId: string };
export type BaseSubscriptionCommand = BaseCommand & {
  subscriptionId: string;
  initiator: CancellationInitiator;
};

export type SyncPlanCommand = BaseCommand & {
  id: string;
  name: string;
  description: string;
};
export type UpdatePlanCommand = BasePlanCommand & {
  updates: { name?: string; description?: string };
};
export type ActivatePlanCommand = BasePlanCommand;
export type DeactivatePlanCommand = BasePlanCommand;

export type SyncOfferCommand = BaseCommand & {
  id: string;
  price: number;
  durationMonths: number;
  subscriptionPlanId: string;
};
export type DeactivateOfferCommand = BaseOfferCommand;

export type DeactivateSubscriptionCommand = BaseSubscriptionCommand;

export type PaymentCommandMap = {
  'command.syncPlan': SyncPlanCommand;
  'command.updatePlan': UpdatePlanCommand;
  'command.activatePlan': ActivatePlanCommand;
  'command.deactivatePlan': DeactivatePlanCommand;
  'command.syncOffer': SyncOfferCommand;
  'command.deactivateOffer': DeactivateOfferCommand;
  'command.deactivateSubscription': DeactivateSubscriptionCommand;
};

export type CommandType = keyof PaymentCommandMap;
export type CommandPayload<T extends CommandType> = PaymentCommandMap[T];
