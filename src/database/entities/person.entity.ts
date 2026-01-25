import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CountryEntity } from './country.entity';

@Entity('persons')
export class PersonEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'first_name', type: 'varchar', length: 255 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 255 })
  lastName: string;

  @Column({ name: 'photo_path', type: 'varchar', length: 255, nullable: true })
  photoPath: string | null;

  @Check('"date_of_birth" <= CURRENT_DATE')
  @Column({ name: 'date_of_birth', type: 'date' })
  dateOfBirth: Date;

  @Column({ type: 'text', nullable: true })
  biography: string | null;

  @ManyToOne(() => CountryEntity, (country) => country.persons, {
    nullable: false,
  })
  @JoinColumn({ name: 'country_code' })
  country: CountryEntity;
}
