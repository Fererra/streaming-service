export class CreateCheckoutRequest {
  offerId: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
}

export interface SubscriptionOffer {
  id: string;
  price: number;
  durationMonths: number;
  subscriptionPlanId: string;
}

export interface IUserResolver {
  findEmailById(userId: string): Promise<string | null>;
}

export interface ISubscriptionOfferResolver {
  findPriceById(offerId: string): Promise<number | null>;
}
