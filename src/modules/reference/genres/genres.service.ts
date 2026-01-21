import { Inject, Injectable } from '@nestjs/common';
import { GenreEntity } from 'src/database/entities/genre.entity';
import type { IGenresRepository } from 'src/database/repositories/interfaces/genres-repository.interface';
import { GENRES_REPOSITORY } from 'src/database/repositories/tokens/repository.tokens';

@Injectable()
export class GenresService {
  constructor(
    @Inject(GENRES_REPOSITORY)
    private readonly genresRepository: IGenresRepository,
  ) {}

  getAllGenres(): Promise<GenreEntity[]> {
    return this.genresRepository.getAllGenres();
  }
}
