type BasePlanCommand = { planId: string };
type BaseOfferCommand = { offerId: string };

type SyncPlanCommand = BasePlanCommand;
type UpdatePlanCommand = BasePlanCommand & {
  updates: { name?: string; description?: string };
};
type ActivatePlanCommand = BasePlanCommand;
type DeactivatePlanCommand = BasePlanCommand;

type SyncOfferCommand = BaseOfferCommand;
type DeactivateOfferCommand = BaseOfferCommand & {
  planId: string;
};

export type PaymentCommandMap = {
  'command.syncPlan': SyncPlanCommand;
  'command.updatePlan': UpdatePlanCommand;
  'command.activatePlan': ActivatePlanCommand;
  'command.deactivatePlan': DeactivatePlanCommand;
  'command.syncOffer': SyncOfferCommand;
  'command.deactivateOffer': DeactivateOfferCommand;
};

export type CommandType = keyof PaymentCommandMap;
export type CommandPayload<T extends CommandType> = PaymentCommandMap[T];
