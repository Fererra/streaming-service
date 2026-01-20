import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GenreEntity } from '../entities/genre.entity';
import { Repository } from 'typeorm';
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
}
