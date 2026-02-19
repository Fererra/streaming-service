import { MovieCreditEntity } from '../../entities/movie-credit.entity';
import { UpdateMovieCreditDto } from '../../../modules/movies/dto/update-movie.dto';

export interface IMovieCreditsRepository {
  getMovieCredits(movieId: string): Promise<MovieCreditEntity[]>;
  addCredits(credits: Partial<MovieCreditEntity>[]): Promise<void>;
  update(
    creditId: string,
    movieId: string,
    data: UpdateMovieCreditDto,
  ): Promise<number>;
  delete(creditId: string, movieId: string): Promise<number>;
}
