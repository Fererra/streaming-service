import { PaymentGatewayProvider } from '../../enums/payment-gateway-provider.enum';
import { SubscriptionPlanGatewayProductEntity } from '../../entities/gateway-product.entity';

export interface IGatewayProductRepository {
  createGatewayProduct(
    data: Partial<SubscriptionPlanGatewayProductEntity>,
  ): Promise<void>;
  findByPlanIdAndGateway(
    planId: string,
    gateway: PaymentGatewayProvider,
  ): Promise<string | null>;
}
