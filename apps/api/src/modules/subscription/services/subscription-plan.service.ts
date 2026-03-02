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
import { SubscriptionOfferService } from './subscription-offer.service';
import { Money } from '../helper/money';
import { SubscriptionPlanEntity } from '../../../database/entities/subscription-plan.entity';
import { PaymentService } from '../../payment/payment.service';

@Injectable()
export class SubscriptionPlanService {
  constructor(
    @Inject(SUBSCRIPTION_PLAN_REPOSITORY)
    private readonly subscriptionPlanRepository: ISubscriptionPlanRepository,
    private readonly subscriptionOfferService: SubscriptionOfferService,
    private readonly paymentService: PaymentService,
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
    const { name, description, offers: offerDtos } = createSubscriptionDto;

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

    await this.paymentService.createProductInGateway(plan);

    await this.subscriptionOfferService.createOffers(plan.id, offerDtos);

    const affected = await this.subscriptionPlanRepository.activatePlan(
      plan.id,
    );

    if (affected === 0) {
      throw new NotFoundException(`Subscription plan not found`);
    }

    return plan;
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

    const affected = await this.subscriptionPlanRepository.update(
      id,
      updateSubscriptionDto,
    );

    if (affected === 0) {
      throw new NotFoundException(`Subscription plan not found`);
    }

    await this.paymentService.updateProductInGateway(id, updateSubscriptionDto);
  }

  async activatePlan(id: string) {
    await this.paymentService.activateProductInGateway(id);

    const affected = await this.subscriptionPlanRepository.activatePlan(id);

    if (affected === 0) {
      throw new NotFoundException(`Subscription plan not found`);
    }
  }

  async deactivatePlan(id: string) {
    await this.paymentService.deactivateProductInGateway(id);

    const affected = await this.subscriptionPlanRepository.deactivatePlan(id);

    if (affected === 0) {
      throw new NotFoundException(`Subscription plan not found`);
    }
  }
}
