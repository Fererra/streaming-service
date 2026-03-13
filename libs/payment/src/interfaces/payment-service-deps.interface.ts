export interface IUserResolver {
  findEmailById(userId: string): Promise<string | null>;
}

export interface ISubscriptionOfferResolver {
  findPriceById(offerId: string): Promise<number | null>;
}
