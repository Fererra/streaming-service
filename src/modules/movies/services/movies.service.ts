import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GenresService } from '../../reference/genres/genres.service';
import { CountryService } from '../../reference/country/country.service';
import { CreateMovieDto } from '../dto/create-movie.dto';
import { CreditsService } from '../../reference/credits/credits.service';
import { PersonsService } from '../../persons/persons.service';
import { MOVIES_REPOSITORY } from 'src/database/repositories/tokens/repository.tokens';
import type { IMoviesRepository } from 'src/database/repositories/interfaces/movies-repository.interface';
import { UpdateMovieDto } from '../dto/update-movie.dto';
import { buildPaginationResponse } from 'src/common/utils/pagination.util';
import { PaginationOptions } from 'src/common/@types/pagination.types';
import { MovieDetailsDto } from '../dto/movie-response.dto';
import { MovieMapper } from '../mappers/movie.mapper';
import { CreditEntityFactory } from '../factories/credit-entity.factory';

@Injectable()
export class MoviesService {
  constructor(
    @Inject(MOVIES_REPOSITORY)
    private readonly moviesRepository: IMoviesRepository,
    private readonly genresService: GenresService,
    private readonly countryService: CountryService,
    private readonly creditsService: CreditsService,
    private readonly personsService: PersonsService,
    private readonly movieMapper: MovieMapper,
    private readonly creditEntityFactory: CreditEntityFactory,
  ) {}

  async findAll(paginationOptions: PaginationOptions) {
    const [movies, total] =
      await this.moviesRepository.findAll(paginationOptions);

    return buildPaginationResponse(movies, total, paginationOptions);
  }

  async searchMovies(title: string, paginationOptions: PaginationOptions) {
    const [movies, total] = await this.moviesRepository.searchMovies(
      title,
      paginationOptions,
    );

    return buildPaginationResponse(movies, total, paginationOptions);
  }

  async getMovieById(id: string): Promise<MovieDetailsDto> {
    const movie = await this.moviesRepository.findById(id);

    if (!movie) {
      throw new NotFoundException('Movie does not exist.');
    }

    return this.movieMapper.toMovieDetailsDto(movie);
  }

  async create(createMovieDto: CreateMovieDto) {
    const {
      credits = [],
      genreIds = [],
      countryCodes = [],
      ...movieData
    } = createMovieDto;

    const isExist = await this.moviesRepository.existsBy({
      title: movieData.title,
      releaseYear: movieData.releaseYear,
    });

    if (isExist) {
      throw new ConflictException(
        `Movie "${movieData.title}" (${movieData.releaseYear}) already exists.`,
      );
    }

    await Promise.all([
      this.genresService.validateExists(genreIds),
      this.countryService.validateExists(countryCodes),
      this.creditsService.validateExists(
        this.creditEntityFactory.extractUniqueRoleIds(credits),
      ),
      this.personsService.validateExists(
        this.creditEntityFactory.extractUniquePersonIds(credits),
      ),
    ]);

    const creditEntities = this.creditEntityFactory.createFromDto(credits);

    return this.moviesRepository.save(
      movieData,
      creditEntities,
      genreIds,
      countryCodes,
    );
  }

  async update(id: string, updateMovieDto: UpdateMovieDto) {
    const movie = await this.moviesRepository.findExistingMovieById(id);

    if (!movie) {
      throw new NotFoundException(`Movie does not exist.`);
    }

    const title = updateMovieDto.title ?? movie.title;
    const releaseYear = updateMovieDto.releaseYear ?? movie.releaseYear;

    if (updateMovieDto.title || updateMovieDto.releaseYear) {
      const isTaken = await this.moviesRepository.existsBy({
        title,
        releaseYear,
      });

      if (isTaken) {
        throw new ConflictException(
          `Movie "${title}" (${releaseYear}) already exists.`,
        );
      }
    }

    await this.moviesRepository.update(id, updateMovieDto);
  }

  async updateCountries(id: string, countryCodes: string[]) {
    await Promise.all([
      this.checkMovieExists(id),
      this.countryService.validateExists(countryCodes),
    ]);

    await this.moviesRepository.updateCountries(id, countryCodes);
  }

  async updateGenres(id: string, genreIds: string[]) {
    await Promise.all([
      this.checkMovieExists(id),
      this.genresService.validateExists(genreIds),
    ]);

    await this.moviesRepository.updateGenres(id, genreIds);
  }

  async delete(id: string) {
    await this.checkMovieExists(id);

    const affected = await this.moviesRepository.delete(id);

    if (affected === 0) {
      throw new NotFoundException(`Movie does not exist.`);
    }
  }

  private async checkMovieExists(id: string) {
    const movieExists = await this.moviesRepository.existsBy({ id });

    if (!movieExists) {
      throw new NotFoundException(`Movie does not exist.`);
    }
  }
}
