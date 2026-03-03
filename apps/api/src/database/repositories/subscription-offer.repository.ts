import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SubscriptionOfferEntity } from '../entities/subscription-offer.entity';
import { In, Repository } from 'typeorm';
import { ISubscriptionOfferRepository } from './interfaces/subscription-offer-repository.interface';
import { OfferStatus } from '../../modules/subscription/enums/status.enum';

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

  async updateStatus(
    offerId: string,
    planId: string,
    status: OfferStatus,
  ): Promise<number> {
    const result = await this.repository.update(
      { id: offerId, subscriptionPlan: { id: planId } },
      { status },
    );

    return result.affected ?? 0;
  }
}
