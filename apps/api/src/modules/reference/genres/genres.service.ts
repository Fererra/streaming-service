import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { GenreEntity } from '../../../database/entities/genre.entity';
import type { IGenresRepository } from '../../../database/repositories/interfaces/genres-repository.interface';
import { GENRES_REPOSITORY } from '../../../database/repositories/tokens/repository.tokens';

@Injectable()
export class GenresService {
  constructor(
    @Inject(GENRES_REPOSITORY)
    private readonly genresRepository: IGenresRepository,
  ) {}

  getAllGenres(): Promise<GenreEntity[]> {
    return this.genresRepository.getAllGenres();
  }

  async validateExists(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) {
      return;
    }

    const foundGenres = await this.genresRepository.findGenresByIds(ids);

    if (foundGenres.length !== ids.length) {
      const foundIds = foundGenres.map((genre) => genre.id);
      const missingIds = ids.filter((id) => !foundIds.includes(id));

      throw new BadRequestException(
        `Genres not found for IDs: ${missingIds.join(', ')}`,
      );
    }
  }
}
