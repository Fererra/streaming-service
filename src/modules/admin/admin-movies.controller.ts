import {
  Body,
  Controller,
  NotImplementedException,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
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
import {
  UpdateMovieCountriesDto,
  UpdateMovieDto,
  UpdateMovieGenresDto,
} from '../movies/dto/update-movie.dto';
import { CheckEmptyBodyPipe } from 'src/common/pipes/check-empty-body.pipe';

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
  async updateMovie(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(CheckEmptyBodyPipe) updateMovieDto: UpdateMovieDto,
  ) {
    await this.moviesService.update(id, updateMovieDto);

    return {
      message: 'Movie updated successfully',
    };
  }

  @Put(':id/countries')
  async updateMovieCountries(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(CheckEmptyBodyPipe) updateMovieCountriesDto: UpdateMovieCountriesDto,
  ) {
    await this.moviesService.updateCountries(
      id,
      updateMovieCountriesDto.countryCodes,
    );

    return {
      message: 'Movie countries updated successfully',
    };
  }

  @Put(':id/genres')
  async updateMovieGenres(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(CheckEmptyBodyPipe) updateMovieGenresDto: UpdateMovieGenresDto,
  ) {
    await this.moviesService.updateGenres(id, updateMovieGenresDto.genreIds);

    return {
      message: 'Movie genres updated successfully',
    };
  }

  @Patch(':id/credits')
  async updateMovieCredits() {
    throw new NotImplementedException();
  }
}
