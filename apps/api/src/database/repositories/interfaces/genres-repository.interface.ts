import { GenreEntity } from '../../entities/genre.entity';

export interface IGenresRepository {
  getAllGenres(): Promise<GenreEntity[]>;
  findGenresByIds(ids: string[]): Promise<GenreEntity[]>;
}
