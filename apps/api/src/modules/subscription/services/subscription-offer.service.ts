import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOfferDto } from '../dto/create-subscription.dto';
import { OfferEntityFactory } from '../factories/offer-entity.factory';
import { SubscriptionOfferEntity } from '../../../database/entities/subscription-offer.entity';
import {
  SUBSCRIPTION_OFFER_REPOSITORY,
  SUBSCRIPTION_PLAN_REPOSITORY,
} from '../../../database/repositories/tokens/repository.tokens';
import type { ISubscriptionPlanRepository } from '../../../database/repositories/interfaces/subscription-plan-repository.interface';
import type { ISubscriptionOfferRepository } from '../../../database/repositories/interfaces/subscription-offer-repository.interface';
import { PaymentService } from '../../payment/payment.service';
import { Money } from '../helper/money';

@Injectable()
export class SubscriptionOfferService {
  constructor(
    @Inject(SUBSCRIPTION_PLAN_REPOSITORY)
    private readonly subscriptionPlanRepository: ISubscriptionPlanRepository,
    @Inject(SUBSCRIPTION_OFFER_REPOSITORY)
    private readonly subscriptionOfferRepository: ISubscriptionOfferRepository,
    private readonly offerEntityFactory: OfferEntityFactory,
    private readonly paymentService: PaymentService,
  ) {}

  async createOffers(
    planId: string,
    createOffersDto: CreateOfferDto[],
  ): Promise<SubscriptionOfferEntity[]> {
    const plan = await this.subscriptionPlanRepository.findById(planId);

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    const normalizedOffers = createOffersDto.map((o) => ({
      ...o,
      price: Money.fromMajor(o.price).value,
    }));

    const offers = this.offerEntityFactory.createFromDto(
      normalizedOffers,
      plan.id,
    );
    await this.validateOffersUniqueness(plan.id, offers);
    const savedOffers = await this.subscriptionOfferRepository.save(offers);

    // що якщо в процесі синку трапиться помилка? Чи треба буде відкотити всі успішні синки назад?
    await Promise.all(
      savedOffers.map((offer) => {
        offer.subscriptionPlan = plan;
        return this.paymentService.syncOfferToGateway(offer);
      }),
    );

    const offerIds = savedOffers.map((o) => o.id);
    await this.subscriptionOfferRepository.activateOffersByIds(offerIds);

    return savedOffers;
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

  async deactivateOffer(planId: string, offerId: string) {
    const affected = await this.subscriptionOfferRepository.deactivateOffer(
      offerId,
      planId,
    );

    if (affected === 0) {
      throw new NotFoundException('Offer not found');
    }
  }
}
