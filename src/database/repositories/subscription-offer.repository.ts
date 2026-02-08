import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SubscriptionOfferEntity } from '../entities/subscription-offer.entity';
import { In, Repository } from 'typeorm';
import { ISubscriptionOfferRepository } from './interfaces/subscription-offer-repository.interface';

@Injectable()
export class SubscriptionOfferRepository implements ISubscriptionOfferRepository {
  constructor(
    @InjectRepository(SubscriptionOfferEntity)
    private readonly repository: Repository<SubscriptionOfferEntity>,
  ) {}

  findOffersByPlanAndDurations(
    planId: string,
    durations: number[],
  ): Promise<SubscriptionOfferEntity[]> {
    return this.repository.find({
      where: {
        subscriptionPlan: { id: planId },
        durationMonths: In(durations),
      },
      select: ['id', 'durationMonths'],
    });
  }

  findByIdAndPlanId(
    offerId: string,
    planId: string,
    options: { withDeleted?: boolean } = {},
  ): Promise<SubscriptionOfferEntity | null> {
    const { withDeleted = false } = options;

    return this.repository.findOne({
      where: {
        id: offerId,
        subscriptionPlan: { id: planId },
      },
      withDeleted,
    });
  }

  save(
    offers: Partial<SubscriptionOfferEntity>[],
  ): Promise<SubscriptionOfferEntity[]> {
    return this.repository.save(offers);
  }

  async activateOffer(offer: Partial<SubscriptionOfferEntity>): Promise<void> {
    await this.repository.recover(offer);
  }

  async deactivateOffer(
    offer: Partial<SubscriptionOfferEntity>,
  ): Promise<void> {
    await this.repository.softRemove(offer);
  }
}
