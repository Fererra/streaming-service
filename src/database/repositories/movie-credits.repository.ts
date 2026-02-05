import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MovieCreditEntity } from '../entities/movie-credit.entity';
import { Repository } from 'typeorm';
import type { IMovieCreditsRepository } from './interfaces/movie-credits-repository.interface';
import { UpdateMovieCreditDto } from 'src/modules/movies/dto/update-movie.dto';

@Injectable()
export class MovieCreditsRepository implements IMovieCreditsRepository {
  constructor(
    @InjectRepository(MovieCreditEntity)
    private readonly repository: Repository<MovieCreditEntity>,
  ) {}

  getMovieCredits(movieId: string): Promise<MovieCreditEntity[]> {
    return this.repository
      .createQueryBuilder('movieCredit')
      .leftJoinAndSelect('movieCredit.person', 'person')
      .leftJoinAndSelect('movieCredit.role', 'role')
      .select([
        'movieCredit.id',
        'person.id',
        'person.firstName',
        'person.lastName',
        'person.photoPath',
        'role.id',
        'role.code',
        'role.role',
        'movieCredit.characterName',
        'movieCredit.orderIndex',
      ])
      .where('movieCredit.movieId = :movieId', { movieId })
      .orderBy('movieCredit.orderIndex', 'ASC')
      .getMany();
  }

  async addCredits(credits: Partial<MovieCreditEntity>[]): Promise<void> {
    if (credits.length === 0) {
      return;
    }

    await this.repository.save(credits);
  }

  async update(
    creditId: string,
    movieId: string,
    data: UpdateMovieCreditDto,
  ): Promise<number> {
    const result = await this.repository.update(
      { id: creditId, movieId },
      data,
    );

    return result.affected ?? 0;
  }

  async delete(creditId: string, movieId: string): Promise<number> {
    const result = await this.repository.delete({ id: creditId, movieId });
    return result.affected ?? 0;
  }
}
