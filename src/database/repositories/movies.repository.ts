import { Injectable, NotFoundException } from '@nestjs/common';
import { IMoviesRepository } from './interfaces/movies-repository.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { MovieEntity } from '../entities/movie.entity';
import { EntityManager, EntityTarget, ILike, Repository } from 'typeorm';
import { MovieCreditEntity } from '../entities/movie-credit.entity';
import { PaginationOptions } from 'src/common/@types/pagination.types';

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

  findExistingMovieById(id: string): Promise<MovieEntity | null> {
    return this.repository.findOne({
      select: ['title', 'releaseYear'],
      where: { id },
    });
  }

  findAll(options: PaginationOptions): Promise<[MovieEntity[], number]> {
    const skip = (options.page - 1) * options.limit;
    const take = options.limit;

    return this.repository.findAndCount({
      select: ['id', 'title', 'releaseYear', 'rating', 'posterPath'],
      skip,
      take,
    });
  }

  searchMovies(
    title: string,
    paginationOptions: PaginationOptions,
  ): Promise<[MovieEntity[], number]> {
    const skip = (paginationOptions.page - 1) * paginationOptions.limit;
    const take = paginationOptions.limit;

    return this.repository.findAndCount({
      select: ['id', 'title', 'releaseYear', 'rating', 'posterPath'],
      where: { title: ILike(`%${title}%`) },
      skip,
      take,
    });
  }

  findById(id: string): Promise<MovieEntity | null> {
    return this.repository
      .createQueryBuilder('movies')
      .leftJoinAndSelect('movies.genres', 'genre')
      .leftJoinAndSelect('movies.countries', 'country')
      .leftJoinAndSelect('movies.credits', 'credit')
      .leftJoinAndSelect('credit.person', 'person')
      .leftJoinAndSelect('credit.role', 'role')
      .where('movies.id = :id', { id })
      .select([
        'movies',
        'genre.id',
        'genre.name',
        'country.code',
        'country.countryName',
        'person.id',
        'person.firstName',
        'person.lastName',
        'person.photoPath',
        'credit.id',
        'role.id',
        'role.code',
        'role.role',
        'credit.characterName',
        'credit.orderIndex',
      ])
      .getOne();
  }

  save(
    movieData: Partial<MovieEntity>,
    credits: Partial<MovieCreditEntity>[],
    genreIds: string[],
    countryCodes: string[],
  ): Promise<MovieEntity> {
    return this.repository.manager.transaction(async (manager) => {
      const movie = await manager.save(MovieEntity, movieData);

      if (credits.length > 0) {
        const creditEntities = credits.map((credit) => ({
          ...credit,
          movieId: movie.id,
        }));
        await manager.save(MovieCreditEntity, creditEntities);
      }

      if (genreIds && genreIds.length > 0) {
        const relation = manager
          .createQueryBuilder()
          .relation(MovieEntity, 'genres')
          .of(movie.id);
        await relation.add(genreIds);
      }

      if (countryCodes && countryCodes.length > 0) {
        const relation = manager
          .createQueryBuilder()
          .relation(MovieEntity, 'countries')
          .of(movie.id);
        await relation.add(countryCodes);
      }

      return movie;
    });
  }

  async update(id: string, data: Partial<MovieEntity>): Promise<void> {
    await this.repository.update(id, data);
  }

  async swapPosterPath(
    movieId: string,
    newPosterPath: string,
  ): Promise<string | null> {
    return this.repository.manager.transaction(async (manager) => {
      const movie = await manager.findOne(MovieEntity, {
        select: ['id', 'posterPath'],
        where: { id: movieId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!movie) {
        throw new NotFoundException('Movie not found');
      }

      const oldPosterPath = movie.posterPath;

      await manager.update(
        MovieEntity,
        { id: movieId },
        { posterPath: newPosterPath },
      );

      return oldPosterPath;
    });
  }

  swapTrailerPath(
    movieId: string,
    newTrailerPath: string,
  ): Promise<string | null> {
    return this.repository.manager.transaction(async (manager) => {
      const movie = await manager.findOne(MovieEntity, {
        select: ['id', 'trailerPath'],
        where: { id: movieId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!movie) {
        throw new NotFoundException('Movie not found');
      }

      const oldTrailerPath = movie.trailerPath;

      await manager.update(
        MovieEntity,
        { id: movieId },
        { trailerPath: newTrailerPath },
      );

      return oldTrailerPath;
    });
  }

  swapVideoPath(movieId: string, newVideoPath: string): Promise<string | null> {
    return this.repository.manager.transaction(async (manager) => {
      const movie = await manager.findOne(MovieEntity, {
        select: ['id', 'moviePath'],
        where: { id: movieId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!movie) {
        throw new NotFoundException('Movie not found');
      }

      const oldMoviePath = movie.moviePath;

      await manager.update(
        MovieEntity,
        { id: movieId },
        { moviePath: newVideoPath },
      );

      return oldMoviePath;
    });
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
  async delete(id: string): Promise<number> {
    const result = await this.repository.softDelete(id);
    return result.affected ?? 0;
  }
}
