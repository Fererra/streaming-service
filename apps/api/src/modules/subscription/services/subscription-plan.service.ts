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
  SubscriptionOfferEntity,
  SubscriptionPlanEntity,
} from '@app/subscription';
import { SubscriptionOfferService } from './subscription-offer.service';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';

@Injectable()
export class SubscriptionPlanService {
  constructor(
    @Inject(SUBSCRIPTION_PLAN_REPOSITORY)
    private readonly subscriptionPlanRepository: ISubscriptionPlanRepository,
    @Inject(PAYMENT_QUEUE_SERVICE)
    private readonly paymentQueueService: IPaymentQueueService,
    private readonly subscriptionOfferService: SubscriptionOfferService,
    private readonly dataSource: DataSource,
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

    const plan = await this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(SubscriptionPlanEntity, {
        name,
        description,
      });

      if (!offers || offers.length === 0) return saved;

      const draftOffers = await this.subscriptionOfferService.buildDraftOffers(
        saved.id,
        offers,
      );

      await manager.save(SubscriptionOfferEntity, draftOffers);

      await manager.update(
        SubscriptionPlanEntity,
        { id: saved.id },
        { status: PlanStatus.ACTIVATING },
      );

      return saved;
    });

    if (!offers || offers.length === 0) return;

    await this.paymentQueueService.dispatchCommand('command.syncPlan', {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      idempotencyKey: `sync-plan-${plan.id}-${randomUUID()}`,
    });
  }

  async update(id: string, dto: UpdateSubscriptionDto) {
    await this.dataSource.transaction(async (manager) => {
      const plan = await manager
        .createQueryBuilder(SubscriptionPlanEntity, 'plan')
        .setLock('pessimistic_write')
        .setOnLocked('nowait')
        .where('plan.id = :id', { id })
        .getOne();

      if (!plan) {
        throw new NotFoundException(`Subscription plan ${id} not found`);
      }

      if (plan.status !== PlanStatus.ACTIVE) {
        throw new ConflictException('Plan is not active');
      }

      if (dto.name) {
        const exists = await manager.exists(SubscriptionPlanEntity, {
          where: { name: dto.name },
        });

        if (exists) {
          throw new ConflictException(
            `Subscription with name ${dto.name} already exists`,
          );
        }
      }

      const updates = {
        name: dto.name ?? plan.name,
        description: dto.description ?? plan.description,
      };

      await manager.update(SubscriptionPlanEntity, { id: plan.id }, updates);
    });

    await this.paymentQueueService.dispatchCommand('command.updatePlan', {
      planId: id,
      updates: {
        name: dto.name,
        description: dto.description,
      },
      idempotencyKey: `update-plan-${id}-${randomUUID()}`,
    });
  }

  async activatePlan(id: string) {
    await this.dataSource.transaction(async (manager) => {
      const plan = await manager
        .createQueryBuilder(SubscriptionPlanEntity, 'plan')
        .setLock('pessimistic_write')
        .setOnLocked('nowait')
        .where('plan.id = :id', { id })
        .getOne();

      if (!plan) {
        throw new NotFoundException(`Subscription plan not found`);
      }

      if (plan.status !== PlanStatus.DEACTIVATED) {
        throw new ConflictException(
          `Plan can only be activated when deactivated`,
        );
      }

      await manager.update(
        SubscriptionPlanEntity,
        { id: plan.id },
        {
          status: PlanStatus.ACTIVATING,
        },
      );
    });

    await this.paymentQueueService.dispatchCommand('command.activatePlan', {
      planId: id,
      idempotencyKey: `activate-plan-${id}-${randomUUID()}`,
    });
  }

  async deactivatePlan(id: string) {
    await this.dataSource.transaction(async (manager) => {
      const plan = await manager
        .createQueryBuilder(SubscriptionPlanEntity, 'plan')
        .setLock('pessimistic_write')
        .setOnLocked('nowait')
        .where('plan.id = :id', { id })
        .getOne();

      if (!plan) {
        throw new NotFoundException(`Subscription plan not found`);
      }

      if (plan.status !== PlanStatus.ACTIVE) {
        throw new ConflictException(`Plan can only be deactivated when active`);
      }

      await manager.update(
        SubscriptionPlanEntity,
        { id: plan.id },
        {
          status: PlanStatus.DEACTIVATING,
        },
      );
    });

    await this.paymentQueueService.dispatchCommand('command.deactivatePlan', {
      planId: id,
      idempotencyKey: `deactivate-plan-${id}-${randomUUID()}`,
    });
  }
}
