import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePersonDto } from './dto/create-person.dto';
import { PERSONS_REPOSITORY } from 'src/database/repositories/tokens/repository.tokens';
import type { IPersonsRepository } from 'src/database/repositories/interfaces/persons-repository.interface';
import { PersonEntity } from 'src/database/entities/person.entity';
import { UpdatePersonDto } from './dto/update-person.dto';
import {
  PaginationOptions,
  PaginationResponse,
} from 'src/common/@types/pagination.types';
import { buildPaginationResponse } from 'src/common/utils/pagination.util';
import { CountryEntity } from 'src/database/entities/country.entity';
import type {
  ImageStorage,
  InputOptions,
} from '../storage/image-storage.interface';
import { IMAGE_STORAGE } from '../storage/storage.token';
import { ImageStoragePath } from '../storage/storage-path.enum';
import { extension } from 'mime-types';

@Injectable()
export class PersonsService {
  constructor(
    @Inject(PERSONS_REPOSITORY)
    private readonly personsRepository: IPersonsRepository,
    @Inject(IMAGE_STORAGE)
    private readonly imageStorage: ImageStorage,
  ) {}

  async findAll(
    paginationOptions: PaginationOptions,
    search?: string,
  ): Promise<PaginationResponse<PersonEntity>> {
    const [persons, total] = await this.personsRepository.findAll(
      paginationOptions,
      search,
    );

    return buildPaginationResponse(persons, total, paginationOptions);
  }

  async validateExists(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) {
      return;
    }

    const foundPersons = await this.personsRepository.findByIds(ids);

    if (foundPersons.length !== ids.length) {
      const foundIds = foundPersons.map((person) => person.id);
      const missingIds = ids.filter((id) => !foundIds.includes(id));

      throw new BadRequestException(
        `Persons not found for IDs: ${missingIds.join(', ')}`,
      );
    }
  }

  create(createPersonDto: CreatePersonDto): Promise<PersonEntity> {
    const { country, dateOfBirth, ...personData } = createPersonDto;
    return this.personsRepository.create({
      ...personData,
      dateOfBirth: new Date(dateOfBirth),
      country: { code: country } as CountryEntity,
    });
  }

  async update(id: string, updatePersonDto: UpdatePersonDto): Promise<void> {
    const isPersonExists = await this.personsRepository.existsById(id);

    if (!isPersonExists) {
      throw new NotFoundException(`Person with id ${id} does not exist`);
    }

    const { country, dateOfBirth, ...otherUpdates } = updatePersonDto;
    const updateData: Partial<PersonEntity> = {};

    for (const [key, value] of Object.entries(otherUpdates)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    if (dateOfBirth) {
      updateData.dateOfBirth = new Date(dateOfBirth);
    }

    if (country) {
      updateData.country = { code: country } as CountryEntity;
    }

    await this.personsRepository.update(id, updateData);
  }

  async updatePhoto(id: string, photo: InputOptions): Promise<void> {
    const isPersonExists = await this.personsRepository.existsById(id);

    if (!isPersonExists) {
      throw new NotFoundException('Person not found');
    }

    const personPhoto = await this.personsRepository.findPhotoPathById(id);

    const { storageKey } = await this.imageStorage.upload(photo, {
      path: ImageStoragePath.PERSON_PHOTOS,
      extension: extension(photo.contentType) || 'bin',
      isPublic: true,
    });

    try {
      await this.personsRepository.update(id, { photoPath: storageKey });

      if (personPhoto) {
        await this.imageStorage.delete(personPhoto, true);
      }
    } catch (error) {
      await this.imageStorage.delete(storageKey, true);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const isPersonExists = await this.personsRepository.existsById(id);

    if (!isPersonExists) {
      throw new NotFoundException(`Person with id ${id} does not exist`);
    }

    await this.personsRepository.delete(id);
  }
}
