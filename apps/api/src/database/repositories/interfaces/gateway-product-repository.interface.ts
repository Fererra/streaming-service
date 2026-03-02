import { PaymentGatewayProvider } from '@app/payment';

export interface IGatewayProductRepository {
  createGatewayProduct(
    gateway: PaymentGatewayProvider,
    externalProductId: string,
    planId: string,
  ): Promise<void>;
  findByPlanIdAndGateway(
    planId: string,
    gateway: PaymentGatewayProvider,
  ): Promise<string | null>;
}
