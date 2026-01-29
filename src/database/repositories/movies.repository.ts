import { Injectable } from '@nestjs/common';
import { IMoviesRepository } from './interfaces/movies-repository.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { MovieEntity } from '../entities/movie.entity';
import { EntityManager, EntityTarget, Repository } from 'typeorm';
import { MovieCreditEntity } from '../entities/movie-credit.entity';

@Injectable()
export class MoviesRepository implements IMoviesRepository {
  constructor(
    @InjectRepository(MovieEntity)
    private readonly repository: Repository<MovieEntity>,
  ) {}

  existsBy(criteria: Partial<MovieEntity>): Promise<boolean> {
    const cleanedCriteria = Object.fromEntries(
      Object.entries(criteria).filter(
        ([, value]) => value !== null && value !== undefined,
      ),
    );

    return this.repository.existsBy(cleanedCriteria);
  }

  async findPosterPathById(id: string): Promise<string | null> {
    const movie = await this.repository.findOne({
      select: ['posterPath'],
      where: { id },
    });

    return movie?.posterPath ?? null;
  }

  save(
    movieData: Partial<MovieEntity>,
    credits: Partial<MovieCreditEntity>[],
  ): Promise<MovieEntity> {
    return this.repository.manager.transaction(async (manager) => {
      const movie = await manager.save(MovieEntity, movieData);

      if (credits.length > 0) {
        const creditEntities = credits.map((c) =>
          manager.create(MovieCreditEntity, {
            ...c,
            movieId: movie.id,
          }),
        );
        await manager.save(MovieCreditEntity, creditEntities);
      }

      return movie;
    });
  }

  async update(id: string, data: Partial<MovieEntity>): Promise<void> {
    await this.repository.update(id, data);
  }

  async updateCountries(id: string, countryCodes: string[]): Promise<void> {
    await this.repository.manager.transaction((manager) =>
      this.replaceManyToMany(
        manager,
        MovieEntity,
        'countries',
        id,
        countryCodes,
      ),
    );
  }

  async updateGenres(id: string, genreIds: string[]): Promise<void> {
    await this.repository.manager.transaction((manager) =>
      this.replaceManyToMany(manager, MovieEntity, 'genres', id, genreIds),
    );
  }

  private async replaceManyToMany(
    manager: EntityManager,
    entity: EntityTarget<any>,
    relationName: string,
    ownerId: string,
    targetIds: string[],
  ): Promise<void> {
    const relation = manager
      .createQueryBuilder()
      .relation(entity, relationName)
      .of(ownerId);

    const existing = await relation.loadMany();

    if (existing.length > 0) {
      await relation.remove(existing);
    }

    if (targetIds.length > 0) {
      await relation.add(targetIds);
    }
  }
}
