import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { SubscriptionPlanEntity } from './subscription-plan.entity';
import { SubscriptionOfferGatewayPriceEntity } from './gateway-price.entity';
import { OfferStatus } from '../../modules/subscription/enums/status.enum';

@Entity('subscription_offers')
@Unique(['subscriptionPlan', 'durationMonths'])
export class SubscriptionOfferEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'duration_months', type: 'int' })
  @Check('duration_months > 0')
  durationMonths: number;

  @Column({ type: 'int' })
  @Check('price >= 0')
  price: number;

  @Column({
    type: 'enum',
    enum: OfferStatus,
    default: OfferStatus.INACTIVE,
  })
  status: OfferStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => SubscriptionPlanEntity, (plan) => plan.offers, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'subscription_plan_id' })
  subscriptionPlan: SubscriptionPlanEntity;

  @OneToMany(() => SubscriptionOfferGatewayPriceEntity, (price) => price.offer)
  gatewayPrices: SubscriptionOfferGatewayPriceEntity[];
}
