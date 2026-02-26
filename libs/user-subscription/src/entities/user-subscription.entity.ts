import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { SubscriptionStatus } from '../enums/subscription-status.enum';

@Entity('user_subscriptions')
export class UserSubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'user_id',
    type: 'uuid',
  })
  userId: string;

  @Column({
    name: 'subscription_offer_id',
    type: 'uuid',
  })
  subscriptionOfferId: string;

  @Column({
    name: 'external_subscription_id',
    type: 'varchar',
    length: 255,
  })
  externalSubscriptionId: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: SubscriptionStatus,
    enumName: 'subscription_status',
  })
  status: SubscriptionStatus;

  @Column({
    name: 'current_period_start',
    type: 'date',
  })
  currentPeriodStart: Date;

  @Column({
    name: 'current_period_end',
    type: 'date',
  })
  currentPeriodEnd: Date;

  @Column({
    name: 'canceled_at',
    type: 'timestamp',
    nullable: true,
  })
  canceledAt: Date | null;
}
