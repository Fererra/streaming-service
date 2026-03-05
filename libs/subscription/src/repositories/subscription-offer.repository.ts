import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SubscriptionOfferEntity } from '../entities/subscription-offer.entity';
import { In, Repository } from 'typeorm';
import { ISubscriptionOfferRepository } from '../interfaces/subscription-offer-repository.interface';
import { OfferStatus } from '../enums/status.enum';

@Injectable()
export class SubscriptionOfferRepository implements ISubscriptionOfferRepository {
  constructor(
    @InjectRepository(SubscriptionOfferEntity)
    private readonly repository: Repository<SubscriptionOfferEntity>,
  ) {}

  findOfferByIdAndPlanId(
    offerId: string,
    planId: string,
  ): Promise<SubscriptionOfferEntity | null> {
    return this.repository.findOne({
      select: ['id', 'status'],
      where: { id: offerId, subscriptionPlan: { id: planId } },
    });
  }

  findDraftOffersByPlanId(planId: string): Promise<SubscriptionOfferEntity[]> {
    return this.repository.find({
      select: ['id', 'price', 'durationMonths'],
      where: { subscriptionPlan: { id: planId }, status: OfferStatus.DRAFT },
    });
  }

  findActiveOffersByPlanId(planId: string): Promise<SubscriptionOfferEntity[]> {
    return this.repository.find({
      select: ['id'],
      where: { subscriptionPlan: { id: planId }, status: OfferStatus.ACTIVE },
    });
  }

  async findPriceById(offerId: string): Promise<number | null> {
    const offer = await this.repository.findOne({
      select: ['price'],
      where: { id: offerId, status: OfferStatus.ACTIVE },
    });

    return offer?.price ?? null;
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

  save(
    offers: Partial<SubscriptionOfferEntity>[],
  ): Promise<SubscriptionOfferEntity[]> {
    return this.repository.save(offers);
  }

  private async update(
    criteria: Partial<SubscriptionOfferEntity>,
    data: Partial<SubscriptionOfferEntity>,
  ): Promise<number> {
    const result = await this.repository.update(criteria, data);
    return result.affected ?? 0;
  }

  async updateStatus(offerId: string, status: OfferStatus): Promise<number> {
    return this.update({ id: offerId }, { status });
  }
}
