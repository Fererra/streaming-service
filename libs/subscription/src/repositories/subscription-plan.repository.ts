import { InjectRepository } from '@nestjs/typeorm';
import { SubscriptionPlanEntity } from '../entities/subscription-plan.entity';
import { Repository } from 'typeorm';
import { PlanStatus } from '../enums/status.enum';
import { ISubscriptionPlanRepository } from '../interfaces/subscription-plan-repository.interface';

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
        'subscription_plans.status',
        'offer.id',
        'offer.durationMonths',
        'offer.price',
        'offer.status',
      ])
      .getMany();
  }

  findActiveWithOffers(): Promise<SubscriptionPlanEntity[]> {
    return this.repository
      .createQueryBuilder('subscription_plans')
      .innerJoinAndSelect('subscription_plans.offers', 'offer')
      .where('subscription_plans.status = :status', {
        status: PlanStatus.ACTIVE,
      })
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
    return this.repository.existsBy(criteria);
  }

  findById(id: string): Promise<SubscriptionPlanEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['offers'],
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

  async updateStatus(id: string, status: PlanStatus): Promise<number> {
    return this.update(id, { status });
  }
}
