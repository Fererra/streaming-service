import { InjectRepository } from '@nestjs/typeorm';
import { SubscriptionPlanEntity } from '../entities/subscription-plan.entity';
import { Repository } from 'typeorm';
import { SubscriptionOfferEntity } from '../entities/subscription-offer.entity';
import { ISubscriptionPlanRepository } from './interfaces/subscription-plan-repository.interface';

export class SubscriptionPlanRepository implements ISubscriptionPlanRepository {
  constructor(
    @InjectRepository(SubscriptionPlanEntity)
    private repository: Repository<SubscriptionPlanEntity>,
  ) {}

  existsBy(criteria: Partial<SubscriptionPlanEntity>): Promise<boolean> {
    return this.repository.existsBy(criteria);
  }

  save(
    subscriptionPlan: Partial<SubscriptionPlanEntity>,
    offers: Partial<SubscriptionOfferEntity>[],
  ): Promise<SubscriptionPlanEntity> {
    return this.repository.manager.transaction(async (manager) => {
      const savedPlan = await manager.save(
        SubscriptionPlanEntity,
        subscriptionPlan,
      );

      const offersWithPlanId = offers.map((offer) => ({
        ...offer,
        subscriptionPlanId: savedPlan.id,
      }));

      await manager.save(SubscriptionOfferEntity, offersWithPlanId);

      return savedPlan;
    });
  }
}
