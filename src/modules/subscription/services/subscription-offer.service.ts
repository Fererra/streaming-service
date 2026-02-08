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
import { UpdateOfferDto } from '../dto/update-subscription.dto';

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
  ): Promise<void> {
    const offersDurations = offers.map((offer) => offer.durationMonths!);

    const existingOffers =
      await this.subscriptionOfferRepository.findOffersByPlanAndDurations(
        planId,
        offersDurations,
      );

    if (existingOffers.length > 0) {
      const existingDurations = existingOffers
        .map((offer) => offer.durationMonths)
        .sort((a, b) => a - b);

      throw new ConflictException(
        `Offer(s) with duration ${existingDurations.join(', ')} month(s) already exist for this plan`,
      );
    }
  }

  async update(
    planId: string,
    offerId: string,
    updateOfferDto: UpdateOfferDto,
  ) {
    if (updateOfferDto.durationMonths) {
      await this.validateDurationUniquenessForUpdate(
        planId,
        updateOfferDto.durationMonths,
      );
    }

    const updatedCount = await this.subscriptionOfferRepository.update(
      offerId,
      planId,
      updateOfferDto,
    );

    if (updatedCount === 0) {
      throw new NotFoundException('Offer not found');
    }
  }

  private async validateDurationUniquenessForUpdate(
    planId: string,
    newDuration: number,
  ): Promise<void> {
    const existingOffer =
      await this.subscriptionOfferRepository.existsByDurationAndPlan(
        planId,
        newDuration,
      );

    if (existingOffer) {
      throw new ConflictException(
        `An offer with duration ${newDuration} month(s) already exists for this plan`,
      );
    }
  }

  async activateOffer(planId: string, offerId: string) {
    const offer = await this.subscriptionOfferRepository.findByIdAndPlanId(
      offerId,
      planId,
      { withDeleted: true },
    );

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    await this.subscriptionOfferRepository.activateOffer(offer);
  }

  async deactivateOffer(planId: string, offerId: string) {
    const offer = await this.subscriptionOfferRepository.findByIdAndPlanId(
      offerId,
      planId,
    );

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    await this.subscriptionOfferRepository.deactivateOffer(offer);
  }
}
