import { PaymentGatewayProvider } from '../enums/payment-gateway-provider.enum';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('subscription_offer_gateway_prices')
export class SubscriptionOfferGatewayPriceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: PaymentGatewayProvider })
  gateway: PaymentGatewayProvider;

  @Column({ name: 'subscription_offer_id', type: 'uuid' })
  subscriptionOfferId: string;

  @Column({ name: 'external_price_id', type: 'varchar', length: 255 })
  externalPriceId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
