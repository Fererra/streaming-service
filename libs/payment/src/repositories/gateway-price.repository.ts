import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SubscriptionOfferGatewayPriceEntity } from '../entities/gateway-price.entity';
import { Repository } from 'typeorm';
import { IGatewayPriceRepository } from '../interfaces/repositories/gateway-price-repository.interface';
import { PaymentGatewayProvider } from '../enums/payment-gateway-provider.enum';

@Injectable()
export class GatewayPriceRepository implements IGatewayPriceRepository {
  constructor(
    @InjectRepository(SubscriptionOfferGatewayPriceEntity)
    private readonly repository: Repository<SubscriptionOfferGatewayPriceEntity>,
  ) {}

  async createGatewayPrice(
    data: Partial<SubscriptionOfferGatewayPriceEntity>,
  ): Promise<void> {
    await this.repository.save(data);
  }

  findByOfferIdAndGateway(
    offerId: string,
    gateway: PaymentGatewayProvider,
  ): Promise<SubscriptionOfferGatewayPriceEntity | null> {
    return this.repository.findOne({
      select: ['externalPriceId'],
      where: {
        subscriptionOfferId: offerId,
        gateway,
      },
    });
  }
}
