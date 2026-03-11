import { InjectRepository } from '@nestjs/typeorm';
import { IUserSubscriptionRepository } from '../interfaces/user-subscription-repository.interface';
import { UserSubscriptionEntity } from '../entities/user-subscription.entity';
import { Repository } from 'typeorm';
import { UserSubscriptionStatus } from '@app/shared';

export class UserSubscriptionRepository implements IUserSubscriptionRepository {
  constructor(
    @InjectRepository(UserSubscriptionEntity)
    private readonly repository: Repository<UserSubscriptionEntity>,
  ) {}

  async updateByExternalSubscriptionId(
    externalSubscriptionId: string,
    data: Partial<UserSubscriptionEntity>,
  ): Promise<number> {
    const result = await this.repository.update(
      { externalSubscriptionId },
      data,
    );

    return result.affected ?? 0;
  }

  findByIdAndUserId(
    subscriptionId: string,
    userId: string,
  ): Promise<UserSubscriptionEntity | null> {
    return this.repository.findOne({
      where: { id: subscriptionId, userId },
      select: ['id', 'externalSubscriptionId', 'status'],
    });
  }

  findByUserId(userId: string): Promise<[UserSubscriptionEntity[], number]> {
    return this.repository
      .createQueryBuilder('us')
      .leftJoinAndSelect('us.subscriptionOffer', 'offer')
      .select([
        'us.id',
        'us.subscriptionOfferId',
        'offer.durationMonths',
        'offer.price',
        'us.status',
        'us.currentPeriodStart',
        'us.currentPeriodEnd',
        'us.canceledAt',
      ])
      .where('us.userId = :userId', { userId })
      .orderBy('us.currentPeriodEnd', 'DESC')
      .getManyAndCount();
  }

  hasActiveSubscription(userId: string): Promise<boolean> {
    return this.repository.exists({
      where: { userId, status: UserSubscriptionStatus.ACTIVE },
    });
  }
}
