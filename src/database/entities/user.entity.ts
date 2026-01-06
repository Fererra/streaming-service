import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RefreshTokenEntity } from './refresh-token.entity';
import { UserRoles } from 'src/modules/users/user-roles.enum';
import { CountryEntity } from './country.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'first_name', type: 'varchar', length: 255 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 255 })
  lastName: string;

  @Column({ name: 'date_of_birth', type: 'date' })
  dateOfBirth: Date;

  @Column({
    type: 'enum',
    enum: UserRoles,
    default: UserRoles.USER,
    enumName: 'user_roles',
  })
  role: UserRoles;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @ManyToOne(() => CountryEntity, (country) => country.users)
  @JoinColumn({ name: 'country_code' })
  country: CountryEntity;

  @OneToMany(() => RefreshTokenEntity, (refreshToken) => refreshToken.user)
  refreshTokens: RefreshTokenEntity[];
}
