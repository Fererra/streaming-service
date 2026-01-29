import {
  Body,
  Controller,
  NotImplementedException,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { CreateMovieDto } from '../movies/dto/create-movie.dto';
import { MoviesService } from '../movies/movies.service';
import { ApiImageFile } from 'src/common/decorators/image-upload.decorator';
import { MoviesMediaService } from '../movies/movies-media.service';

@Controller('movies')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
export class AdminMoviesController {
  constructor(
    private readonly moviesService: MoviesService,
    private readonly moviesMediaService: MoviesMediaService,
  ) {}

  @Post()
  async createMovie(@Body() createMovieDto: CreateMovieDto) {
    const movie = await this.moviesService.create(createMovieDto);

    return {
      movieId: movie.id,
      message: `Movie ${movie.title} created successfully`,
    };
  }

  @Patch(':id/poster')
  @ApiImageFile('poster')
  async updateMoviePoster(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(new ParseFilePipe({ fileIsRequired: true }))
    poster: Express.Multer.File,
  ) {
    await this.moviesMediaService.updatePoster(id, {
      buffer: poster.buffer,
      contentType: poster.mimetype,
    });

    return {
      message: 'Movie poster updated successfully',
    };
  }

  @Patch(':id/trailer')
  async updateMovieTrailer() {
    throw new NotImplementedException();
  }

  @Patch(':id/video')
  async updateMovieVideo() {
    throw new NotImplementedException();
  }

  @Patch(':id')
  async updateMovie() {
    throw new NotImplementedException();
  }

  @Patch(':id/countries')
  async updateMovieCountries() {
    throw new NotImplementedException();
  }

  @Patch(':id/genres')
  async updateMovieGenres() {
    throw new NotImplementedException();
  }

  @Patch(':id/credits')
  async updateMovieCredits() {
    throw new NotImplementedException();
  }
}
