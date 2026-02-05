import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { PersonsService } from '../persons/services/persons.service';
import { CreatePersonDto } from '../persons/dto/create-person.dto';
import { UpdatePersonDto } from '../persons/dto/update-person.dto';
import { CheckEmptyBodyPipe } from 'src/common/pipes/check-empty-body.pipe';
import { PersonsMediaService } from '../persons/services/persons-media.service';
import { AllowedImageContentTypesDto } from 'src/common/dto/image-content-types.dto';
import { ConfirmPhotoDto } from '../persons/dto/confirm-photo.dto';

@Controller('persons')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
export class AdminPersonsController {
  constructor(
    private readonly personsService: PersonsService,
    private readonly personsMediaService: PersonsMediaService,
  ) {}

  @Post()
  async createPerson(@Body() createPersonDto: CreatePersonDto) {
    const person = await this.personsService.create(createPersonDto);

    return {
      personId: person.id,
      message: `Person ${person.firstName} ${person.lastName} created successfully`,
    };
  }

  @Patch(':id')
  async updatePerson(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(CheckEmptyBodyPipe) updatePersonDto: UpdatePersonDto,
  ) {
    await this.personsService.update(id, updatePersonDto);

    return {
      message: 'Person updated successfully',
    };
  }

  @Patch(':id/photo/upload-intent')
  async updatePersonPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() { contentType }: AllowedImageContentTypesDto,
  ) {
    return this.personsMediaService.updatePhoto(id, contentType);
  }

  @Post(':id/photo/confirm')
  async confirmPhoto(
    @Param('id', ParseUUIDPipe) personId: string,
    @Body() { storageKey }: ConfirmPhotoDto,
  ) {
    await this.personsMediaService.confirmPhoto(personId, storageKey);

    return { message: 'Photo updated successfully' };
  }

  @Delete(':id')
  async deletePerson(@Param('id', ParseUUIDPipe) id: string) {
    await this.personsService.delete(id);

    return {
      message: 'Person deleted successfully',
    };
  }
}
