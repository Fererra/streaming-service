import { Inject, NotFoundException } from '@nestjs/common';
import type { IMoviesRepository } from 'src/database/repositories/interfaces/movies-repository.interface';
import { MOVIES_REPOSITORY } from 'src/database/repositories/tokens/repository.tokens';
import { IMAGE_STORAGE } from '../../storage/storage.token';
import type {
  ImageStorage,
  InputOptions,
} from '../../storage/image-storage.interface';
import { ImageStoragePath } from '../../storage/storage-path.enum';
import { extension } from 'mime-types';

export class MoviesMediaService {
  constructor(
    @Inject(MOVIES_REPOSITORY)
    private readonly moviesRepository: IMoviesRepository,
    @Inject(IMAGE_STORAGE)
    private readonly imageStorage: ImageStorage,
  ) {}

  async updatePoster(id: string, poster: InputOptions) {
    const movie = await this.moviesRepository.existsBy({ id });

    if (!movie) {
      throw new NotFoundException(`Movie with ID ${id} not found`);
    }

    const moviePoster = await this.moviesRepository.findPosterPathById(id);

    const { storageKey } = await this.imageStorage.upload(poster, {
      path: ImageStoragePath.MOVIE_POSTERS,
      extension: extension(poster.contentType) || 'bin',
      isPublic: true,
    });

    try {
      await this.moviesRepository.update(id, { posterPath: storageKey });

      if (moviePoster) {
        await this.imageStorage.delete(moviePoster, true);
      }
    } catch (error) {
      await this.imageStorage.delete(storageKey, true);
      throw error;
    }
  }
}
