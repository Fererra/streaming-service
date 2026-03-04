import { PaymentGatewayProvider } from '../enums/payment-gateway-provider.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('subscription_plan_gateway_products')
export class SubscriptionPlanGatewayProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: PaymentGatewayProvider })
  gateway: PaymentGatewayProvider;

  @Column({ name: 'subscription_plan_id', type: 'uuid' })
  subscriptionPlanId: string;

  @Column({ name: 'external_product_id', type: 'varchar', length: 255 })
  externalProductId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
