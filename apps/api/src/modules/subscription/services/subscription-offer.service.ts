import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOfferDto } from '../dto/create-subscription.dto';
import { OfferEntityFactory } from '../factories/offer-entity.factory';
import { Money } from '../helper/money';
import { type IPaymentQueueService, PAYMENT_QUEUE_SERVICE } from '@app/payment';
import {
  SUBSCRIPTION_PLAN_REPOSITORY,
  type ISubscriptionPlanRepository,
  SUBSCRIPTION_OFFER_REPOSITORY,
  type ISubscriptionOfferRepository,
  SubscriptionOfferEntity,
  OfferStatus,
} from '@app/subscription';
import { DataSource } from 'typeorm';

@Injectable()
export class SubscriptionOfferService {
  constructor(
    @Inject(SUBSCRIPTION_PLAN_REPOSITORY)
    private readonly subscriptionPlanRepository: ISubscriptionPlanRepository,
    @Inject(SUBSCRIPTION_OFFER_REPOSITORY)
    private readonly subscriptionOfferRepository: ISubscriptionOfferRepository,
    private readonly offerEntityFactory: OfferEntityFactory,
    @Inject(PAYMENT_QUEUE_SERVICE)
    private readonly paymentQueueService: IPaymentQueueService,
    private readonly dataSource: DataSource,
  ) {}

  findPriceById(offerId: string): Promise<number | null> {
    return this.subscriptionOfferRepository.findPriceById(offerId);
  }

  async createOffersAndSync(
    planId: string,
    createOffersDto: CreateOfferDto[],
  ): Promise<void> {
    const savedOffers = await this.createDraftOffers(planId, createOffersDto);

    const jobsToCreate = savedOffers.map((offer) => ({
      name: 'command.syncOffer' as const,
      data: {
        id: offer.id,
        price: offer.price,
        durationMonths: offer.durationMonths,
        subscriptionPlanId: planId,
      },
    }));

    if (jobsToCreate.length > 0) {
      await this.paymentQueueService.dispatchCommandsBulk(jobsToCreate);
    }
  }

  async createDraftOffers(
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

    return this.subscriptionOfferRepository.save(offers);
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
    await this.dataSource.transaction(async (manager) => {
      const offer = await manager
        .createQueryBuilder(SubscriptionOfferEntity, 'offer')
        .setLock('pessimistic_write')
        .setOnLocked('nowait')
        .where('offer.id = :id', { id: offerId })
        .andWhere('offer.subscriptionPlan = :planId', { planId })
        .getOne();

      if (!offer) {
        throw new NotFoundException(`Subscription offer not found`);
      }

      if (
        offer.status === OfferStatus.DEACTIVATED ||
        offer.status === OfferStatus.DEACTIVATING
      ) {
        throw new ConflictException(
          `Offer is already deactivated or being deactivated`,
        );
      }

      await manager.update(
        SubscriptionOfferEntity,
        { id: offerId },
        {
          status: OfferStatus.DEACTIVATING,
        },
      );
    });

    await this.paymentQueueService.dispatchCommand('command.deactivateOffer', {
      offerId,
    });
  }
}
