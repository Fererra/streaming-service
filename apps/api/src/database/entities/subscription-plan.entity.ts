import {
  Entity,
  Column,
  OneToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SubscriptionOfferEntity } from './subscription-offer.entity';
import { SubscriptionPlanGatewayProductEntity } from './gateway-product.entity';

@Entity('subscription_plans')
export class SubscriptionPlanEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'isActive', type: 'boolean', default: false })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => SubscriptionOfferEntity, (offer) => offer.subscriptionPlan)
  offers: SubscriptionOfferEntity[];

  @OneToMany(
    () => SubscriptionPlanGatewayProductEntity,
    (product) => product.plan,
  )
  gatewayProducts: SubscriptionPlanGatewayProductEntity[];
}
