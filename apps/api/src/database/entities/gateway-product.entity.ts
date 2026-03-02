import { PaymentGatewayProvider } from '@app/payment';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SubscriptionPlanEntity } from './subscription-plan.entity';

@Entity('subscription_plan_gateway_products')
export class SubscriptionPlanGatewayProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: PaymentGatewayProvider })
  gateway: PaymentGatewayProvider;

  @Column({ name: 'external_product_id', type: 'varchar', length: 255 })
  externalProductId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => SubscriptionPlanEntity, (offer) => offer.gatewayProducts, {
    nullable: false,
  })
  @JoinColumn({ name: 'subscription_plan_id' })
  plan: SubscriptionPlanEntity;
}
