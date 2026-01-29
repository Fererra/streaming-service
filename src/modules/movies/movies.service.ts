import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GenresService } from '../reference/genres/genres.service';
import { CountryService } from '../reference/country/country.service';
import { CreateMovieDto } from '../movies/dto/create-movie.dto';
import { CreditsService } from '../reference/credits/credits.service';
import { PersonsService } from '../persons/persons.service';
import { MOVIES_REPOSITORY } from 'src/database/repositories/tokens/repository.tokens';
import type { IMoviesRepository } from 'src/database/repositories/interfaces/movies-repository.interface';
import { UpdateMovieDto } from './dto/update-movie.dto';

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

  async update(id: string, updateMovieDto: UpdateMovieDto) {
    await this.checkMovieExists(id);

    await this.moviesRepository.update(id, updateMovieDto);
  }

  async updateCountries(id: string, countryCodes: string[]) {
    await this.checkMovieExists(id);

    await this.countryService.validateExists(countryCodes);
    await this.moviesRepository.updateCountries(id, countryCodes);
  }

  async updateGenres(id: string, genreIds: string[]) {
    await this.checkMovieExists(id);

    await this.genresService.validateExists(genreIds);
    await this.moviesRepository.updateGenres(id, genreIds);
  }

  private async checkMovieExists(id: string) {
    const movieExists = await this.moviesRepository.existsBy({ id });

    if (!movieExists) {
      throw new NotFoundException(`Movie with id "${id}" does not exist.`);
    }
  }
}
