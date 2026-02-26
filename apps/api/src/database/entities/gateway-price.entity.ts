import { PaymentGatewayProvider } from '@app/payment';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { SubscriptionOfferEntity } from './subscription-offer.entity';

@Entity('subscription_offer_gateway_prices')
export class SubscriptionOfferGatewayPriceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: PaymentGatewayProvider })
  gateway: PaymentGatewayProvider;

  @Column({ name: 'external_price_id', type: 'varchar', length: 255 })
  externalPriceId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => SubscriptionOfferEntity, (offer) => offer.gatewayPrices, {
    nullable: false,
  })
  @JoinColumn({ name: 'subscription_offer_id' })
  offer: SubscriptionOfferEntity;
}
