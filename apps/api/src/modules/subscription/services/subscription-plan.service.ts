import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import { Money } from '../helper/money';
import { type IPaymentQueueService, PAYMENT_QUEUE_SERVICE } from '@app/payment';
import {
  type ISubscriptionPlanRepository,
  PlanStatus,
  SUBSCRIPTION_PLAN_REPOSITORY,
  SubscriptionPlanEntity,
} from '@app/subscription';
import { SubscriptionOfferService } from './subscription-offer.service';

@Injectable()
export class SubscriptionPlanService {
  constructor(
    @Inject(SUBSCRIPTION_PLAN_REPOSITORY)
    private readonly subscriptionPlanRepository: ISubscriptionPlanRepository,
    @Inject(PAYMENT_QUEUE_SERVICE)
    private readonly paymentQueueService: IPaymentQueueService,
    private readonly subscriptionOfferService: SubscriptionOfferService,
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
    const { name, description, offers } = createSubscriptionDto;

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

    if (!offers || offers.length === 0) {
      return;
    }

    await this.subscriptionOfferService.createDraftOffers(plan.id, offers);

    await this.paymentQueueService.dispatchCommand('command.syncPlan', {
      id: plan.id,
      name: plan.name,
      description: plan.description,
    });
  }

  async update(id: string, updateSubscriptionDto: UpdateSubscriptionDto) {
    if (updateSubscriptionDto.name) {
      const isSubscriptionExist =
        await this.subscriptionPlanRepository.existsBy({
          name: updateSubscriptionDto.name,
        });

      if (isSubscriptionExist) {
        throw new ConflictException(
          `Subscription with name ${updateSubscriptionDto.name} already exists`,
        );
      }
    }

    const affected = await this.subscriptionPlanRepository.update(id, {
      name: updateSubscriptionDto.name,
      description: updateSubscriptionDto.description,
    });

    if (affected === 0) {
      throw new NotFoundException(`Subscription plan with id ${id} not found`);
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
    const plan = await this.subscriptionPlanRepository.findById(id);

    if (!plan) {
      throw new NotFoundException(`Subscription plan not found`);
    }

    if (
      plan.status === PlanStatus.ACTIVE ||
      plan.status === PlanStatus.ACTIVATING
    ) {
      throw new ConflictException(`Plan is already active or being activated`);
    }

    await this.subscriptionPlanRepository.updateStatus(
      id,
      PlanStatus.ACTIVATING,
    );

    await this.paymentQueueService.dispatchCommand('command.activatePlan', {
      planId: id,
    });
  }

  async deactivatePlan(id: string) {
    const plan = await this.subscriptionPlanRepository.findById(id);

    if (!plan) {
      throw new NotFoundException(`Subscription plan not found`);
    }

    if (
      plan.status === PlanStatus.DEACTIVATED ||
      plan.status === PlanStatus.DEACTIVATING
    ) {
      throw new ConflictException(
        `Plan is already deactivated or being deactivated`,
      );
    }

    await this.subscriptionPlanRepository.updateStatus(
      id,
      PlanStatus.DEACTIVATING,
    );

    await this.paymentQueueService.dispatchCommand('command.deactivatePlan', {
      planId: id,
    });
  }
}
