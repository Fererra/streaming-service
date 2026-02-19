import { InjectRepository } from '@nestjs/typeorm';
import { UserGatewayCustomerEntity } from '../entities/gateway-customer.entity';
import { Repository } from 'typeorm';
import { PaymentGatewayProvider } from '../../modules/payment/enums/payment-gateway-provider.enum';
import { IGatewayCustomerRepository } from './interfaces/gateway-customer.repository';

export class GatewayCustomerRepository implements IGatewayCustomerRepository {
  constructor(
    @InjectRepository(UserGatewayCustomerEntity)
    private readonly repository: Repository<UserGatewayCustomerEntity>,
  ) {}

  findByUserIdAndGateway(
    userId: string,
    gateway: PaymentGatewayProvider,
  ): Promise<UserGatewayCustomerEntity | null> {
    return this.repository.findOne({
      where: {
        user: { id: userId },
        gateway,
      },
    });
  }

  save(
    data: Partial<UserGatewayCustomerEntity>,
  ): Promise<UserGatewayCustomerEntity> {
    return this.repository.save(data);
  }
}
