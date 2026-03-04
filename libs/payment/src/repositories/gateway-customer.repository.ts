import { InjectRepository } from '@nestjs/typeorm';
import { UserGatewayCustomerEntity } from '../entities/gateway-customer.entity';
import { Repository } from 'typeorm';
import { IGatewayCustomerRepository } from '../interfaces/repositories/gateway-customer.repository';
import { PaymentGatewayProvider } from '../enums/payment-gateway-provider.enum';

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
      where: { userId, gateway },
    });
  }

  save(
    data: Partial<UserGatewayCustomerEntity>,
  ): Promise<UserGatewayCustomerEntity> {
    return this.repository.save(data);
  }
}
