import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MoviesService } from './services/movies.service';
import { MovieSearchQueryDto } from './dto/movie-search-query.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { MoviesCreditsService } from './services/movies-credits.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { ActiveSubscriptionGuard } from '../auth/guards/active-subscription.guard';

@Controller('movies')
export class MoviesController {
  constructor(
    private readonly moviesService: MoviesService,
    private readonly movieCreditsService: MoviesCreditsService,
  ) {}

  @Get()
  getAllMovies(@Query() query: PaginationQueryDto) {
    return this.moviesService.findAll(query);
  }

  @Get('search')
  searchMovies(@Query() query: MovieSearchQueryDto) {
    const { title, ...paginationOptions } = query;
    return this.moviesService.searchMovies(title, paginationOptions);
  }

  @Get(':id')
  getMovieById(@Param('id', ParseUUIDPipe) id: string) {
    return this.moviesService.getMovieById(id);
  }

  @UseGuards(JwtGuard, ActiveSubscriptionGuard)
  @Get(':id/video')
  getMovieVideo(@Param('id', ParseUUIDPipe) id: string) {
    return this.moviesService.getMovieVideo(id);
  }

  @Get(':id/credits')
  getMovieCredits(@Param('id', ParseUUIDPipe) id: string) {
    return this.movieCreditsService.getMovieCredits(id);
  }
}
