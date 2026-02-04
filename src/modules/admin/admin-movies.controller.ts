import {
  Body,
  Controller,
  Delete,
  NotImplementedException,
  Param,
  ParseArrayPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import {
  CreateCreditsDto,
  CreateMovieDto,
} from '../movies/dto/create-movie.dto';
import { MoviesService } from '../movies/services/movies.service';
import { MoviesMediaService } from '../movies/services/movies-media.service';
import {
  UpdateMovieCountriesDto,
  UpdateMovieCreditDto,
  UpdateMovieDto,
  UpdateMovieGenresDto,
} from '../movies/dto/update-movie.dto';
import { CheckEmptyBodyPipe } from 'src/common/pipes/check-empty-body.pipe';
import { MoviesCreditsService } from '../movies/services/movies-credits.service';
import { AllowedImageContentTypesDto } from 'src/common/dto/image-content-types.dto';
import { ConfirmPosterDto } from '../movies/dto/confirm-poster.dto';

@Controller('movies')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
export class AdminMoviesController {
  constructor(
    private readonly moviesService: MoviesService,
    private readonly moviesMediaService: MoviesMediaService,
    private readonly movieCreditsService: MoviesCreditsService,
  ) {}

  @Post()
  async createMovie(@Body() createMovieDto: CreateMovieDto) {
    const movie = await this.moviesService.create(createMovieDto);

    return {
      movieId: movie.id,
      message: `Movie ${movie.title} created successfully`,
    };
  }

  @Patch(':id/poster/upload-intent')
  async updateMoviePoster(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() { contentType }: AllowedImageContentTypesDto,
  ) {
    return this.moviesMediaService.updatePoster(id, contentType);
  }

  @Post(':id/poster/confirm')
  async confirmPoster(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() { storageKey }: ConfirmPosterDto,
  ) {
    await this.moviesMediaService.confirmPoster(id, storageKey);

    return { message: 'Movie poster updated successfully' };
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

  @Post(':id/credits')
  async addMovieCredits(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(CheckEmptyBodyPipe, new ParseArrayPipe({ items: CreateCreditsDto }))
    createCreditsDto: CreateCreditsDto[],
  ) {
    await this.movieCreditsService.addCredits(id, createCreditsDto);

    return {
      message: 'Movie credits added successfully',
    };
  }

  @Patch(':id/credits/:creditId')
  async updateMovieCredits(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('creditId', ParseUUIDPipe) creditId: string,
    @Body(CheckEmptyBodyPipe) updateCreditDto: UpdateMovieCreditDto,
  ) {
    await this.movieCreditsService.updateCredit(id, creditId, updateCreditDto);

    return {
      message: 'Movie credit updated successfully',
    };
  }

  @Delete(':id')
  async deleteMovie(@Param('id', ParseUUIDPipe) id: string) {
    await this.moviesService.delete(id);

    return {
      message: 'Movie deleted successfully',
    };
  }

  @Delete(':id/credits/:creditId')
  async deleteMovieCredits(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('creditId', ParseUUIDPipe) creditId: string,
  ) {
    await this.movieCreditsService.deleteCredit(id, creditId);

    return {
      message: 'Movie credit deleted successfully',
    };
  }
}
