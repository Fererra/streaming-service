import { SubscriptionOfferGatewayPriceEntity } from '../../entities/gateway-price.entity';
import { PaymentGatewayProvider } from '@app/payment';

export interface IGatewayPriceRepository {
  createGatewayPrice(
    gateway: PaymentGatewayProvider,
    externalPriceId: string,
    offerId: string,
  ): Promise<void>;
  findByOfferIdAndGateway(
    offerId: string,
    gateway: PaymentGatewayProvider,
  ): Promise<SubscriptionOfferGatewayPriceEntity | null>;
}
