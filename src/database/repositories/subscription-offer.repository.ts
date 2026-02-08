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

  save(
    offers: Partial<SubscriptionOfferEntity>[],
  ): Promise<SubscriptionOfferEntity[]> {
    return this.repository.save(offers);
  }
}
