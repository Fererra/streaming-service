import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentGatewayProvider } from '../enums/payment-gateway-provider.enum';
import { PaymentMetadata } from '../interfaces/payment-events.interface';

@Entity('payments')
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'user_id',
    type: 'uuid',
  })
  userId: string;

  @Column({
    name: 'user_subscription_id',
    type: 'uuid',
    nullable: true,
  })
  userSubscriptionId: string;

  @Column({
    name: 'subscription_offer_id',
    type: 'uuid',
  })
  subscriptionOfferId: string;

  @Column({
    name: 'external_invoice_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @Index('idx_payments_external_invoice_id', {
    where: '"external_invoice_id" IS NOT NULL',
  })
  externalInvoiceId: string | null;

  @Column({
    name: 'external_session_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @Index('idx_payments_external_session_id', {
    where: '"external_session_id" IS NOT NULL',
  })
  externalSessionId: string | null;

  @Column({
    name: 'billing_reason',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  billingReason: string | null;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
    enumName: 'payment_status',
  })
  status: PaymentStatus;

  @Column({ type: 'integer' })
  @Check(`"amount" >= 0`)
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({
    type: 'enum',
    enum: PaymentGatewayProvider,
    enumName: 'payment_gateway_provider',
  })
  gateway: PaymentGatewayProvider;

  @Column({ type: 'jsonb', nullable: true })
  metadata: PaymentMetadata | null;

  @Column({ name: 'paid_at', type: 'timestamp with time zone', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
