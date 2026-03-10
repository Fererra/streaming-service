import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { PaymentGatewayProvider } from '../enums/payment-gateway-provider.enum';

@Entity('user_gateway_customers')
export class UserGatewayCustomerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: PaymentGatewayProvider,
    enumName: 'payment_gateway_provider',
  })
  gateway: PaymentGatewayProvider;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'external_customer_id', type: 'varchar', length: 255 })
  externalCustomerId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
