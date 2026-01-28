import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { MovieEntity } from './movie.entity';
import { PersonEntity } from './person.entity';
import { CreditRoleEntity } from './credit-role.entity';

@Entity('movie_credits')
export class MovieCreditEntity {
  @PrimaryColumn({ name: 'movie_id' })
  movieId: string;

  @PrimaryColumn({ name: 'person_id' })
  personId: string;

  @PrimaryColumn({ name: 'role_id' })
  roleId: string;

  @Column({
    name: 'character_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  characterName: string | null;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  @Check('"order_index" >= 0')
  orderIndex: number;

  @ManyToOne(() => MovieEntity, (movie) => movie.credits, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'movie_id' })
  movie: MovieEntity;

  @ManyToOne(() => PersonEntity, (person) => person.movieCredits, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'person_id' })
  person: PersonEntity;

  @ManyToOne(() => CreditRoleEntity, (role) => role.movieCredits, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'role_id' })
  role: CreditRoleEntity;
}
