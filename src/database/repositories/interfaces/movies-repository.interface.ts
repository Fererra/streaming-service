import { MovieCreditEntity } from 'src/database/entities/movie-credit.entity';
import { MovieEntity } from 'src/database/entities/movie.entity';

export interface IMoviesRepository {
  existsBy(criteria: { title: string; releaseYear: number }): Promise<boolean>;
  save(
    movieData: Partial<MovieEntity>,
    credits: Partial<MovieCreditEntity>[],
  ): Promise<MovieEntity>;
}
