import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { GenresService } from '../reference/genres/genres.service';
import { CountryService } from '../reference/country/country.service';
import { CreateMovieDto } from '../movies/dto/create-movie.dto';
import { CreditsService } from '../reference/credits/credits.service';
import { PersonsService } from '../persons/persons.service';
import { MOVIES_REPOSITORY } from 'src/database/repositories/tokens/repository.tokens';
import type { IMoviesRepository } from 'src/database/repositories/interfaces/movies-repository.interface';

@Injectable()
export class MoviesService {
  constructor(
    @Inject(MOVIES_REPOSITORY)
    private readonly moviesRepository: IMoviesRepository,
    private readonly genresService: GenresService,
    private readonly countryService: CountryService,
    private readonly creditsService: CreditsService,
    private readonly personsService: PersonsService,
  ) {}

  async create(createMovieDto: CreateMovieDto) {
    const { credits = [], ...movieData } = createMovieDto;

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
      this.genresService.validateExists(movieData.genreIds),
      this.countryService.validateExists(movieData.countryCodes),
      this.creditsService.validateExists([
        ...new Set(credits.map((c) => c.roleId)),
      ]),
      this.personsService.validateExists([
        ...new Set(credits.map((c) => c.personId)),
      ]),
    ]);

    return this.moviesRepository.save(movieData, credits);
  }
}
