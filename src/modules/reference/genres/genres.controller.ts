import { Controller, Get } from '@nestjs/common';
import { GenreEntity } from 'src/database/entities/genre.entity';
import { GenresService } from './genres.service';

@Controller('genres')
export class GenresController {
  constructor(private readonly genreService: GenresService) {}

  @Get()
  getAllGenres(): Promise<GenreEntity[]> {
    return this.genreService.getAllGenres();
  }
}
