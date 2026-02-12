import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SubscriptionOfferGatewayPriceEntity } from '../entities/gateway-price.entity';
import { Repository } from 'typeorm';
import { PaymentGatewayProvider } from 'src/modules/payment/enums/payment-gateway-provider.enum';
import { IGatewayPriceRepository } from './interfaces/gateway-price-repository.interface';

@Injectable()
export class GatewayPriceRepository implements IGatewayPriceRepository {
  constructor(
    @InjectRepository(SubscriptionOfferGatewayPriceEntity)
    private readonly repository: Repository<SubscriptionOfferGatewayPriceEntity>,
  ) {}

  async createGatewayPrice(
    gateway: PaymentGatewayProvider,
    externalPriceId: string,
    offerId: string,
  ): Promise<void> {
    await this.repository.save({
      gateway,
      externalPriceId,
      offer: { id: offerId },
    });
  }

  findByOfferIdAndGateway(
    offerId: string,
    gateway: PaymentGatewayProvider,
  ): Promise<SubscriptionOfferGatewayPriceEntity | null> {
    return this.repository
      .createQueryBuilder('gp')
      .innerJoinAndSelect('gp.offer', 'offer')
      .where('gp.gateway = :gateway', { gateway })
      .andWhere('gp.subscription_offer_id = :offerId', { offerId })
      .select(['gp.externalPriceId', 'offer.id', 'offer.price'])
      .getOne();
  }
}
