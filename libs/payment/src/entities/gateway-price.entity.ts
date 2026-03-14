import { PaymentGatewayProvider } from '../enums/payment-gateway-provider.enum';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

@Entity('subscription_offer_gateway_prices')
@Unique('uq_offer_id_gateway', ['subscriptionOfferId', 'gateway'])
export class SubscriptionOfferGatewayPriceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: PaymentGatewayProvider,
    enumName: 'payment_gateway_provider',
  })
  gateway: PaymentGatewayProvider;

  @Column({ name: 'subscription_offer_id', type: 'uuid' })
  subscriptionOfferId: string;

  @Column({ name: 'external_price_id', type: 'varchar', length: 255 })
  externalPriceId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
