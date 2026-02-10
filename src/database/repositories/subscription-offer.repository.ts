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

  existsByDurationAndPlan(
    planId: string,
    durationMonths: number,
  ): Promise<boolean> {
    return this.repository.existsBy({
      subscriptionPlan: { id: planId },
      durationMonths,
    });
  }

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

  async update(
    offerId: string,
    planId: string,
    updateData: Partial<SubscriptionOfferEntity>,
  ): Promise<number> {
    const result = await this.repository.update(
      { id: offerId, subscriptionPlan: { id: planId } },
      updateData,
    );

    return result.affected ?? 0;
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
