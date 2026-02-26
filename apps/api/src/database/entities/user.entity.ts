import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RefreshTokenEntity } from './refresh-token.entity';
import { UserRole } from '../../modules/users/user-role.enum';
import { CountryEntity } from './country.entity';
import { UserGatewayCustomerEntity } from './gateway-customer.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'first_name', type: 'varchar', length: 255 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 255 })
  lastName: string;

  @Column({ name: 'avatar_path', type: 'varchar', length: 255, nullable: true })
  avatarPath: string | null;

  @Check('"date_of_birth" <= CURRENT_DATE')
  @Column({ name: 'date_of_birth', type: 'date' })
  dateOfBirth: Date;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
    enumName: 'user_role',
  })
  role: UserRole;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @ManyToOne(() => CountryEntity, (country) => country.users, {
    nullable: false,
  })
  @JoinColumn({ name: 'country_code' })
  country: CountryEntity;

  @OneToMany(() => RefreshTokenEntity, (refreshToken) => refreshToken.user)
  refreshTokens: RefreshTokenEntity[];

  @OneToMany(
    () => UserGatewayCustomerEntity,
    (gatewayCustomer) => gatewayCustomer.user,
  )
  gatewayCustomers: UserGatewayCustomerEntity[];
}
