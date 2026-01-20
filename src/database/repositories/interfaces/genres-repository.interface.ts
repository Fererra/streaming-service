import { GenreEntity } from 'src/database/entities/genre.entity';

export interface IGenresRepository {
  getAllGenres(): Promise<GenreEntity[]>;
}
