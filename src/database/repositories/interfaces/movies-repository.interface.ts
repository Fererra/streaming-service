import { MovieCreditEntity } from 'src/database/entities/movie-credit.entity';
import { MovieEntity } from 'src/database/entities/movie.entity';

export interface IMoviesRepository {
  existsBy(criteria: Partial<MovieEntity>): Promise<boolean>;
  findPosterPathById(id: string): Promise<string | null>;
  save(
    movieData: Partial<MovieEntity>,
    credits: Partial<MovieCreditEntity>[],
  ): Promise<MovieEntity>;
  update(id: string, data: Partial<MovieEntity>): Promise<void>;
}
