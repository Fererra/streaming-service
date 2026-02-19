import { PaymentGatewayProvider } from '../../modules/payment/enums/payment-gateway-provider.enum';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('user_gateway_customers')
export class UserGatewayCustomerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: PaymentGatewayProvider })
  gateway: PaymentGatewayProvider;

  @Column({ name: 'external_customer_id', type: 'varchar', length: 255 })
  externalCustomerId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => UserEntity, (user) => user.gatewayCustomers, {
    nullable: false,
  })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
