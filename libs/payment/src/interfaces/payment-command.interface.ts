type BasePlanCommand = { planId: string };
type BaseOfferCommand = { offerId: string };
type BaseSubscriptionCommand = { subscriptionId: string };

type SyncPlanCommand = { id: string; name: string; description: string };
type UpdatePlanCommand = BasePlanCommand & {
  updates: { name?: string; description?: string };
};
type ActivatePlanCommand = BasePlanCommand;
type DeactivatePlanCommand = BasePlanCommand;

type SyncOfferCommand = {
  id: string;
  price: number;
  durationMonths: number;
  subscriptionPlanId: string;
};
type DeactivateOfferCommand = BaseOfferCommand;

type DeactivateSubscriptionCommand = BaseSubscriptionCommand;

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
