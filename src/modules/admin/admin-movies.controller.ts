import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AdminMoviesService } from './admin-movies.service';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { CreateMovieDto } from '../movies/dto/create-movie.dto';

@Controller('movies')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
export class AdminMoviesController {
  constructor(private readonly adminMoviesService: AdminMoviesService) {}

  @Post()
  async createMovie(@Body() createMovieDto: CreateMovieDto) {
    const movie = await this.adminMoviesService.create(createMovieDto);

    return {
      movieId: movie.id,
      message: `Movie ${movie.title} created successfully`,
    };
  }
}
