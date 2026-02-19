import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  MOVIE_CREDITS_REPOSITORY,
  MOVIES_REPOSITORY,
} from '../../../database/repositories/tokens/repository.tokens';
import type { IMovieCreditsRepository } from '../../../database/repositories/interfaces/movie-credits-repository.interface';
import type { IMoviesRepository } from '../../../database/repositories/interfaces/movies-repository.interface';
import { CreateCreditsDto } from '../dto/create-movie.dto';
import { UpdateMovieCreditDto } from '../dto/update-movie.dto';
import { CreditsService } from '../../reference/credits/credits.service';
import { PersonsService } from '../../persons/services/persons.service';
import { MovieMapper } from '../mappers/movie.mapper';
import { CreditEntityFactory } from '../factories/credit-entity.factory';
import { MovieCreditsDto } from '../dto/movie-response.dto';

@Injectable()
export class MoviesCreditsService {
  constructor(
    @Inject(MOVIES_REPOSITORY)
    private readonly moviesRepository: IMoviesRepository,
    @Inject(MOVIE_CREDITS_REPOSITORY)
    private readonly movieCreditsRepository: IMovieCreditsRepository,
    private readonly creditsService: CreditsService,
    private readonly personsService: PersonsService,
    private readonly movieMapper: MovieMapper,
    private readonly creditEntityFactory: CreditEntityFactory,
  ) {}

  async getMovieCredits(movieId: string): Promise<MovieCreditsDto[]> {
    await this.checkMovieExists(movieId);

    const credits = await this.movieCreditsRepository.getMovieCredits(movieId);

    return this.movieMapper.toMovieCreditsDto(credits);
  }

  async addCredits(
    movieId: string,
    createCreditsDto: CreateCreditsDto[],
  ): Promise<void> {
    await this.checkMovieExists(movieId);

    const roleIds =
      this.creditEntityFactory.extractUniqueRoleIds(createCreditsDto);
    const personIds =
      this.creditEntityFactory.extractUniquePersonIds(createCreditsDto);

    await Promise.all([
      this.creditsService.validateExists(roleIds),
      this.personsService.validateExists(personIds),
    ]);

    const creditEntities = this.creditEntityFactory.createFromDto(
      createCreditsDto,
      movieId,
    );

    await this.movieCreditsRepository.addCredits(creditEntities);
  }

  async updateCredit(
    movieId: string,
    creditId: string,
    updateCreditDto: UpdateMovieCreditDto,
  ): Promise<void> {
    await this.checkMovieExists(movieId);

    const affected = await this.movieCreditsRepository.update(
      creditId,
      movieId,
      updateCreditDto,
    );

    if (affected === 0) {
      throw new NotFoundException('Credit does not exist for this movie.');
    }
  }

  async deleteCredit(movieId: string, creditId: string): Promise<void> {
    await this.checkMovieExists(movieId);

    const affected = await this.movieCreditsRepository.delete(
      creditId,
      movieId,
    );

    if (affected === 0) {
      throw new NotFoundException('Credit does not exist for this movie.');
    }
  }

  private async checkMovieExists(id: string): Promise<void> {
    const movieExists = await this.moviesRepository.existsBy({ id });

    if (!movieExists) {
      throw new NotFoundException('Movie does not exist.');
    }
  }
}
