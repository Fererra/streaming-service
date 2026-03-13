import { CancellationInitiator } from '@app/shared';

export type BasePlanCommand = { planId: string };
export type BaseOfferCommand = { offerId: string };
export type BaseSubscriptionCommand = {
  subscriptionId: string;
  initiator: CancellationInitiator;
};

export type SyncPlanCommand = { id: string; name: string; description: string };
export type UpdatePlanCommand = BasePlanCommand & {
  updates: { name?: string; description?: string };
};
export type ActivatePlanCommand = BasePlanCommand;
export type DeactivatePlanCommand = BasePlanCommand;

export type SyncOfferCommand = {
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
