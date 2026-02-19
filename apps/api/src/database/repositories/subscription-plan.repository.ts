import { InjectRepository } from '@nestjs/typeorm';
import { SubscriptionPlanEntity } from '../entities/subscription-plan.entity';
import { IsNull, Repository } from 'typeorm';
import { SubscriptionOfferEntity } from '../entities/subscription-offer.entity';
import { ISubscriptionPlanRepository } from './interfaces/subscription-plan-repository.interface';

export class SubscriptionPlanRepository implements ISubscriptionPlanRepository {
  constructor(
    @InjectRepository(SubscriptionPlanEntity)
    private repository: Repository<SubscriptionPlanEntity>,
  ) {}

  async findAllWithOffers(): Promise<SubscriptionPlanEntity[]> {
    const plans = await this.repository
      .createQueryBuilder('subscription_plans')
      .select([
        'subscription_plans.id',
        'subscription_plans.name',
        'subscription_plans.description',
      ])
      .withDeleted()
      .getMany();

    for (const plan of plans) {
      plan.offers = await this.repository.manager
        .createQueryBuilder(SubscriptionOfferEntity, 'offer')
        .where('offer.subscriptionPlan.id = :planId', { planId: plan.id })
        .select(['offer.id', 'offer.durationMonths', 'offer.price'])
        .withDeleted()
        .getMany();
    }

    return plans;
  }

  findActiveWithOffers(): Promise<SubscriptionPlanEntity[]> {
    return this.repository
      .createQueryBuilder('subscription_plans')
      .innerJoinAndSelect('subscription_plans.offers', 'offer')
      .where('subscription_plans.deletedAt IS NULL')
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
      deletedAt: criteria.deletedAt ?? IsNull(),
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
    offers: Partial<SubscriptionOfferEntity>[],
  ): Promise<SubscriptionPlanEntity> {
    return this.repository.manager.transaction(async (manager) => {
      const savedPlan = await manager.save(
        SubscriptionPlanEntity,
        subscriptionPlan,
      );

      const offersWithPlanId = offers.map((offer) => ({
        ...offer,
        subscriptionPlan: { id: savedPlan.id },
      }));

      await manager.save(SubscriptionOfferEntity, offersWithPlanId);

      return {
        ...savedPlan,
        offers: offersWithPlanId as SubscriptionOfferEntity[],
      };
    });
  }

  async update(
    id: string,
    updateData: Partial<Omit<SubscriptionPlanEntity, 'offers'>>,
  ): Promise<number> {
    const result = await this.repository.update({ id }, updateData);
    return result.affected ?? 0;
  }

  async activatePlan(plan: Partial<SubscriptionPlanEntity>): Promise<void> {
    await this.repository.recover(plan);
  }

  async deactivatePlan(plan: Partial<SubscriptionPlanEntity>): Promise<void> {
    await this.repository.softRemove(plan);
  }
}
