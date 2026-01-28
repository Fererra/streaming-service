import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GenreEntity } from '../entities/genre.entity';
import { In, Repository } from 'typeorm';
import { IGenresRepository } from './interfaces/genres-repository.interface';

@Injectable()
export class GenresRepository implements IGenresRepository {
  constructor(
    @InjectRepository(GenreEntity)
    private readonly repository: Repository<GenreEntity>,
  ) {}

  getAllGenres(): Promise<GenreEntity[]> {
    return this.repository.find({ order: { name: 'ASC' } });
  }

  findGenresByIds(ids: string[]): Promise<GenreEntity[]> {
    return this.repository.find({ select: ['id'], where: { id: In(ids) } });
  }
}
