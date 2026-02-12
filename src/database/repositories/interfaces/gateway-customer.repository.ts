import { UserGatewayCustomerEntity } from 'src/database/entities/gateway-customer.entity';
import { PaymentGatewayProvider } from 'src/modules/payment/enums/payment-gateway-provider.enum';

export interface IGatewayCustomerRepository {
  findByUserIdAndGateway(
    userId: string,
    gateway: PaymentGatewayProvider,
  ): Promise<UserGatewayCustomerEntity | null>;
  save(
    data: Partial<UserGatewayCustomerEntity>,
  ): Promise<UserGatewayCustomerEntity>;
}
