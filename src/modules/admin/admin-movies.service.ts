import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { GenresService } from '../reference/genres/genres.service';
import { CountryService } from '../reference/country/country.service';
import { CreateMovieDto } from '../movies/dto/create-movie.dto';
import { CreditsService } from '../reference/credits/credits.service';
import { PersonsService } from '../persons/persons.service';
import { MovieEntity } from 'src/database/entities/movie.entity';
import { MovieCreditEntity } from 'src/database/entities/movie-credit.entity';

@Injectable()
export class AdminMoviesService {
  constructor(
    private readonly genresService: GenresService,
    private readonly countryService: CountryService,
    private readonly creditsService: CreditsService,
    private readonly personsService: PersonsService,
    private readonly dataSource: DataSource,
  ) {}

  async create(createMovieDto: CreateMovieDto) {
    const { credits: credits = [], ...movieData } = createMovieDto;

    const isExist = await this.dataSource.getRepository(MovieEntity).existsBy({
      title: movieData.title,
      releaseYear: movieData.releaseYear,
    });

    if (isExist) {
      throw new ConflictException(
        `Movie "${movieData.title}" (${movieData.releaseYear}) already exists.`,
      );
    }

    await Promise.all([
      this.genresService.validateExists(createMovieDto.genreIds),
      this.countryService.validateExists(createMovieDto.countryCodes),
      this.creditsService.validateExists([
        ...new Set(credits.map((c) => c.roleId)),
      ]),
      this.personsService.validateExists([
        ...new Set(credits.map((c) => c.personId)),
      ]),
    ]);

    return this.dataSource.transaction(async (manager) => {
      const movie = await manager.save(MovieEntity, movieData);

      if (credits.length > 0) {
        const creditEntities = credits.map((c) =>
          manager.create(MovieCreditEntity, {
            ...c,
            movieId: movie.id,
          }),
        );
        await manager.save(MovieCreditEntity, creditEntities);
      }

      return movie;
    });
  }
}
