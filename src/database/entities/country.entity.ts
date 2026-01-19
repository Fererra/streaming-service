import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('countries')
export class CountryEntity {
  @PrimaryColumn({ type: 'char', length: 2 })
  code: string;

  @Column({ name: 'country_name', type: 'varchar', length: 56 })
  countryName: string;

  @OneToMany(() => UserEntity, (user) => user.country)
  users: UserEntity[];
}
