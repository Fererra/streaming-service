import { PaginationOptions } from 'src/common/@types/pagination.types';
import { MovieCreditEntity } from 'src/database/entities/movie-credit.entity';
import { MovieEntity } from 'src/database/entities/movie.entity';

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
  save(
    movieData: Partial<MovieEntity>,
    credits: Partial<MovieCreditEntity>[],
    genreIds: string[],
    countryCodes: string[],
  ): Promise<MovieEntity>;
  update(id: string, data: Partial<MovieEntity>): Promise<void>;
  updateCountries(id: string, countryCodes: string[]): Promise<void>;
  updateGenres(id: string, genreIds: string[]): Promise<void>;
  delete(id: string): Promise<number>;
}
