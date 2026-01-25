import {
  Body,
  Controller,
  Delete,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user-role.enum';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { PersonsService } from '../persons/persons.service';
import { CreatePersonDto } from '../persons/dto/create-person.dto';
import { UpdatePersonDto } from '../persons/dto/update-person.dto';
import { ApiImageFile } from 'src/common/decorators/image-upload.decorator';
import { CheckEmptyBodyPipe } from 'src/common/pipes/check-empty-body.pipe';

@Controller('persons')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
export class AdminPersonsController {
  constructor(private readonly personsService: PersonsService) {}

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

  @Patch(':id/photo')
  @ApiImageFile()
  async updatePersonPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(new ParseFilePipe({ fileIsRequired: true }))
    photo: Express.Multer.File,
  ) {
    await this.personsService.updatePhoto(id, {
      buffer: photo.buffer,
      contentType: photo.mimetype,
    });

    return {
      message: 'Person photo updated successfully',
    };
  }

  @Delete(':id')
  async deletePerson(@Param('id', ParseUUIDPipe) id: string) {
    await this.personsService.delete(id);

    return {
      message: 'Person deleted successfully',
    };
  }
}
