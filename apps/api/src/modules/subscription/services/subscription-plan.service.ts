import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import type { ISubscriptionPlanRepository } from '../../../database/repositories/interfaces/subscription-plan-repository.interface';
import { SUBSCRIPTION_PLAN_REPOSITORY } from '../../../database/repositories/tokens/repository.tokens';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import { Money } from '../helper/money';
import { SubscriptionPlanEntity } from '../../../database/entities/subscription-plan.entity';
import { type IPaymentQueueService, PAYMENT_QUEUE_SERVICE } from '@app/payment';
import { PlanStatus } from '../enums/status.enum';

@Injectable()
export class SubscriptionPlanService {
  constructor(
    @Inject(SUBSCRIPTION_PLAN_REPOSITORY)
    private readonly subscriptionPlanRepository: ISubscriptionPlanRepository,
    @Inject(PAYMENT_QUEUE_SERVICE)
    private readonly paymentQueueService: IPaymentQueueService,
  ) {}

  async findAllWithOffersForAdmin() {
    const plans = await this.subscriptionPlanRepository.findAllWithOffers();

    return this.normalizeSubscriptionPlans(plans);
  }

  async findAllWithOffersForUser() {
    const plans = await this.subscriptionPlanRepository.findActiveWithOffers();

    return this.normalizeSubscriptionPlans(plans);
  }

  private normalizeSubscriptionPlans(plans: SubscriptionPlanEntity[]) {
    return plans.map((plan) => ({
      ...plan,
      offers: plan.offers.map((o) => ({
        ...o,
        price: Money.fromCents(o.price).toString(),
      })),
    }));
  }

  async create(createSubscriptionDto: CreateSubscriptionDto) {
    const { name, description } = createSubscriptionDto;

    const isSubscriptionExist = await this.subscriptionPlanRepository.existsBy({
      name,
    });

    if (isSubscriptionExist) {
      throw new ConflictException(
        `Subscription with name ${name} already exists`,
      );
    }

    const plan = await this.subscriptionPlanRepository.save({
      name,
      description,
    });

    await this.paymentQueueService.dispatchCommand('command.syncPlan', {
      planId: plan.id,
    });
  }

  async update(id: string, updateSubscriptionDto: UpdateSubscriptionDto) {
    if (updateSubscriptionDto.name) {
      const isSubscriptionExist =
        await this.subscriptionPlanRepository.existsBy({
          id,
          name: updateSubscriptionDto.name,
        });

      if (isSubscriptionExist) {
        throw new ConflictException(
          `Subscription with name ${updateSubscriptionDto.name} already exists`,
        );
      }
    }

    await this.paymentQueueService.dispatchCommand('command.updatePlan', {
      planId: id,
      updates: {
        name: updateSubscriptionDto.name,
        description: updateSubscriptionDto.description,
      },
    });
  }

  async activatePlan(id: string) {
    const affected = await this.subscriptionPlanRepository.updateStatus(
      id,
      PlanStatus.ACTIVATING,
    );

    if (affected === 0) {
      throw new NotFoundException(`Subscription plan not found`);
    }

    await this.paymentQueueService.dispatchCommand('command.activatePlan', {
      planId: id,
    });
  }

  async deactivatePlan(id: string) {
    const affected = await this.subscriptionPlanRepository.updateStatus(
      id,
      PlanStatus.DEACTIVATING,
    );

    if (affected === 0) {
      throw new NotFoundException(`Subscription plan not found`);
    }

    await this.paymentQueueService.dispatchCommand('command.deactivatePlan', {
      planId: id,
    });
  }
}
