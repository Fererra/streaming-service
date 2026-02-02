import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { MovieCreditEntity } from './movie-credit.entity';

@Entity('credit_roles')
export class CreditRoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 50 })
  role: string;

  @OneToMany(() => MovieCreditEntity, (credit) => credit.role)
  movieCredits: MovieCreditEntity[];
}
