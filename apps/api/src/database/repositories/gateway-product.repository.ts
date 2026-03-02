import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentGatewayProvider } from '@app/payment';
import { IGatewayProductRepository } from './interfaces/gateway-product-repository.interface';
import { SubscriptionPlanGatewayProductEntity } from '../entities/gateway-product.entity';

@Injectable()
export class GatewayProductRepository implements IGatewayProductRepository {
  constructor(
    @InjectRepository(SubscriptionPlanGatewayProductEntity)
    private readonly repository: Repository<SubscriptionPlanGatewayProductEntity>,
  ) {}

  async createGatewayProduct(
    gateway: PaymentGatewayProvider,
    externalProductId: string,
    planId: string,
  ): Promise<void> {
    await this.repository.save({
      gateway,
      externalProductId,
      plan: { id: planId },
    });
  }

  async findByPlanIdAndGateway(
    planId: string,
    gateway: PaymentGatewayProvider,
  ): Promise<string | null> {
    const plan = await this.repository.findOne({
      where: {
        plan: { id: planId },
        gateway,
      },
    });

    return plan?.externalProductId ?? null;
  }
}
