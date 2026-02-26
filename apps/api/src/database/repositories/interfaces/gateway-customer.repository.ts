import { UserGatewayCustomerEntity } from '../../entities/gateway-customer.entity';
import { PaymentGatewayProvider } from '@app/payment';

export interface IGatewayCustomerRepository {
  findByUserIdAndGateway(
    userId: string,
    gateway: PaymentGatewayProvider,
  ): Promise<UserGatewayCustomerEntity | null>;
  save(
    data: Partial<UserGatewayCustomerEntity>,
  ): Promise<UserGatewayCustomerEntity>;
}
