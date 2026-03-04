import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentGatewayProvider } from '../enums/payment-gateway-provider.enum';
import { IGatewayProductRepository } from '../interfaces/repositories/gateway-product-repository.interface';
import { SubscriptionPlanGatewayProductEntity } from '../entities/gateway-product.entity';

@Injectable()
export class GatewayProductRepository implements IGatewayProductRepository {
  constructor(
    @InjectRepository(SubscriptionPlanGatewayProductEntity)
    private readonly repository: Repository<SubscriptionPlanGatewayProductEntity>,
  ) {}

  async createGatewayProduct(
    data: Partial<SubscriptionPlanGatewayProductEntity>,
  ): Promise<void> {
    await this.repository.save(data);
  }

  async findByPlanIdAndGateway(
    planId: string,
    gateway: PaymentGatewayProvider,
  ): Promise<string | null> {
    const plan = await this.repository.findOne({
      where: {
        subscriptionPlanId: planId,
        gateway,
      },
    });

    return plan?.externalProductId ?? null;
  }
}
