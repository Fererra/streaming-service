import { PaginationOptions } from '../../../common/@types/pagination.types';
import { MovieCreditEntity } from '../../entities/movie-credit.entity';
import { MovieEntity } from '../../entities/movie.entity';

export interface IMoviesRepository {
  existsBy(criteria: Partial<MovieEntity>): Promise<boolean>;
  findPosterPathById(id: string): Promise<string | null>;
  findExistingMovieById(id: string): Promise<MovieEntity | null>;
  findAll(
    paginationOptions: PaginationOptions,
  ): Promise<[MovieEntity[], number]>;
  searchMovies(
    title: string,
    paginationOptions: PaginationOptions,
  ): Promise<[MovieEntity[], number]>;
  findById(id: string): Promise<MovieEntity | null>;
  getVideoPathById(id: string): Promise<string | null>;
  save(
    movieData: Partial<MovieEntity>,
    credits: Partial<MovieCreditEntity>[],
    genreIds: string[],
    countryCodes: string[],
  ): Promise<MovieEntity>;
  update(id: string, data: Partial<MovieEntity>): Promise<void>;
  swapPosterPath(
    movieId: string,
    newPosterPath: string,
  ): Promise<string | null>;
  swapTrailerPath(
    movieId: string,
    newTrailerPath: string,
  ): Promise<string | null>;
  swapVideoPath(movieId: string, newVideoPath: string): Promise<string | null>;
  updateCountries(id: string, countryCodes: string[]): Promise<void>;
  updateGenres(id: string, genreIds: string[]): Promise<void>;
  delete(id: string): Promise<number>;
}
