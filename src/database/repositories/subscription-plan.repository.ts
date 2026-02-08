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

      return savedPlan;
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
