import { SubscriptionOfferGatewayPriceEntity } from 'src/database/entities/gateway-price.entity';

export interface IGatewayPriceRepository {
  createGatewayPrice(
    gateway: string,
    externalPriceId: string,
    offerId: string,
  ): Promise<void>;
  findByOfferIdAndGateway(
    offerId: string,
    gateway: string,
  ): Promise<SubscriptionOfferGatewayPriceEntity | null>;
}
