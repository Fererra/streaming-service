import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOfferDto } from '../dto/create-subscription.dto';
import { OfferEntityFactory } from '../factories/offer-entity.factory';
import { SubscriptionOfferEntity } from 'src/database/entities/subscription-offer.entity';
import {
  SUBSCRIPTION_OFFER_REPOSITORY,
  SUBSCRIPTION_PLAN_REPOSITORY,
} from 'src/database/repositories/tokens/repository.tokens';
import type { ISubscriptionPlanRepository } from 'src/database/repositories/interfaces/subscription-plan-repository.interface';
import type { ISubscriptionOfferRepository } from 'src/database/repositories/interfaces/subscription-offer-repository.interface';

@Injectable()
export class SubscriptionOfferService {
  constructor(
    @Inject(SUBSCRIPTION_PLAN_REPOSITORY)
    private readonly subscriptionPlanRepository: ISubscriptionPlanRepository,
    @Inject(SUBSCRIPTION_OFFER_REPOSITORY)
    private readonly subscriptionOfferRepository: ISubscriptionOfferRepository,
    private readonly offerEntityFactory: OfferEntityFactory,
  ) {}

  async attachOffersToPlan(id: string, createOffersDto: CreateOfferDto[]) {
    const isPlanExist = await this.subscriptionPlanRepository.existsBy({ id });

    if (!isPlanExist) {
      throw new NotFoundException('Subscription plan not found');
    }

    const offers = this.offerEntityFactory.createFromDto(createOffersDto, id);
    await this.validateOffersUniqueness(id, offers);

    await this.subscriptionOfferRepository.save(offers);
  }

  private async validateOffersUniqueness(
    planId: string,
    offers: Partial<SubscriptionOfferEntity>[],
  ) {
    const offersDurations = offers.map((offer) => offer.durationMonths!);

    const existingOffers =
      await this.subscriptionOfferRepository.findOffersByPlanAndDurations(
        planId,
        offersDurations,
      );

    const existingDurations = new Set(
      existingOffers.map((offer) => offer.durationMonths),
    );

    const duplicates = offersDurations.filter((duration) =>
      existingDurations.has(duration),
    );

    if (duplicates.length > 0) {
      throw new ConflictException(
        `Offer(s) with duration ${duplicates.join(', ')} month(s) already exist for this plan`,
      );
    }
  }
}
