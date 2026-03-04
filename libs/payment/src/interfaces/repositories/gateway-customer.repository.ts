import { PaymentGatewayProvider } from '../../enums/payment-gateway-provider.enum';
import { UserGatewayCustomerEntity } from '../../entities/gateway-customer.entity';

export interface IGatewayCustomerRepository {
  findByUserIdAndGateway(
    userId: string,
    gateway: PaymentGatewayProvider,
  ): Promise<UserGatewayCustomerEntity | null>;
  save(
    data: Partial<UserGatewayCustomerEntity>,
  ): Promise<UserGatewayCustomerEntity>;
}
