import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { OfferEntityFactory } from '../factories/offer-entity.factory';
import type { ISubscriptionPlanRepository } from '../../../database/repositories/interfaces/subscription-plan-repository.interface';
import { SUBSCRIPTION_PLAN_REPOSITORY } from '../../../database/repositories/tokens/repository.tokens';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import { SubscriptionOfferService } from './subscription-offer.service';

@Injectable()
export class SubscriptionPlanService {
  constructor(
    @Inject(SUBSCRIPTION_PLAN_REPOSITORY)
    private readonly subscriptionPlanRepository: ISubscriptionPlanRepository,
    private readonly subscriptionOfferService: SubscriptionOfferService,
    private readonly offerEntityFactory: OfferEntityFactory,
  ) {}

  findAllWithOffersForAdmin() {
    return this.subscriptionPlanRepository.findAllWithOffers();
  }

  findAllWithOffersForUser() {
    return this.subscriptionPlanRepository.findActiveWithOffers();
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

    const offers = this.offerEntityFactory.createFromDto(offerDtos);
    const plan = await this.subscriptionPlanRepository.save(
      { name, description },
      offers,
    );

    await Promise.all(
      plan.offers.map((offer) => {
        offer.subscriptionPlan = plan;
        return this.subscriptionOfferService.syncOfferToGateway(offer);
      }),
    );

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
  }

  async activatePlan(id: string) {
    const plan = await this.subscriptionPlanRepository.findById(id, {
      withDeleted: true,
    });

    if (!plan) {
      throw new NotFoundException(`Subscription plan not found`);
    }

    await this.subscriptionPlanRepository.activatePlan(plan);
  }

  async deactivatePlan(id: string) {
    const plan = await this.subscriptionPlanRepository.findById(id);

    if (!plan) {
      throw new NotFoundException(`Subscription plan not found`);
    }

    await this.subscriptionPlanRepository.deactivatePlan(plan);
  }
}
