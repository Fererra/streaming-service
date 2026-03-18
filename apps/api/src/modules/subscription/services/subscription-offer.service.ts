import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOfferDto } from '../dto/create-subscription.dto';
import { OfferEntityFactory } from '../factories/offer-entity.factory';
import { Money } from '../helper/money';
import {
  SUBSCRIPTION_PLAN_REPOSITORY,
  type ISubscriptionPlanRepository,
  SUBSCRIPTION_OFFER_REPOSITORY,
  type ISubscriptionOfferRepository,
  SubscriptionOfferEntity,
  OfferStatus,
  PlanStatus,
} from '@app/subscription';
import { DataSource } from 'typeorm';
import { OutboxEntity } from '@app/outbox';

@Injectable()
export class SubscriptionOfferService {
  constructor(
    @Inject(SUBSCRIPTION_PLAN_REPOSITORY)
    private readonly subscriptionPlanRepository: ISubscriptionPlanRepository,
    @Inject(SUBSCRIPTION_OFFER_REPOSITORY)
    private readonly subscriptionOfferRepository: ISubscriptionOfferRepository,
    private readonly offerEntityFactory: OfferEntityFactory,
    private readonly dataSource: DataSource,
  ) {}

  findPriceById(offerId: string): Promise<number | null> {
    return this.subscriptionOfferRepository.findPriceById(offerId);
  }

  async createOffersAndSync(
    planId: string,
    createOffersDto: CreateOfferDto[],
  ): Promise<void> {
    const plan = await this.subscriptionPlanRepository.findById(planId);

    if (!plan) throw new NotFoundException('Subscription plan not found');

    if (plan.status !== PlanStatus.ACTIVE) {
      throw new BadRequestException(
        'Cannot attach offers to a non-active plan',
      );
    }

    const draftOffers = await this.buildDraftOffers(planId, createOffersDto);

    await this.dataSource.transaction(async (manager) => {
      const savedOffers = await manager.save(
        SubscriptionOfferEntity,
        draftOffers,
      );

      const outboxRecords = savedOffers.map((offer) => ({
        type: 'command.syncOffer' as const,
        payload: {
          id: offer.id,
          price: offer.price,
          durationMonths: offer.durationMonths,
          subscriptionPlanId: planId,
          idempotencyKey: `sync-offer-${offer.id}`,
        },
      }));

      await manager.insert(OutboxEntity, outboxRecords);
    });
  }

  async buildDraftOffers(
    planId: string,
    createOffersDto: CreateOfferDto[],
  ): Promise<Partial<SubscriptionOfferEntity>[]> {
    const normalizedOffers = createOffersDto.map((o) => ({
      ...o,
      price: Money.fromMajor(o.price).value,
    }));

    const offers = this.offerEntityFactory.createFromDto(
      normalizedOffers,
      planId,
    );

    await this.validateOffersUniqueness(planId, offers);

    return offers;
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

      if (offer.status !== OfferStatus.ACTIVE) {
        throw new ConflictException(
          `Offer can only be deactivated when active`,
        );
      }

      await manager.update(
        SubscriptionOfferEntity,
        { id: offerId },
        {
          status: OfferStatus.DEACTIVATING,
        },
      );

      await manager.insert(OutboxEntity, {
        type: 'command.deactivateOffer' as const,
        payload: {
          offerId,
          idempotencyKey: `deactivate-offer-${offerId}`,
        },
      });
    });
  }
}
