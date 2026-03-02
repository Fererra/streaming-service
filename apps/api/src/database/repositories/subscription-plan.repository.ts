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

  async findAllWithOffers(): Promise<SubscriptionPlanEntity[]> {
    return this.repository
      .createQueryBuilder('subscription_plans')
      .leftJoinAndSelect('subscription_plans.offers', 'offer')
      .select([
        'subscription_plans.id',
        'subscription_plans.name',
        'subscription_plans.description',
        'subscription_plans.isActive',
        'offer.id',
        'offer.durationMonths',
        'offer.price',
        'offer.isActive',
      ])
      .getMany();
  }

  findActiveWithOffers(): Promise<SubscriptionPlanEntity[]> {
    return this.repository
      .createQueryBuilder('subscription_plans')
      .innerJoinAndSelect('subscription_plans.offers', 'offer')
      .where('subscription_plans.isActive = :isActive', { isActive: true })
      .select([
        'subscription_plans.id',
        'subscription_plans.name',
        'subscription_plans.description',
        'offer.id',
        'offer.durationMonths',
        'offer.price',
      ])
      .getMany();
  }

  existsBy(
    criteria: Partial<Omit<SubscriptionPlanEntity, 'offers'>>,
  ): Promise<boolean> {
    return this.repository.existsBy({
      ...criteria,
      isActive: criteria.isActive ?? true,
    });
  }

  findById(
    id: string,
    options: { withDeleted?: boolean } = {},
  ): Promise<SubscriptionPlanEntity | null> {
    const { withDeleted = false } = options;

    return this.repository.findOne({
      where: { id },
      relations: ['offers'],
      withDeleted,
    });
  }

  save(
    subscriptionPlan: Partial<SubscriptionPlanEntity>,
  ): Promise<SubscriptionPlanEntity> {
    return this.repository.save(subscriptionPlan);
  }

  async update(
    id: string,
    updateData: Partial<Omit<SubscriptionPlanEntity, 'offers'>>,
  ): Promise<number> {
    const result = await this.repository.update({ id }, updateData);
    return result.affected ?? 0;
  }

  async activatePlan(planId: string): Promise<number> {
    return this.update(planId, { isActive: true });
  }

  async deactivatePlan(planId: string): Promise<number> {
    return this.repository.manager.transaction(async (manager) => {
      const result = await manager.update(
        SubscriptionPlanEntity,
        { id: planId },
        { isActive: false },
      );

      if ((result.affected ?? 0) === 0) {
        return 0;
      }

      await manager.update(
        SubscriptionOfferEntity,
        { subscriptionPlan: { id: planId } },
        { isActive: false },
      );

      return result.affected ?? 0;
    });
  }
}
