import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { SubscriptionPlanEntity } from './subscription-plan.entity';

@Entity('subscription_offers')
@Unique(['subscriptionPlan', 'durationMonths'])
export class SubscriptionOfferEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'duration_months', type: 'int' })
  @Check('duration_months > 0')
  durationMonths: number;

  @Column({ name: 'price', type: 'decimal', precision: 5, scale: 2 })
  @Check('price >= 0')
  price: number;

  @ManyToOne(() => SubscriptionPlanEntity, (plan) => plan.offers, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'subscription_plan_id' })
  subscriptionPlan: SubscriptionPlanEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
