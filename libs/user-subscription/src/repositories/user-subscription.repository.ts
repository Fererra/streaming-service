import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSubscriptionEntity } from '../entities/user-subscription.entity';
import { IUserSubscriptionRepository } from '../interfaces/user-subscription-repository.interface';
import { SubscriptionStatus } from '../enums/subscription-status.enum';

export class UserSubscriptionRepository implements IUserSubscriptionRepository {
  constructor(
    @InjectRepository(UserSubscriptionEntity)
    private readonly repository: Repository<UserSubscriptionEntity>,
  ) {}

  create(
    data: Partial<UserSubscriptionEntity>,
  ): Promise<UserSubscriptionEntity> {
    return this.repository.save(data);
  }

  async updateStatus(
    subscriptionId: number,
    status: SubscriptionStatus,
  ): Promise<number> {
    const result = await this.repository.update(subscriptionId, { status });

    return result.affected ?? 0;
  }
}
