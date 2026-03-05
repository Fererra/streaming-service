import { InjectRepository } from '@nestjs/typeorm';
import { IUserSubscriptionRepository } from '../interfaces/user-subscription-repository.interface';
import { UserSubscriptionEntity } from '../entities/user-subscription.entity';
import { Repository } from 'typeorm';

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
}
