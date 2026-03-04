import { SubscriptionOfferGatewayPriceEntity } from '../../entities/gateway-price.entity';
import { PaymentGatewayProvider } from '../../enums/payment-gateway-provider.enum';

export interface IGatewayPriceRepository {
  createGatewayPrice(
    data: Partial<SubscriptionOfferGatewayPriceEntity>,
  ): Promise<void>;
  findByOfferIdAndGateway(
    offerId: string,
    gateway: PaymentGatewayProvider,
  ): Promise<SubscriptionOfferGatewayPriceEntity | null>;
}
