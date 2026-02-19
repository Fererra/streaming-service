import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { PaymentStatus } from '../../modules/payment/enums/payment-status.enum';
import { PaymentGatewayProvider } from '../../modules/payment/enums/payment-gateway-provider.enum';

@Entity('payments')
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'external_payment_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  externalPaymentId: string | null;

  @Column({
    name: 'external_session_id',
    type: 'varchar',
    length: 255,
    nullable: true,
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

  @Column({ type: 'decimal', precision: 10, scale: 2 })
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
  metadata: Record<string, unknown> | null;

  @Column({ name: 'paid_at', type: 'timestamp with time zone', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => UserEntity, (user) => user.payments, {
    nullable: false,
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
