import { AgeRating } from 'src/modules/movies/age-rating.enum';
import {
  Check,
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { CountryEntity } from './country.entity';
import { GenreEntity } from './genre.entity';
import { MovieCreditEntity } from './movie-credit.entity';

@Entity('movies')
@Unique(['title', 'releaseYear'])
export class MovieEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({
    name: 'poster_path',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  posterPath: string | null;

  @Column({
    name: 'age_rating',
    type: 'enum',
    enum: AgeRating,
  })
  ageRating: AgeRating;

  @Column({ name: 'duration_minutes', type: 'int' })
  @Check('"duration_minutes" > 0')
  durationMinutes: number;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
  @Check('"rating" >= 0 AND "rating" <= 10')
  rating: string | null;

  @Column({ name: 'release_year', type: 'int' })
  releaseYear: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'trailer_path',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  trailerPath: string | null;

  @Column({
    name: 'movie_path',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  moviePath: string | null;

  @ManyToMany(() => CountryEntity, (country) => country.movies)
  @JoinTable({ name: 'movie_countries' })
  countries: CountryEntity[];

  @ManyToMany(() => GenreEntity, (genre) => genre.movies)
  @JoinTable({ name: 'movie_genres' })
  genres: GenreEntity[];

  @OneToMany(() => MovieCreditEntity, (credit) => credit.movie)
  credits: MovieCreditEntity[];
}
